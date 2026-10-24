import { createHash, createHmac } from "node:crypto";
import { putTicket } from "./r2";

// Downloads through Cloudflare's edge (live/ worker, GET /f/<id>?t=<token>): the worker reads the stored copy over
// Cloudflare's own network and keeps it cached at the location nearest the reader. A file's token is the same for
// everyone who may download it (like the signed link): a keyed hash of its id, so nothing is kept per download. The
// worker checks the ticket k/<id> (a hash of the token + until when), written once when the file is launched
// (writeTicket, after the reply: unlock never waits on it); deleting the file deletes the ticket. A file without a
// ticket (launched before this) is refused by the worker and read from the bucket's signed link instead.

const LIVE = process.env.NEXT_PUBLIC_LIVE_URL ?? "";
const BASE = /^wss:\/\//.test(LIVE) ? LIVE.replace(/^wss:/, "https:").replace(/\/+$/, "") : "";
const SECRET = process.env.ORBIT_SECRET ?? "";
// longer than anything lives (a space's files: 8 hours); the reaper deletes the ticket with the file
const TICKET_LIFE = 9 * 3600_000;

const token = (id: string) => createHmac("sha256", SECRET).update(`edge:${id}`).digest("base64url").slice(0, 32);

export const edgeOn = () => !!BASE && !!SECRET;

/** the edge link for a file (no network: the ticket was written at launch) */
export const edgeLink = (id: string) => (edgeOn() ? `${BASE}/f/${id}?t=${token(id)}` : null);

/** a new file's ticket (at launch) */
export async function writeTicket(id: string) {
  if (!edgeOn()) return;
  await putTicket(id, createHash("sha256").update(token(id)).digest("hex"), Date.now() + TICKET_LIFE);
}
