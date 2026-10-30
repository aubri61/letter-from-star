import { createClient } from "npm:@supabase/supabase-js@2.98.0";
import { processBatch, type JobStore, type Job } from "../_shared/worker.ts";
import {
  DEFAULT_GROQ_MODEL,
  type MemoryContext,
} from "../_shared/generation.ts";
Deno.serve(async (request: Request) => {
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("LETTER_CRON_SECRET");
  if (!secret || request.headers.get("x-letter-cron-secret") !== secret)
    return new Response("Unauthorized", { status: 401 });
  const key = Deno.env.get("GROQ_API_KEY"),
    url = Deno.env.get("SUPABASE_URL"),
    service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key || !url || !service)
    return new Response("Worker is not configured", { status: 503 });
  const db = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const check = (error: unknown) => {
    if (error) throw new Error("database_operation_failed");
  };
  const store: JobStore = {
    async claim() {
      const { data, error } = await db.rpc("claim_letter_jobs", { p_limit: 3 });
      check(error);
      return data as Job[];
    },
    async context(job) {
      const { data: cat, error } = await db
        .from("cats")
        .select("name,personality,favorites,memories")
        .eq("id", job.cat_id)
        .single();
      check(error);
      if (!cat) throw new Error("cat_not_found");
      const { data: recent, error: recentError } = await db
        .from("letters")
        .select("direction,content")
        .eq("cat_id", job.cat_id)
        .order("created_at", { ascending: false })
        .limit(4);
      check(recentError);
      const { data: sent, error: sentError } = await db
        .from("letters")
        .select("title,content")
        .eq("cat_id", job.cat_id)
        .eq("direction", "TO_CAT")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      check(sentError);
      return {
        ...cat,
        recent: recent || [],
        replyTo: sent || undefined,
        date: job.delivery_date,
      } as MemoryContext;
    },
    async finish(job, letter) {
      const { data, error } = await db.rpc("finish_letter_job", {
        p_job: job.id,
        p_lease: job.lease_token,
        p_title: letter.title,
        p_content: letter.content,
      });
      check(error);
      return data === true;
    },
    async fail(job, code) {
      const { error } = await db.rpc("fail_letter_job", {
        p_job: job.id,
        p_lease: job.lease_token,
        p_error: code,
      });
      check(error);
    },
  };
  try {
    return Response.json(
      await processBatch(
        store,
        key,
        Deno.env.get("GROQ_MODEL") || DEFAULT_GROQ_MODEL,
      ),
    );
  } catch {
    return new Response("Worker database error", { status: 500 });
  }
});
