import { NextResponse, type NextRequest } from "next/server";
import { userOf } from "@/lib/account";
import { rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

// Bubble names (migration 040): one unique name per account, the name its files, notes and tasks carry.
type Check = { handle: string; available: boolean; suggestions: string[] };

/** GET ?h=wanted → is it free, and 3 free ones (Gmail-style) from the wanted name and the person's name / email */
export async function GET(req: NextRequest) {
  const u = await userOf(req);
  if (!u) return NextResponse.json({ error: "Log in first" }, { status: 401 });
  const want = (req.nextUrl.searchParams.get("h") || "").slice(0, 40);
  const n = (u.name || "").toLowerCase().split(/\s+/).filter(Boolean);
  const seeds = [n.join(""), n.join("."), n[0] || "", (u.email || "").split("@")[0]].filter((x) => x.length >= 3);
  const r = await rpc<Check>("orbit_handle_check", { p_want: want, p_seeds: seeds });
  return NextResponse.json(r, { headers: { "Cache-Control": "no-store" } });
}

/** POST { handle } → take it (or change to it) */
export async function POST(req: NextRequest) {
  const u = await userOf(req);
  if (!u) return NextResponse.json({ error: "Log in first" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { handle?: string } | null;
  const h = String(b?.handle ?? "").trim().toLowerCase();
  const r = await rpc<string>("orbit_handle_claim", { p_user: u.id, p_handle: h });
  if (r === "ok") return NextResponse.json({ ok: true, handle: h });
  return NextResponse.json({ error: r === "taken" ? `"${h}" is taken` : "3 to 20 letters, numbers, dots or underscores" }, { status: 409 });
}
