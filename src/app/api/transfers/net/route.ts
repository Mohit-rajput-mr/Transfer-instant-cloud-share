import { NextRequest, NextResponse } from "next/server";
import { burnedUp, untag } from "@/lib/spaces";
import { netHash, rpc } from "@/lib/server";

export const dynamic = "force-dynamic";

// what is floating from this device's own network (Wi-Fi / office line), whatever area it was pinned to
// (supabase/migrations/024_same_network.sql): "Nearby" works even when two devices on one Wi-Fi sit in different areas
export async function GET(req: NextRequest) {
  const raw = await rpc<{ name?: unknown; expiresAt?: unknown }[]>("orbit_list_net", { p_net: netHash(req) }).catch(() => []);
  const items = (raw ?? []).map(untag).filter((o) => !o.space && !burnedUp(o));
  return NextResponse.json({ items }, { headers: { "Cache-Control": "private, max-age=2" } });
}
