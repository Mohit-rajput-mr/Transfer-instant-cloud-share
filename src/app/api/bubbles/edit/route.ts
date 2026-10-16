import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256 } from "@/lib/server";

export const dynamic = "force-dynamic";

const cleanText = (s: unknown) =>
  typeof s === "string" ? s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 500) : "";

// the sender adds more to their bubble (the new part shows as new) or rewrites it (shows as edited)
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.id !== "string" || !/^b[a-z0-9]{9}$/.test(b.id) || !isHex(b.owner, 64)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const text = cleanText(b.text);
  if (!text) return NextResponse.json({ error: "Write something first" }, { status: 400 });
  const ok = await rpc<boolean>("orbit_bubble_edit", { p_id: b.id, p_owner_hash: sha256(b.owner), p_body: text, p_append: b.mode !== "edit" });
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "This bubble has burnt" }, { status: 404 });
}
