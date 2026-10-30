import {
  generateLetter,
  type MemoryContext,
  type GeneratedLetter,
} from "./generation.ts";
export type Job = {
  id: string;
  cat_id: string;
  delivery_date: string;
  lease_token: string;
};
export type JobStore = {
  claim: () => Promise<Job[]>;
  context: (job: Job) => Promise<MemoryContext>;
  finish: (job: Job, letter: GeneratedLetter) => Promise<boolean>;
  fail: (job: Job, code: string) => Promise<void>;
};
export async function processBatch(
  store: JobStore,
  key: string,
  model: string,
  generator: typeof generateLetter = generateLetter,
) {
  const jobs = await store.claim();
  let completed = 0,
    failed = 0;
  for (const job of jobs) {
    try {
      const context = await store.context(job);
      const letter = await generator(context, key, model);
      if (await store.finish(job, letter)) completed++;
    } catch (error) {
      const code =
        error instanceof Error &&
        /^(groq_http_\d{3}|invalid_output|incomplete_output|invalid_json)$/.test(
          error.message,
        )
          ? error.message
          : "generation_failed";
      await store.fail(job, code);
      failed++;
    }
  }
  return { claimed: jobs.length, completed, failed };
}
