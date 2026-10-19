"use client";

// Work ↔ Classic in place. /, /[lang] and /work share one layout (app/(void)/layout.tsx) holding one <Void>, so the
// switch is only a new address: Next's patched history.pushState moves usePathname with no request, VoidShell flips
// the look, and uploads, device-to-device holds, sockets, previews, open cards and drafts all carry on.
// Never router.push / <Link> here: a failed RSC fetch on a bad line (exactly when uploads choke it) falls back to a
// full page load.

const KEY = "orbit:classic-path";
const CLASSIC = /^\/([a-z]{2}(-[a-z]{2,4})?)?$/i;
let classic = "";

/** the classic address last seen in this tab (/ or a language like /fr), to go back to from Work */
export function rememberClassic(path: string) {
  if (!CLASSIC.test(path) || path === classic) return;
  classic = path;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {}
}
function lastClassic() {
  if (classic) return classic;
  try {
    const p = sessionStorage.getItem(KEY);
    if (p && CLASSIC.test(p)) return p;
  } catch {}
  return "/";
}

// Next patches history once it drives it (next/dist/client/components/app-router.js, in the Router's own effect, which
// runs after its children's mount effects); still the browser's own = not booted yet
const native = (f: History["pushState"]) => /\[native code\]/.test(Function.prototype.toString.call(f));

/** A new address for this entry, without erasing Next's mark ({__NA, tree}) from it. Before Next patched history a
 *  raw replaceState(null, …) (a mount effect) wipes it, and Next ignores a popstate onto an unmarked entry: Back there
 *  would change the address and leave the page as it is. So: what is there is kept while history is still native;
 *  once patched, null lets Next copy its own keys and move usePathname / useSearchParams along. */
export function replaceUrl(url: string | URL) {
  const h = window.history;
  if (new URL(url, window.location.href).href === window.location.href) return;
  h.replaceState(native(h.replaceState) ? h.state : null, "", url);
}

export function switchView(to: "/" | "/work") {
  const u = new URL(window.location.href);
  // ?space= / ?o= stay (the same space and the same open card, in the other look)
  u.pathname = to === "/" ? lastClassic() : "/work";
  u.hash = "";
  if (u.pathname === window.location.pathname) return;
  const h = window.history;
  // Next not booted yet: the old way, a full load
  if (native(h.pushState)) return window.location.assign(u);
  // (a fallback: replaceUrl keeps Next's mark on this entry) unmarked, Back would change the address without the look
  // following (Next ignores unmarked entries; without its tree it restores the current one, the same for every view here)
  const st = h.state as Record<string, unknown> | null;
  if (!st?.__NA) h.replaceState({ ...st, __NA: true }, "", window.location.href);
  h.pushState(null, "", u);
  window.scrollTo(0, 0);
}
