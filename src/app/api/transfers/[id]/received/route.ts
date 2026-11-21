import { NextRequest, NextResponse } from "next/server";
import { anonDevice, anonEventId, clean, geo, isHex, removeBlobs, rpc, sha256, validId } from "@/lib/server";
import { untag } from "@/lib/spaces";

// The receiver's page has the whole file: this is when it counts as a download (unlock only checks the passcode,
// migration 031). Needs the same passcode proof as unlock, so a count can't be faked without it.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => null);
  if (!validId(id) || !b || !isHex(b.auth, 64)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  // an anonymous object: each device counts once, and a download limit burns it when the last device has it (045)
  const raw = await rpc<{ name?: unknown } | null>("orbit_get", { p_id: id }).catch(() => null);
  const once = !!(raw && untag(raw).anon);
  const anon = b.anon === true || once;
  const r = await rpc<Record<string, unknown>>(once ? "orbit_received2" : "orbit_received", {
    ...(once ? { p_once: true } : null),
    p_id: id,
    p_auth_hash: sha256(b.auth),
    p_device: anon ? anonEventId(id, anonDevice(b)) : clean(b.deviceId, 40),
    p_label: anon ? "" : clean(b.device, 60),
    p_geo: anon ? {} : geo(req),
    // how long the download took on the receiver (HQ shows it on the route, migration 032)
    p_ms: Number.isSafeInteger(b.ms) && b.ms >= 0 && b.ms <= 86_400_000 ? b.ms : null,
  });
  // burnt: its stored copy, preview and edge ticket go now (the url never leaves the server)
  if (r?.burned) {
    await removeBlobs([typeof r.url === "string" ? r.url : `p2p/${id}`]);
    delete r.url;
  }
  return NextResponse.json(r ?? { ok: false }, { status: r?.ok ? 200 : 403 });
}
