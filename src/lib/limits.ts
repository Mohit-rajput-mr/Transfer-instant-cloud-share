// Public-use guardrails, shared by client and server.
export const MAX_FILE_BYTES = 2 * 1024 ** 3; // 2 GB per file
export const UPLOADS_PER_HOUR = 30; // per network, enforced in orbit_create
export const REPORTS_TO_REMOVE = 3; // distinct devices, enforced in orbit_report
