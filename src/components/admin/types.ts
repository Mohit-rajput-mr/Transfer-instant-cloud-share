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
  visitors: Pt[];
  points: (Pt & { k: "upload" | "download" })[];
  arcs: { a: number; b: number; c: number; d: number }[];
  feed: { kind: string; label: string | null; country: string | null; city: string | null; bytes: number | null; at: string }[];
  transfers: AdminTransfer[];
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
}

export interface AdminSpace {
  slug: string;
  title: string;
  priv: boolean;
  at: number;
  members: string[];
  kicked: number;
}
