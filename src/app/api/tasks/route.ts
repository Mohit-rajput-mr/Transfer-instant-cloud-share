import { NextRequest, NextResponse } from "next/server";
import { ANON_AREA, anonNet, areaFor, isHex, netHash, newId, rpc, sha256 } from "@/lib/server";
import { cleanHandle, isAnonSpace, liveWithSpace, member, validFrom } from "@/lib/spaces";
import { FREE_TASK_LIFE, PRO_TASK_LIVES, validPro } from "@/lib/pro";

export const dynamic = "force-dynamic";

// Tasks (supabase/migrations/010_tasks.sql): one line each, numbered, visible to everyone in the void
// (or only to a space's members). Files are wired to a task through their name tag.
const MAX_TASK = 140;
const cleanLine = (s: unknown) => (typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_TASK) : "");

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "bad request" }, { status: 400 });
  const text = cleanLine(b.text);
  if (!text) return NextResponse.json({ error: "Write the task first" }, { status: 400 });
  if (!isHex(b.owner, 64)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  let space: string | null = null;
  let by = cleanHandle(b.by);
  let alias = "";
  if (b.space != null) {
    const me = await member(b.space, b.deviceId, b.spaceToken);
    if (!me) return NextResponse.json({ error: "You are no longer in this space" }, { status: 403 });
    space = me.slug;
    by = by || me.handle;
    alias = me.handle;
  }
  // anonymous: only inside an anonymous space, signed with the space's alias, no place, a rotating rate-limit key
  const anon = b.anon === true || (!!space && (await isAnonSpace(space)));
  if (anon && !space) return NextResponse.json({ error: "Anonymous tasks go into an anonymous space" }, { status: 400 });
  if (anon) by = alias;
  const net = anon ? anonNet(req) : netHash(req);
  const area = anon ? ANON_AREA : areaFor(req, b.area);
  const id = "t" + newId(9);
  // Pro members keep tasks up to 8 hours; everyone else gets the usual 30 minutes
  const life = validPro(b.pro) && PRO_TASK_LIVES.includes(Number(b.life)) ? Number(b.life) : FREE_TASK_LIFE;
  try {
    const num = await rpc<number>("orbit_task_add", {
      p: { id, body: text, by, assignee: cleanHandle(b.assignee), from: validFrom(b.from) ? b.from : "", owner: sha256(b.owner), net, space: space ?? "", life, area },
    });
    // in a named space it stays until the space closes
    if (space && !anon) await liveWithSpace(space, "t", id);
    return NextResponse.json({ id, num });
  } catch (e) {
    if (String(e).includes("rate_limited")) return NextResponse.json({ error: "Too many tasks from your network. Try again in a while." }, { status: 429 });
    throw e;
  }
}
