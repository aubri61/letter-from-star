"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
let client: ReturnType<typeof createBrowserClient> | undefined;
export function browserSupabase() {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase 환경 변수가 필요합니다.");
  return (client ??= createBrowserClient(config.url, config.key));
}
