"use client";
import { LuArchive, LuArrowUp, LuCircleHelp, LuListChecks, LuFileText, LuMessageSquareText, LuMoon, LuSun, LuImage, LuLayoutGrid, LuMusic, LuOrbit, LuPalette, LuShieldCheck, LuTimer, LuUserX, LuVideo } from "react-icons/lu";
import Link from "next/link";
import { KINDS, type Kind } from "@/lib/skin-list";
import { useTheme } from "@/lib/theme";

const ICON = { all: LuLayoutGrid, photo: LuImage, video: LuVideo, doc: LuFileText, audio: LuMusic, archive: LuArchive } as const;
import { Pop } from "./Spaces";

/** Phones: everything that does not fit the slim top bar, as one small card of big icon tiles. */
export default function MobileMenu(props: { space: string | null; kind: Kind; onKind: (k: Kind) => void; onSend: () => void; onSpaces: () => void; onStyle: () => void; onHow: () => void; onTasks: () => void; taskCount: number; onClose: () => void; /** /work: theme and notes board instead of styles and the how-it-works page */ work?: { onBoard: () => void } }) {
  const [theme, setTheme] = useTheme();
  const go = (f: () => void) => () => {
    props.onClose();
    setTimeout(f, 60);
  };
  return (
    <Pop label="Menu" onClose={props.onClose} className="m-menu" small>
      <div className="m-tiles">
        <button className="m-tile lg-press solid" onClick={go(props.onSend)}><LuArrowUp aria-hidden /><b>Send</b><small>Files · folders · links</small></button>
        <button className="m-tile lg-press" onClick={go(props.onSpaces)}><LuOrbit aria-hidden /><b>{props.space ?? "Spaces"}</b><small>{props.space ? "Your space" : "Private rooms"}</small></button>
        {props.work ? (
          <button className="m-tile lg-press" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <LuMoon aria-hidden /> : <LuSun aria-hidden />}<b>{theme === "light" ? "Dark mode" : "Light mode"}</b><small>Switch the theme</small></button>
        ) : (
          <button className="m-tile lg-press" onClick={go(props.onStyle)}><LuPalette aria-hidden /><b>Style</b><small>How files look</small></button>
        )}
        <button className="m-tile lg-press" onClick={go(props.onTasks)}><LuListChecks aria-hidden /><b>Tasks</b><small>{props.taskCount ? `${props.taskCount} open` : "Assign · wire files"}</small></button>
        {props.work ? (
          <button className="m-tile lg-press" onClick={go(props.work.onBoard)}><LuMessageSquareText aria-hidden /><b>Notes</b><small>Every note on one board</small></button>
        ) : (
          <button className="m-tile lg-press" onClick={go(props.onHow)}><LuCircleHelp aria-hidden /><b>How it works</b><small>Drop · lock · beam · burn</small></button>
        )}
      </div>
      <Link className="m-about mono" href="/about" onClick={props.onClose}>About · Contact</Link>
      {props.work && <Link className="m-about mono" href="/">Classic Orbit view</Link>}
      <span className="mono dim">Show only</span>
      <div className="m-kinds" role="radiogroup" aria-label="Show only">
        {KINDS.map((k) => {
          const I = ICON[k.id];
          return <button key={k.id} role="radio" aria-checked={props.kind === k.id} className={props.kind === k.id ? "on" : ""} onClick={() => props.onKind(k.id)}><I aria-hidden />{k.name}</button>;
        })}
      </div>
      <div className="m-facts">
        <span><LuUserX aria-hidden />No login</span>
        <span><LuShieldCheck aria-hidden />Encrypted</span>
        <span><LuTimer aria-hidden />Burns in 5–30 min</span>
      </div>
    </Pop>
  );
}
