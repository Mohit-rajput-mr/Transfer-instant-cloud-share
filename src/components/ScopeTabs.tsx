"use client";
import { LuGlobe, LuMapPin, LuUser, LuWifi } from "react-icons/lu";
import { SCOPE_HINT, SCOPE_NAME, type Scope } from "@/lib/scope";

const ICON = { all: LuGlobe, area: LuMapPin, near: LuWifi, mine: LuUser } as const;

/** The navbar's second row: Open void · Nearby · Wi-Fi (· Mine once you sent something). Anonymous: no place and no
 *  network are known, so only the open void exists and the row goes. */
export default function ScopeTabs({ value, onPick, counts, anon, className = "" }: { value: Scope; onPick: (s: Scope) => void; counts: { area: number; near: number; mine: number }; anon: boolean; className?: string }) {
  if (anon) return null;
  const list: Scope[] = ["all", "area", "near", ...(counts.mine ? (["mine"] as const) : [])];
  return (
    <div className={`scope-tabs ${className}`} role="tablist" aria-label="Show" data-no-pan>
      {list.map((s) => {
        const I = ICON[s];
        const n = s === "all" ? 0 : counts[s];
        return (
          <button key={s} role="tab" aria-selected={value === s} className={`lg-press${value === s ? " on" : ""}`} onClick={() => onPick(s)} title={SCOPE_HINT[s]}>
            <I aria-hidden />
            <span>{SCOPE_NAME[s]}</span>
            {n ? <em>{n}</em> : null}
          </button>
        );
      })}
    </div>
  );
}
