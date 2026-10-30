import { requestOrigin } from "@/lib/request-origin";
import { serverSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const db = await serverSupabase();
  const origin = requestOrigin(request);
  if (!db) return NextResponse.redirect(new URL("/?notice=setup", origin));
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: origin + "/auth/callback" },
  });
  if (error || !data.url)
    return NextResponse.redirect(new URL("/?notice=auth", origin));
  return NextResponse.redirect(data.url);
}
