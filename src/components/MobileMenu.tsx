"use client";
import { LuArchive, LuArrowUp, LuCircleHelp, LuFileText, LuImage, LuLayoutGrid, LuMusic, LuOrbit, LuPalette, LuShieldCheck, LuTimer, LuUserX, LuVideo } from "react-icons/lu";
import { KINDS, type Kind } from "@/lib/skin-list";

const ICON = { all: LuLayoutGrid, photo: LuImage, video: LuVideo, doc: LuFileText, audio: LuMusic, archive: LuArchive } as const;
import { Pop } from "./Spaces";

/** Phones: everything that does not fit the slim top bar, as one small card of big icon tiles. */
export default function MobileMenu(props: { space: string | null; kind: Kind; onKind: (k: Kind) => void; onSend: () => void; onSpaces: () => void; onStyle: () => void; onHow: () => void; onClose: () => void }) {
  const go = (f: () => void) => () => {
    props.onClose();
    setTimeout(f, 60);
  };
  return (
    <Pop label="Menu" onClose={props.onClose} className="m-menu" small>
      <div className="m-tiles">
        <button className="m-tile lg-press solid" onClick={go(props.onSend)}><LuArrowUp aria-hidden /><b>Send</b><small>Files · folders · links</small></button>
        <button className="m-tile lg-press" onClick={go(props.onSpaces)}><LuOrbit aria-hidden /><b>{props.space ?? "Spaces"}</b><small>{props.space ? "Your space" : "Private rooms"}</small></button>
        <button className="m-tile lg-press" onClick={go(props.onStyle)}><LuPalette aria-hidden /><b>Style</b><small>How files look</small></button>
        <button className="m-tile lg-press" onClick={go(props.onHow)}><LuCircleHelp aria-hidden /><b>How it works</b><small>Drop · lock · beam · burn</small></button>
      </div>
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
