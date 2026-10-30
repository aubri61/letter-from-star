import { createClient } from "@supabase/supabase-js";
import { ApiError, apiFailure, jsonBody, requireUser, uuid } from "@/lib/api";
import {
  createInstantReply,
  InstantReplyError,
  type InstantReplyStore,
} from "@/lib/instant-reply";
import { DEFAULT_GROQ_MODEL } from "../../../../../supabase/functions/_shared/generation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { db, user } = await requireUser(request);
    if (
      process.env.ENABLE_INSTANT_REPLY !== "true" &&
      !(
        process.env.NODE_ENV === "development" &&
        process.env.ENABLE_INSTANT_REPLY !== "false"
      )
    )
      throw new ApiError("바로 답장 기능이 꺼져 있어요.", 404);
    const body = await jsonBody(request);
    if (!uuid(body.letterId)) throw new ApiError("편지 주소를 확인해 주세요.");
    const { data: source, error } = await db
      .from("letters")
      .select("id,cat_id,title,content")
      .eq("id", body.letterId)
      .eq("user_id", user.id)
      .eq("direction", "TO_CAT")
      .maybeSingle();
    if (error) throw error;
    if (!source) throw new ApiError("답장받을 편지를 찾지 못했어요.", 404);
    const key = process.env.GROQ_API_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!key || !serviceKey || !url)
      throw new ApiError(
        "서버의 Groq 키와 Supabase 서버 키 설정이 필요해요.",
        503,
      );
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const args = { p_user: user.id, p_source: source.id };
    const store: InstantReplyStore = {
      async claim() {
        const result = await admin.rpc("claim_instant_reply", args);
        if (result.error)
          throw new ApiError("답장 저장소에 연결하지 못했어요.", 503);
        return result.data;
      },
      async context() {
        const [cat, recent] = await Promise.all([
          db
            .from("cats")
            .select("name,personality,favorites,memories")
            .eq("id", source.cat_id)
            .eq("user_id", user.id)
            .single(),
          db
            .from("letters")
            .select("direction,content")
            .eq("cat_id", source.cat_id)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(4),
        ]);
        if (cat.error || recent.error || !cat.data)
          throw new Error("context_unavailable");
        return {
          ...cat.data,
          recent: recent.data || [],
          replyTo: source,
          date: new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Seoul",
          }).format(new Date()),
        };
      },
      async finish(lease, letter) {
        const result = await admin.rpc("finish_instant_reply", {
          ...args,
          p_lease: lease,
          p_title: letter.title,
          p_content: letter.content,
        });
        if (result.error) throw new Error("reply_save_failed");
        return result.data as string | null;
      },
      async fail(lease) {
        const result = await admin.rpc("finish_instant_reply", {
          ...args,
          p_lease: lease,
          p_title: null,
          p_content: null,
        });
        if (result.error) throw new Error("reply_release_failed");
      },
    };
    const result = await createInstantReply(
      store,
      key,
      process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
    );
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiFailure(
      error instanceof InstantReplyError
        ? new ApiError(error.message, error.status)
        : error,
    );
  }
}
