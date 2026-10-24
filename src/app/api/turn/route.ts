import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Short-lived TURN credentials (Cloudflare Realtime TURN, free up to 1,000 GB a month): a relay at the nearest
// Cloudflare city for device-to-device sends that a network blocks (lib/p2p.ts). Off until the owner adds
// CF_TURN_KEY_ID and CF_TURN_KEY_TOKEN (Cloudflare dashboard → Realtime → TURN → Create key) to the Vercel env.
// One set of credentials is shared for a while per server instance, so a busy hour costs a handful of key calls.
const ID = process.env.CF_TURN_KEY_ID ?? "";
const TOKEN = process.env.CF_TURN_KEY_TOKEN ?? "";
const TTL = 4 * 3600;
let cached: { until: number; body: { iceServers: unknown[]; ttl: number } } | null = null;

export async function GET() {
  if (!ID || !TOKEN) return NextResponse.json({ iceServers: [] }, { headers: { "Cache-Control": "no-store" } });
  if (!cached || cached.until < Date.now()) {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(ID)}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: TTL }),
      signal: AbortSignal.timeout(4000),
    }).catch(() => null);
    const d = r?.ok ? ((await r.json().catch(() => null)) as { iceServers?: unknown } | null) : null;
    const list = Array.isArray(d?.iceServers) ? d.iceServers : d?.iceServers ? [d.iceServers] : [];
    // handed out for at most the last 3 hours of their 4, so every page gets at least an hour of use
    if (list.length) cached = { until: Date.now() + (TTL - 3 * 3600) * 1000, body: { iceServers: list, ttl: 3 * 3600 } };
    else return NextResponse.json({ iceServers: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(cached.body, { headers: { "Cache-Control": "no-store" } });
}
