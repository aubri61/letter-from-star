import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createInstantReply,
  InstantReplyError,
  type InstantReplyStore,
} from "../src/lib/instant-reply";
const context = {
  name: "별이",
  personality: "발랄",
  favorites: "햇살",
  memories: "창가의 오후",
  recent: [],
  date: "2025-01-15",
  replyTo: { title: "안녕", content: "오늘도 생각났어" },
};
const letter = {
  title: "반가워",
  content: "함께했던 오후가 반짝반짝 떠올라. ".repeat(10),
};
function store(overrides: Partial<InstantReplyStore> = {}): InstantReplyStore {
  return {
    claim: async () => ({ status: "claimed", lease_token: "lease" }),
    context: async () => context,
    finish: async () => "reply-id",
    fail: async () => {},
    ...overrides,
  };
}
test("an already delivered reply never calls Groq again", async () => {
  const result = await createInstantReply(
    store({
      claim: async () => ({ status: "completed", reply_id: "existing" }),
    }),
    "key",
    "model",
    async () => {
      throw new Error("must not call");
    },
  );
  assert.deepEqual(result, { id: "existing", reused: true });
});
test("processing, request limits and missing ownership never call Groq", async () => {
  for (const [status, code] of [
    ["processing", 409],
    ["limited", 429],
    ["missing", 404],
  ] as const) {
    await assert.rejects(
      createInstantReply(
        store({ claim: async () => ({ status }) }),
        "key",
        "model",
        async () => {
          throw new Error("must not call");
        },
      ),
      (e) => e instanceof InstantReplyError && e.status === code,
    );
  }
});
test("a successful reply saves only through its current lease", async () => {
  const result = await createInstantReply(
    store({
      finish: async (lease, value) => {
        assert.equal(lease, "lease");
        assert.deepEqual(value, letter);
        return "new-id";
      },
    }),
    "key",
    "model",
    async (value) => {
      assert.deepEqual(value.replyTo, context.replyTo);
      return letter;
    },
  );
  assert.deepEqual(result, { id: "new-id", reused: false });
});
test("Groq failures release a request without exposing provider details", async () => {
  let released = false;
  await assert.rejects(
    createInstantReply(
      store({
        fail: async (lease) => {
          assert.equal(lease, "lease");
          released = true;
        },
      }),
      "secret-key",
      "model",
      async () => {
        throw new Error("secret-key private letter provider text");
      },
    ),
    (e) =>
      e instanceof InstantReplyError &&
      !e.message.includes("secret-key") &&
      !e.message.includes("private letter"),
  );
  assert.equal(released, true);
});
test("stale completion does not report that a reply was saved", async () => {
  await assert.rejects(
    createInstantReply(
      store({ finish: async () => null }),
      "key",
      "model",
      async () => letter,
    ),
    (e) => e instanceof InstantReplyError && e.status === 409,
  );
});
