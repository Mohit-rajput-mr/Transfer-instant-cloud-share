export interface Overview {
  now: string;
  online: number;
  devices: number;
  visits: number;
  countries: number;
  orbit: { objects: number; uploading: number; bytes: number; downloads: number };
  today: Partial<Day>;
  days: Day[];
  totals: { uploads: number; downloads: number; bytes_up: number; bytes_down: number; views: number };
  hourly: { h: string; up: number; down: number; visit: number }[];
  topCountries: { country: string; devices: number; live: number }[];
  cities: { city: string; country: string; n: number }[];
  browsers: Record<string, number>;
  os: Record<string, number>;
  forms: Record<string, number>;
  live: Pt[];
  /** online devices that shared their location: their exact spot (migration 017) */
  exact?: Exact[];
  /** every device that ever shared GPS, at its most recent exact spot, online or not (migration 018) */
  exactSeen?: Exact[];
  /** where "Stay anonymous" was used: the IP's rough area, with the IPs (migration 020, admin only) */
  anon?: AnonPlace[];
  /** every anonymous session, newest first (migration 021) */
  anonSessions?: AnonSessionRec[];
  visitors: Pt[];
  points: (Pt & { k: "upload" | "download" })[];
  arcs: { a: number; b: number; c: number; d: number }[];
  feed: { kind: string; label: string | null; country: string | null; city: string | null; bytes: number | null; at: string }[];
  transfers: AdminTransfer[];
  /** objects with a complete copy in cloud storage (R2) */
  cloud?: { ids: string[]; bytes: number; today: { copies: number; bytes: number }; total: { copies: number; bytes: number } } | null;
}

export interface Day {
  day: string;
  uploads: number;
  downloads: number;
  bytes_up: number;
  bytes_down: number;
  views: number;
  reports: number;
}

export interface Exact {
  lat: number;
  lon: number;
  /** metres, as the device reported it */
  acc: number | null;
  label: string | null;
  city: string | null;
  cc: string | null;
  at: string;
  /** exactSeen only: whether the device is online right now */
  online?: boolean;
}

export interface Pt {
  lat: number;
  lon: number;
  n: number;
  city?: string | null;
  cc?: string | null;
}

export interface AdminTransfer {
  id: string;
  name: string;
  fileName: string;
  size: number;
  status: string;
  downloads: number;
  failed: number;
  views: number;
  reports: number;
  watchers: number;
  country: string | null;
  city: string | null;
  device: string | null;
  createdAt: string;
  expiresAt: string;
  space?: string | null;
  by?: string | null;
  life?: number;
  open?: boolean;
  /** sender group (same device = same value) and the container name it was sent in */
  from?: string | null;
  groupName?: string | null;
}

export interface AdminSpace {
  slug: string;
  title: string;
  priv: boolean;
  at: number;
  members: string[];
  kicked: number;
}

export interface AnonPlace {
  lat: number;
  lon: number;
  city: string | null;
  cc: string | null;
  /** anonymous devices (throwaway ids) seen here in 90 days */
  n: number;
  online: number;
  last: string;
  first: string;
  ips: string[] | null;
}

export interface AnonSessionRec {
  alias: string;
  min: number;
  start: string;
  ends: string;
  ended: string | null;
  /** exit: turned off; timer: ran out (or the tab was closed) */
  reason: "exit" | "timer" | null;
  tz: string | null;
  /** minutes east of UTC */
  offset: number | null;
  ip: string | null;
  cc: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  spaces: number;
}
