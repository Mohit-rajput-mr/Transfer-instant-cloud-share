import { NextResponse, type NextRequest } from "next/server";
import { userOf } from "@/lib/account";
import { rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

type Team = { error?: string; seats?: number; members?: { email: string; addedAt: string; joined: boolean }[] };

/** Business owner: the team (GET), add or remove someone by email (POST { action, email }) */
export async function GET(req: NextRequest) {
  const user = await userOf(req);
  if (!user) return NextResponse.json({ error: "signed out" }, { status: 401 });
  const t = await rpc<Team>("orbit_team", { p_owner: user.id, p_action: "list", p_email: "" });
  return NextResponse.json(t, { status: t.error ? 403 : 200 });
}

export async function POST(req: NextRequest) {
  const user = await userOf(req);
  if (!user) return NextResponse.json({ error: "signed out" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { action?: string; email?: string } | null;
  if (!b || (b.action !== "add" && b.action !== "remove") || typeof b.email !== "string" || b.email.length > 254)
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  const t = await rpc<Team>("orbit_team", { p_owner: user.id, p_action: b.action, p_email: b.email });
  return NextResponse.json(t, { status: t.error ? 400 : 200 });
}
