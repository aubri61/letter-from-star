import {
  generateLetter,
  type GeneratedLetter,
  type MemoryContext,
} from "../../supabase/functions/_shared/generation";

export class InstantReplyError extends Error {
  constructor(
    message: string,
    public status = 503,
  ) {
    super(message);
  }
}

type Claim =
  | { status: "completed"; reply_id: string }
  | { status: "claimed"; lease_token: string }
  | { status: "processing" | "limited" | "missing" };

export type InstantReplyStore = {
  claim: () => Promise<Claim>;
  context: () => Promise<MemoryContext>;
  finish: (lease: string, letter: GeneratedLetter) => Promise<string | null>;
  fail: (lease: string) => Promise<void>;
};

export async function createInstantReply(
  store: InstantReplyStore,
  key: string,
  model: string,
  generator: typeof generateLetter = generateLetter,
) {
  const claim = await store.claim();
  if (claim.status === "completed") return { id: claim.reply_id, reused: true };
  if (claim.status === "missing")
    throw new InstantReplyError("답장받을 편지를 찾지 못했어요.", 404);
  if (claim.status === "processing")
    throw new InstantReplyError(
      "이미 답장을 쓰고 있어요. 잠시 후 다시 확인해 주세요.",
      409,
    );
  if (claim.status === "limited")
    throw new InstantReplyError(
      "바로 답장 요청이 잠시 제한됐어요. 잠시 후 다시 시도해 주세요.",
      429,
    );
  if (claim.status !== "claimed")
    throw new InstantReplyError("답장을 준비하지 못했어요.");
  try {
    const letter = await generator(await store.context(), key, model);
    const id = await store.finish(claim.lease_token, letter);
    if (!id)
      throw new InstantReplyError(
        "답장 요청이 만료됐어요. 다시 시도해 주세요.",
        409,
      );
    return { id, reused: false };
  } catch (error) {
    await store.fail(claim.lease_token).catch(() => {});
    if (error instanceof InstantReplyError) throw error;
    if (error instanceof Error && error.message === "groq_http_429")
      throw new InstantReplyError(
        "Groq 요청이 많아요. 잠시 후 다시 시도해 주세요.",
        429,
      );
    if (error instanceof Error && /^groq_http_40[13]$/.test(error.message))
      throw new InstantReplyError("Groq API 키와 이용 권한을 확인해 주세요.");
    throw new InstantReplyError(
      "답장을 완성하지 못했어요. 잠시 후 다시 시도해 주세요.",
    );
  }
}
