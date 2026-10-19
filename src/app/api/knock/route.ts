import { NextRequest, NextResponse } from "next/server";
import { newId, rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

// knock on an anonymous space with its 4-letter code (supabase/migrations/022_knocks.sql). Nothing about the space is
// shown before someone inside lets the knocker in: only its title code comes back.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const code = typeof b?.code === "string" ? b.code.trim().replace(/^anon-?/i, "") : "";
  const pub = typeof b?.pub === "string" ? b.pub : "";
  if (!/^[A-Za-z0-9]{4}$/.test(code) || !/^[A-Za-z0-9+/=_-]{40,200}$/.test(pub)) return NextResponse.json({ error: "Type the 4 letters" }, { status: 400 });
  const id = newId(20);
  const slug = await rpc<string | null>("orbit_knock", { p_id: id, p_code: code, p_pub: pub }).catch(() => null);
  if (!slug) return NextResponse.json({ error: "No anonymous space answers to that code" }, { status: 404 });
  return NextResponse.json({ id, title: "Anonymous · " + slug.slice(5, 9).toUpperCase() }, { headers: { "Cache-Control": "no-store" } });
}
