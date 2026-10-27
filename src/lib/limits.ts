// Public-use guardrails, shared by client and server.
export const MAX_FILE_BYTES = 20 * 1024 ** 3; // 20 GB per file
export const MAX_LABEL = "20 GB";
export const UPLOADS_PER_HOUR = 300; // per network, enforced in orbit_create
/** how long a bubble may float, in minutes: 30 min by default, up to 8 h */
export const BUBBLE_LIVES: [number, string][] = [[30, "30 min"], [60, "1 h"], [120, "2 h"], [240, "4 h"], [480, "8 h"]];
export const BUBBLE_LIFE = 30;
export const REPORTS_TO_REMOVE = 3; // distinct devices, enforced in orbit_report

// Stored copy layout (R2): the same ciphertext as the direct transfer, 8 MB chunks + 16-byte tag each,
// uploaded in parts of PART_CHUNKS chunks (every part the same size except the last, as R2 requires).
// One chunk a part (2026-10-27, was 4): a 20 MB file goes up as 3 parts side by side instead of one 20 MB request,
// a failed part costs 8 MB again instead of 32, and progress moves every 8 MB. The page says which layout it uploads
// with (`pc`); a page from before that says nothing and gets the old 4.
export const STORE_CHUNK = 8 * 1024 * 1024;
export const STORE_TAG = 16;
export const PART_CHUNKS = 1;
export const LEGACY_PART_CHUNKS = 4;
/** the part layout a page asked for (only the two that exist) */
export const partChunks = (pc: unknown) => (pc === 1 ? 1 : LEGACY_PART_CHUNKS);
export const storeChunks = (size: number) => Math.max(1, Math.ceil(size / STORE_CHUNK));
export const storeParts = (size: number, pc = PART_CHUNKS) => Math.ceil(storeChunks(size) / pc);

// Free-tier guard for the stored copy (R2 bills GB-months: ~10 GB-month free). Copies live minutes, so
// a few TB saved per month stays inside it. Past these the file still sends directly, just not stored.
export const CLOUD_MONTH_BYTES = 6 * 1024 ** 4; // saved per calendar month
export const CLOUD_LIVE_BYTES = 300 * 1024 ** 3; // alive at the same moment
/** while uploading, the page pings this often; the object stays alive this long past each ping */
export const ALIVE_EVERY_MS = 60_000;
