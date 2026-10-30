import { requestOrigin } from "@/lib/request-origin";
import { serverSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const code = url.searchParams.get("code");
  const db = await serverSupabase();
  if (code && db) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/postoffice", origin));
  }
  return NextResponse.redirect(new URL("/?notice=auth", origin));
}
