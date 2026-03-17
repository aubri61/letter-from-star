import "server-only";
import { serverSupabase } from "./supabase/server";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function requireUser(request?: Request) {
  if (request && !["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
      throw new ApiError("요청 출처를 확인할 수 없어요.", 403);
  }
  const db = await serverSupabase();
  if (!db) throw new ApiError("우체국 연결 설정이 필요해요.", 503);
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new ApiError("로그인이 필요해요.", 401);
  return { db, user };
}
export function apiFailure(error: unknown) {
  const known = error instanceof ApiError;
  return Response.json(
    {
      error: known
        ? error.message
        : "잠시 연결이 어려워요. 다시 시도해 주세요.",
    },
    {
      status: known ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export async function boundedBody(
  request: Request,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw new ApiError("요청 용량이 너무 커요.", 413);
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ApiError("요청 용량이 너무 커요.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function jsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length") || 0) > 20000)
    throw new ApiError("요청이 너무 커요.");
  const text = new TextDecoder().decode(await boundedBody(request, 20000));
  if (text.length > 20000) throw new ApiError("요청이 너무 커요.");
  try {
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new ApiError("요청 형식을 확인해 주세요.");
  }
}
export const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
