import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

// ?name=k7qx: the live anonymous spaces with that 4-character name (usually one). Only their slugs: getting in still
// needs the passcode, checked by /api/spaces/[slug]/join with its wrong-passcode limits.
export async function GET(req: NextRequest) {
  const name = (req.nextUrl.searchParams.get("name") ?? "").toLowerCase();
  if (!/^[a-z0-9]{4}$/.test(name)) return NextResponse.json({ slugs: [] }, { status: 400 });
  const slugs = await rpc<string[]>("orbit_anon_find", { p_name: name }).catch(() => null);
  if (!slugs) return NextResponse.json({ error: "Anonymous spaces aren't available yet" }, { status: 500 });
  return NextResponse.json({ slugs }, { headers: { "Cache-Control": "no-store" } });
}
