import { NextRequest, NextResponse } from "next/server";
import { reap } from "@/lib/server";

export const dynamic = "force-dynamic";

// Called by Supabase pg_cron every few minutes and by Vercel cron daily.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const ok = auth === `Bearer ${process.env.ORBIT_SECRET}` || (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const removed = await reap(true);
  return NextResponse.json({ removed });
}
