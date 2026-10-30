import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
const user = "11111111-1111-4111-8111-111111111111";
async function sql(query: string) {
  const { stdout } = await exec("psql", [
    "-X",
    "-q",
    "-A",
    "-t",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    query,
  ]);
  return stdout.trim();
}
const claim = (id: string, owner = user) =>
  `set role service_role; select public.claim_instant_reply('${owner}','${id}');`;
const finish = (id: string, lease: string) =>
  `set role service_role; select public.finish_instant_reply('${user}','${id}','${lease}','답장이 왔어','${"오늘 네 편지를 읽으니 함께한 창가의 오후가 생각났어. ".repeat(5)}');`;
test("browser roles cannot forge generated replies or inspect request leases", async () => {
  for (const role of ["anon", "authenticated"]) {
    await assert.rejects(
      sql(
        `set role ${role}; select public.claim_instant_reply('${user}','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')`,
      ),
      /permission denied/,
    );
    await assert.rejects(
      sql(`set role ${role}; select * from private.instant_reply_requests`),
      /permission denied/,
    );
  }
});
test("concurrent instant requests create one reply without consuming the daily slot", async () => {
  const id = await sql(
    "select id from public.letters where direction='TO_CAT' order by created_at,id limit 1",
  );
  assert.equal(
    JSON.parse(await sql(claim(id, "22222222-2222-4222-8222-222222222222")))
      .status,
    "missing",
  );
  const results = (await Promise.all([sql(claim(id)), sql(claim(id))])).map(
    (r) => JSON.parse(r),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [
    "claimed",
    "processing",
  ]);
  const lease = results.find((r) => r.status === "claimed").lease_token;
  const saved = await sql(finish(id, lease));
  assert.ok(saved);
  assert.equal(await sql(finish(id, lease)), "");
  assert.equal(JSON.parse(await sql(claim(id))).reply_id, saved);
  assert.equal(
    await sql(
      "select count(*) from public.letters where direction='FROM_CAT' and delivery_date is not null",
    ),
    "1",
  );
  assert.equal(
    await sql(
      `select count(*) from public.letters where reply_to_letter_id='${id}' and delivery_date is null`,
    ),
    "1",
  );
  assert.equal(
    await sql("select daily_letters_enabled from public.user_preferences"),
    "f",
  );
});
test("retry leases fence stale instant workers and only the current reply is saved", async () => {
  const id = await sql(
    "select id from public.letters where direction='TO_CAT' and id not in(select source_letter_id from private.instant_reply_requests) limit 1",
  );
  const first = JSON.parse(await sql(claim(id)));
  await sql(
    `set role service_role; select public.finish_instant_reply('${user}','${id}','${first.lease_token}',null,null)`,
  );
  assert.equal(JSON.parse(await sql(claim(id))).status, "limited");
  await sql(
    `update private.instant_reply_requests set started_at=now()-interval '31 seconds' where source_letter_id='${id}'`,
  );
  const retry = JSON.parse(await sql(claim(id)));
  assert.equal(retry.status, "claimed");
  assert.notEqual(retry.lease_token, first.lease_token);
  assert.equal(await sql(finish(id, first.lease_token)), "");
  assert.ok(await sql(finish(id, retry.lease_token)));
});
test("daily instant generation attempts are bounded across different sent letters", async () => {
  for (let i = 1; i <= 3; i++) {
    const id = await sql(
      `set role authenticated; select set_config('request.jwt.claim.sub','${user}',false); select public.send_letter('cccccccc-cccc-4ccc-8ccc-ccccccccccc${i}','안녕','오늘의 편지')`,
    );
    const source = id.split("\n").at(-1)!;
    const request = JSON.parse(await sql(claim(source)));
    if (i < 3) {
      assert.equal(request.status, "claimed");
      assert.ok(await sql(finish(source, request.lease_token)));
    } else assert.equal(request.status, "limited");
  }
});
