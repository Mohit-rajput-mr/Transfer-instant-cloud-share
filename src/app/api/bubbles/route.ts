import { NextRequest, NextResponse } from "next/server";
import { isHex, netHash, newId, rpc, sha256 } from "@/lib/server";
import { LIVES, cleanHandle, member, validFrom } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// Bubble text (supabase/migrations/007_bubbles.sql): a short plain note that floats in the void as is.
// No passcode and no encryption on purpose: it is meant to be read at a glance, copied and shared.
// Inside a space only its members get it. It burns like an object.
const MAX_BUBBLE = 500;
const cleanText = (s: unknown) =>
  typeof s === "string" ? s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_BUBBLE) : "";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "bad request" }, { status: 400 });
  const text = cleanText(b.text);
  if (!text) return NextResponse.json({ error: "Write something first" }, { status: 400 });
  if (!isHex(b.owner, 64)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  let space: string | null = null;
  let by = cleanHandle(b.by);
  if (b.space != null) {
    const me = await member(b.space, b.deviceId, b.spaceToken);
    if (!me) return NextResponse.json({ error: "You are no longer in this space" }, { status: 403 });
    space = me.slug;
    by = by || me.handle;
  }
  const id = "b" + newId(9);
  try {
    await rpc("orbit_bubble_add", {
      p: {
        id, body: text, by, from: validFrom(b.from) ? b.from : "", owner: sha256(b.owner), net: netHash(req), space: space ?? "",
        hue: Number.isInteger(b.hue) && b.hue >= 0 && b.hue < 360 ? b.hue : Math.floor(Math.random() * 360),
        life: LIVES.includes(Number(b.life)) ? Number(b.life) : 30,
      },
    });
  } catch (e) {
    if (String(e).includes("rate_limited")) return NextResponse.json({ error: "Too many bubbles from your network. Try again in a while." }, { status: 429 });
    throw e;
  }
  return NextResponse.json({ id });
}
