import { redirect, notFound } from "next/navigation";
import { serverSupabase } from "@/lib/supabase/server";
import { Postoffice } from "@/components/postoffice";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ screen?: string[] }>;
}) {
  const db = await serverSupabase();
  if (!db) redirect("/?notice=setup");
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/auth/login");
  const { screen = [] } = await params;
  if (
    screen.length > 2 ||
    (screen.length &&
      !["cat", "compose", "archive", "letters", "settings"].includes(screen[0]))
  )
    notFound();
  return <Postoffice screen={screen} preview={false} />;
}
