import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Pro codes: minted in Mission HQ, signed with the server secret (no database). A device that holds one
// can keep its tasks for up to 8 hours instead of 30 minutes. Format: PRO-XXXXXX-XXXXXXXX (id + signature).
const sig = (id: string) => createHmac("sha256", `${process.env.ORBIT_SECRET}:pro`).update(id).digest("base64url").replace(/[-_]/g, "").slice(0, 8).toUpperCase();
export function mintPro() {
  const id = randomBytes(6).toString("base64url").replace(/[-_]/g, "").slice(0, 6).toUpperCase().padEnd(6, "X");
  return `PRO-${id}-${sig(id)}`;
}
export function validPro(code: unknown) {
  if (PRO_FOR_ALL) return true;
  if (typeof code !== "string") return false;
  const m = /^PRO-([A-Z0-9]{6})-([A-Z0-9]{8})$/.exec(code.trim().toUpperCase());
  if (!m) return false;
  const a = Buffer.from(sig(m[1])), b = Buffer.from(m[2]);
  return a.length === b.length && timingSafeEqual(a, b);
}
/** Testing mode: everyone is Pro (no code needed). Set to false at launch; codes from Mission HQ then unlock it. */
export const PRO_FOR_ALL = true;
/** how long a task may stay, in minutes */
export const FREE_TASK_LIFE = 30;
export const PRO_TASK_LIVES = [30, 60, 120, 240, 480];
