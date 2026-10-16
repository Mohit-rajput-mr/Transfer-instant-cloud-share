import { NextRequest, NextResponse } from "next/server";
import { isHex, rpc, sha256, validId } from "@/lib/server";
import { tagName, untag, validTask } from "@/lib/spaces";

export const dynamic = "force-dynamic";

// The sender wires an object to a task after sending it (or unwires it: task null). Only its name tag changes.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b || !isHex(b.owner, 64)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (b.task != null && !validTask(b.task)) return NextResponse.json({ error: "bad task" }, { status: 400 });
  const ownerHash = sha256(b.owner);
  const item = await rpc<{ name?: unknown; expiresAt?: unknown } | null>("orbit_owner", { p_id: id, p_owner_hash: ownerHash });
  if (!item || typeof item.name !== "string") return NextResponse.json({ error: "gone" }, { status: 404 });
  const u = untag(item);
  const name = tagName(String(u.name), {
    space: u.space ?? undefined, by: u.by ?? undefined, life: u.life, open: u.open, from: u.from ?? undefined,
    group: u.groupName ?? undefined, skin: u.skin ?? undefined, thumb: u.thumb, task: b.task ?? undefined,
  });
  const ok = await rpc<boolean>("orbit_retag", { p_id: id, p_owner_hash: ownerHash, p_name: name });
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "gone" }, { status: 404 });
}
