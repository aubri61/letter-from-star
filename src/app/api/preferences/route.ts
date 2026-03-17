import { requireUser, apiFailure, jsonBody, ApiError } from "@/lib/api";
export async function PATCH(request: Request) {
  try {
    const { db } = await requireUser(request);
    const b = await jsonBody(request);
    if (typeof b.enabled !== "boolean")
      throw new ApiError("수신 설정을 확인해 주세요.");
    const { error } = await db.rpc("set_daily_letters", {
      p_enabled: b.enabled,
    });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return apiFailure(e);
  }
}
