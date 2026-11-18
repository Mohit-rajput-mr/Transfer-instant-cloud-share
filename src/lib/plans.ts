// What each plan unlocks. Shared by the server (enforcement) and the pages (what we promise).
// Every number here is enforced somewhere; nothing is listed that isn't built.

export type PlanId = "free" | "pro" | "business";

export interface Perks {
  /** largest single file */
  maxFile: number;
  maxFileLabel: string;
  /** longest life a file may be given, in minutes */
  maxLife: number;
  maxLifeLabel: string;
  /** stored at the same moment across all live files of the account (team for Business) */
  quota: number;
  quotaLabel: string;
}

const GB = 1024 ** 3;
const DAY = 24 * 60;

export const PERKS: Record<PlanId, Perks> = {
  free: { maxFile: 20 * GB, maxFileLabel: "20 GB", maxLife: 30, maxLifeLabel: "30 minutes", quota: 0, quotaLabel: "—" },
  pro: { maxFile: 100 * GB, maxFileLabel: "100 GB", maxLife: 7 * DAY, maxLifeLabel: "7 days", quota: 200 * GB, quotaLabel: "200 GB" },
  business: { maxFile: 250 * GB, maxFileLabel: "250 GB", maxLife: 30 * DAY, maxLifeLabel: "30 days", quota: 1024 * GB, quotaLabel: "1 TB" },
};

/** lives a paid sender can pick, in minutes, on top of the free 5–30 */
export const LONG_LIVES: [number, string][] = [
  [60, "1 hour"], [6 * 60, "6 hours"], [DAY, "1 day"], [3 * DAY, "3 days"], [7 * DAY, "7 days"], [14 * DAY, "14 days"], [30 * DAY, "30 days"],
];
export const livesFor = (plan: PlanId) => LONG_LIVES.filter(([m]) => m <= PERKS[plan].maxLife);

/** price per month as shown on the Upgrade page (USD) — must match the Paddle catalog */
export const PRICES = { pro: { month: 8, year: 72 }, business: { month: 16, year: 144 } } as const;
