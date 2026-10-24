import { createHash, createHmac } from "node:crypto";
import { putTicket } from "./r2";

// Downloads through Cloudflare's edge (live/ worker, GET /f/<id>?t=<token>): the worker reads the stored copy over
// Cloudflare's own network and keeps it cached at the location nearest the reader. A file's token is the same for
// everyone who may download it (like the signed link): a keyed hash of its id, so nothing is kept per download. The
// worker only checks the ticket k/<id> (a hash of the token + until when), written here on unlock; deleting the file
// deletes the ticket. Off when the live worker isn't configured.

const LIVE = process.env.NEXT_PUBLIC_LIVE_URL ?? "";
const BASE = /^wss:\/\//.test(LIVE) ? LIVE.replace(/^wss:/, "https:").replace(/\/+$/, "") : "";
const SECRET = process.env.ORBIT_SECRET ?? "";
// a ticket is written at most this often per file (each write is one paid-tier operation on R2's free allowance)
const fresh = new Map<string, number>();

export async function edgeLink(id: string): Promise<string | null> {
  if (!BASE || !SECRET) return null;
  const tok = createHmac("sha256", SECRET).update(`edge:${id}`).digest("base64url").slice(0, 32);
  const exp = Date.now() + 3 * 3600_000;
  if ((fresh.get(id) ?? 0) < Date.now() + 2 * 3600_000) {
    try {
      await putTicket(id, createHash("sha256").update(tok).digest("hex"), exp);
      if (fresh.size > 5000) fresh.clear();
      fresh.set(id, exp);
    } catch {
      return null;
    }
  }
  return `${BASE}/f/${id}?t=${tok}`;
}
