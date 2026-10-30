import { requireUser, apiFailure, jsonBody, ApiError, uuid } from "@/lib/api";
import { validateLetter } from "@/lib/domain";
export async function POST(request: Request) {
  try {
    const { db } = await requireUser(request);
    const b = await jsonBody(request);
    if (
      !uuid(b.requestId) ||
      typeof b.title !== "string" ||
      typeof b.content !== "string"
    )
      throw new ApiError("편지 형식을 확인해 주세요.");
    const invalid = validateLetter(b.title, b.content);
    if (invalid) throw new ApiError(invalid);
    const { data, error } = await db.rpc("send_letter", {
      p_request_id: b.requestId,
      p_title: b.title.trim(),
      p_content: b.content.trim(),
    });
    if (error) throw error;
    return Response.json({ id: data });
  } catch (e) {
    return apiFailure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const { db } = await requireUser(request);
    const b = await jsonBody(request);
    if (!uuid(b.id)) throw new ApiError("편지 주소를 확인해 주세요.");
    const { error } = await db.rpc("mark_letter_read", { p_id: b.id });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return apiFailure(e);
  }
}
export async function GET(request: Request) {
  try {
    const { db, user } = await requireUser();
    const params = new URL(request.url).searchParams;
    const id = params.get("id");
    if (id) {
      if (!uuid(id)) throw new ApiError("편지 주소를 확인해 주세요.");
      const { data, error } = await db
        .from("letters")
        .select("*")
        .eq("user_id", user.id)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new ApiError("편지를 찾지 못했어요.", 404);
      return Response.json(
        { letters: [data], hasMore: false },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    const offset = Number(params.get("offset") || 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      throw new ApiError("편지 목록을 확인해 주세요.");
    const { data, error } = await db
      .from("letters")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 49);
    if (error) throw error;
    return Response.json(
      { letters: data, hasMore: data.length === 50 },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiFailure(e);
  }
}
