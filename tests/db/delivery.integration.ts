import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
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
test("concurrent cron claims one job, fences stale worker, delivers exactly once", async () => {
  assert.equal(
    await sql(
      "set role service_role;select count(*) from public.claim_letter_jobs(3,'2025-01-14T23:59:59Z')",
    ),
    "0",
  );
  const claim =
    "set role service_role; select row_to_json(j) from public.claim_letter_jobs(3,'2025-01-15T00:01:00Z') j;";
  const results = await Promise.all([sql(claim), sql(claim)]);
  const jobs = results.filter(Boolean).map((r) => JSON.parse(r));
  assert.equal(jobs.length, 1);
  const first = jobs[0];
  await sql(
    `update public.letter_jobs set started_at='2025-01-14T23:50:00Z' where id='${first.id}'`,
  );
  const reclaimed = JSON.parse(await sql(claim));
  assert.notEqual(reclaimed.lease_token, first.lease_token);
  assert.equal(
    await sql(
      `set role service_role;select public.finish_letter_job('${first.id}','${first.lease_token}','늦은 편지','이 작업은 저장되면 안 돼요')`,
    ),
    "f",
  );
  const finish = `set role service_role;select public.finish_letter_job('${reclaimed.id}','${reclaimed.lease_token}','오늘의 햇살','추억을 담은 편지입니다.')`;
  await Promise.all([sql(finish), sql(finish)]);
  assert.equal(
    await sql("select count(*) from public.letters where direction='FROM_CAT'"),
    "1",
  );
  assert.equal(await sql(claim), "");
});
test("first send does not re-enable opted-out user on subsequent sends", async () => {
  await sql(
    "set role authenticated;select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false); select public.set_daily_letters(false);select public.send_letter('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','또 안녕','오늘의 이야기')",
  );
  assert.equal(
    await sql("select daily_letters_enabled from public.user_preferences"),
    "f",
  );
});
test("expired third attempt closes as failed and cannot retry forever", async () => {
  await sql(
    "update public.letter_jobs set status='processing',attempt_count=3,started_at='2025-01-14T23:00:00Z'",
  );
  await sql(
    "set role service_role;select count(*) from public.claim_letter_jobs(3,'2025-01-15T00:01:00Z')",
  );
  assert.equal(await sql("select status from public.letter_jobs"), "failed");
  assert.equal(
    await sql("select last_error from public.letter_jobs"),
    "lease_expired",
  );
});
