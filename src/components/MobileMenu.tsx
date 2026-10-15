"use client";
import { LuArrowUp, LuCircleHelp, LuOrbit, LuPalette, LuShieldCheck, LuTimer, LuUserX } from "react-icons/lu";
import { Pop } from "./Spaces";

/** Phones: everything that does not fit the slim top bar, as one small card of big icon tiles. */
export default function MobileMenu(props: { space: string | null; onSend: () => void; onSpaces: () => void; onStyle: () => void; onHow: () => void; onClose: () => void }) {
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
      <div className="m-facts">
        <span><LuUserX aria-hidden />No login</span>
        <span><LuShieldCheck aria-hidden />Encrypted</span>
        <span><LuTimer aria-hidden />Burns in 5–30 min</span>
      </div>
    </Pop>
  );
}
