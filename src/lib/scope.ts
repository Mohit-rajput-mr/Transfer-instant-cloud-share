// What the public void shows, chosen with the buttons in the navbar:
//   Open void: everything public, worldwide (one list and one live room for everyone)
//   Nearby:    only your own area (~20-40 km); needs your location, so picking it asks for it
//   Wi-Fi:     only what was sent from the same network as you (same Wi-Fi / same public IP)
//   Mine:      only what you sent
export type Scope = "all" | "area" | "near" | "mine";

export const SCOPE_NAME: Record<Scope, string> = { all: "Open void", area: "Nearby", near: "Wi-Fi", mine: "Mine" };
export const SCOPE_HINT: Record<Scope, string> = {
  all: "Everything public, worldwide",
  area: "Only your area · uses your location",
  near: "Only people on your Wi-Fi",
  mine: "Only what you sent",
};
export const SCOPE_EMPTY: Record<Scope, string> = {
  all: "",
  area: "Nothing from your area yet",
  near: "Nothing from your Wi-Fi yet",
  mine: "You haven't sent anything yet",
};

/** whether an object shows under a scope; what you sent yourself always shows (except under nothing) */
export function inScope(o: { area?: string | null; netHash: string | null }, scope: Scope, me: { home: string; net: string | null; mine: boolean }) {
  if (scope === "all") return true;
  if (me.mine) return true;
  if (scope === "area") return !!me.home && o.area === me.home;
  if (scope === "near") return !!me.net && o.netHash === me.net;
  return false;
}

/** Nearby knows where you are only from your location or an area picked on the map (never the IP's rough guess) */
export const placed = (gps: boolean, how?: string) => gps || how === "pick";
/** the count on the Nearby button: nothing until the device is placed, so it never promises what a tap won't show */
export const countArea = (items: { area?: string | null }[], area: string, isPlaced: boolean) =>
  isPlaced && area ? items.filter((o) => o.area === area).length : 0;
