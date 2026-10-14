// Public-use guardrails, shared by client and server.
export const MAX_FILE_BYTES = 5 * 1024 ** 3; // 5 GB per file
export const UPLOADS_PER_HOUR = 300; // per network, enforced in orbit_create
export const REPORTS_TO_REMOVE = 3; // distinct devices, enforced in orbit_report

// Stored copy layout (R2): the same ciphertext as the direct transfer, 8 MB chunks + 16-byte tag each,
// uploaded in parts of PART_CHUNKS chunks (every part the same size except the last, as R2 requires).
export const STORE_CHUNK = 8 * 1024 * 1024;
export const STORE_TAG = 16;
export const PART_CHUNKS = 4;
export const storeChunks = (size: number) => Math.max(1, Math.ceil(size / STORE_CHUNK));
export const storeParts = (size: number) => Math.ceil(storeChunks(size) / PART_CHUNKS);
