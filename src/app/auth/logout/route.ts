import { requireUser, apiFailure } from "@/lib/api";
export async function POST(request: Request) {
  try {
    const { db } = await requireUser(request);
    const { error } = await db.auth.signOut();
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return apiFailure(e);
  }
}
