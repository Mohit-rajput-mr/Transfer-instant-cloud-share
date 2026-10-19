import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/server";
import { getMeta, member } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// people inside an anonymous space: see who is knocking ({ deviceId, token }), or answer one
// ({ deviceId, token, id, allow, box }: box is the invite sealed in the browser to the knocker's key)
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await req.json().catch(() => null);
  const me = await member(slug, b?.deviceId, b?.token);
  const meta = me && (await getMeta(me.slug));
  if (!me || !meta?.anon) return NextResponse.json({ error: "Not in this space" }, { status: 403 });
  if (typeof b?.id === "string") {
    const allow = b.allow === true;
    const box = allow && typeof b.box === "string" ? b.box : null;
    const ok = await rpc<boolean>("orbit_knock_answer", { p_slug: me.slug, p_id: b.id, p_allow: allow, p_box: box }).catch(() => false);
    return NextResponse.json({ ok });
  }
  const knocks = await rpc<{ id: string; pub: string; at: string }[]>("orbit_knock_list", { p_slug: me.slug }).catch(() => []);
  return NextResponse.json({ knocks }, { headers: { "Cache-Control": "no-store" } });
}
