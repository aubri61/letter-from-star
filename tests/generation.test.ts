import { test } from "node:test";
import assert from "node:assert/strict";
import {
  boundContext,
  validateGenerated,
  generateLetter,
  type MemoryContext,
} from "../supabase/functions/_shared/generation";
import {
  processBatch,
  type JobStore,
} from "../supabase/functions/_shared/worker";
const context: MemoryContext = {
  name: "별이",
  personality: "다정해".repeat(1000),
  favorites: "햇살".repeat(1000),
  memories: "함께한 오후".repeat(1000),
  date: "2025-01-15",
  recent: Array.from({ length: 10 }, () => ({
    direction: "TO_CAT",
    content: "안녕".repeat(2000),
  })),
};
const letter = {
  title: "따뜻한 하루",
  content: "네가 남겨 준 기억을 소중히 간직하며 오늘도 포근한 햇살을 떠올려. "
    .repeat(5)
    .trim(),
};
test("AI context has bounded byte budget and no photo payload", () => {
  const prompt = boundContext(context);
  assert.ok(new TextEncoder().encode(prompt).length <= 6000);
  assert.ok(!prompt.includes("storage_path"));
  assert.equal(JSON.parse(prompt).name, "별이");
});
test("AI output validates structure, Korean and length", () => {
  assert.deepEqual(validateGenerated(letter), letter);
  for (const bad of [
    null,
    {},
    { title: "hello", content: "x".repeat(200) },
    { title: "안녕", content: "짧음" },
    { ...letter, content: "가".repeat(1501) },
  ])
    assert.throws(() => validateGenerated(bad));
});
test("OpenAI failure and truncation never return generated letter", async () => {
  await assert.rejects(
    generateLetter(
      context,
      "fake-test-key",
      "test",
      async () => new Response("", { status: 429 }),
    ),
    /openai_http_429/,
  );
  await assert.rejects(
    generateLetter(context, "fake-test-key", "test", async () =>
      Response.json({
        choices: [
          {
            finish_reason: "length",
            message: { content: JSON.stringify(letter) },
          },
        ],
      }),
    ),
    /incomplete_output/,
  );
});
test("worker records AI failure, keeps secrets and personal data out of error codes", async () => {
  const codes: string[] = [];
  const job = {
    id: "job",
    cat_id: "cat",
    delivery_date: "2025-01-15",
    lease_token: "lease",
  };
  const store: JobStore = {
    claim: async () => [job],
    context: async () => context,
    finish: async () => {
      throw new Error("must not save");
    },
    fail: async (_job, code) => {
      codes.push(code);
    },
  };
  const result = await processBatch(
    store,
    "fake-test-key",
    "test",
    async () => {
      throw new Error("secret personal content");
    },
  );
  assert.equal(result.failed, 1);
  assert.deepEqual(codes, ["generation_failed"]);
});
test("worker only counts completed fenced writes", async () => {
  const job = {
    id: "job",
    cat_id: "cat",
    delivery_date: "2025-01-15",
    lease_token: "old",
  };
  const store: JobStore = {
    claim: async () => [job],
    context: async () => context,
    finish: async () => false,
    fail: async () => {},
  };
  const result = await processBatch(
    store,
    "fake-test-key",
    "test",
    async () => letter,
  );
  assert.equal(result.completed, 0);
});
