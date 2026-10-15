"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { LuCheck, LuMonitorSmartphone, LuTicket } from "react-icons/lu";
import { Pop } from "./Spaces";
import { AUTO_DEVICE, PALETTES, SKIN_GROUPS, SKINS, deviceSync, makeStyleCode, redeemStyleCode, setDeviceSync, setPalette, setSkin, skinName, toneOf, typeHue, useLook } from "@/lib/skins";

const EXTS = ["PDF", "JPG", "MP4", "ZIP", "DOC", "XLS"];

/** a small live sample of a style: the same markup and CSS as a ball inside a container */
function Sample(props: { id: string; i: number; pal: string; size?: number }) {
  const hue = (props.i * 47 + 200) % 360;
  const e = EXTS[props.i % EXTS.length];
  return (
    <span className="skin-sample" data-skin={props.id} data-tone={toneOf(props.id)} data-pal={props.pal} style={{ "--md": `${props.size ?? 46}px` } as CSSProperties}>
      <span className="mball" style={{ "--sh": hue, "--th": typeHue(`x.${e.toLowerCase()}`), "--life": 0.68 } as CSSProperties}>
        <svg className="mring" viewBox="0 0 100 100" aria-hidden>
          <circle className="track" cx="50" cy="50" r="48" />
          <circle className="life" cx="50" cy="50" r="48" strokeDasharray={301.6} strokeDashoffset={301.6 * 0.32} />
        </svg>
        <span>{e}</span>
      </span>
    </span>
  );
}

/** Pick how dropped objects look: 36 styles in groups, from office-serious to playful. */
export default function StylePicker(props: { onClose: () => void; toast: (m: string) => void }) {
  const { skin, pal } = useLook();
  const [sync, setSync] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  useEffect(() => setSync(deviceSync()), []);

  const pick = (id: string) => {
    setSkin(id);
    setCode(null);
  };
  const toggleSync = async () => {
    const on = !sync;
    setSync(on);
    await setDeviceSync(on);
    props.toast(on ? "Remembered on this computer, in every browser" : "No longer remembered on this computer");
  };
  const share = async () => {
    const c = await makeStyleCode();
    if (!c) return props.toast("Couldn't make a code. Try again");
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      props.toast("Style code copied");
    } catch {}
  };
  const redeem = async () => {
    const id = await redeemStyleCode(typed);
    props.toast(id ? `Style applied: ${skinName(id)}` : "That code didn't work");
    if (id) setTyped("");
  };

  return (
    <Pop label="Style" onClose={props.onClose} className="style-pop">
      <div className="style-now">
        <Sample id={skin} i={1} pal={pal} size={58} />
        <div>
          <span className="mono dim">How files look</span>
          <div className="wide style-name">{skinName(skin)}</div>
        </div>
      </div>
      <section className="style-group">
        <span className="mono dim">Colours</span>
        <div className="seg style-pal" role="radiogroup" aria-label="Colours">
          {PALETTES.map((p) => (
            <button key={p.id} role="radio" aria-checked={pal === p.id} className={pal === p.id ? "on" : ""} onClick={() => setPalette(p.id)} title={p.note}>
              <i className={`pal-dot ${p.id}`} aria-hidden />{p.name}
            </button>
          ))}
        </div>
      </section>
      {SKIN_GROUPS.map((g) => (
        <section key={g} className="style-group">
          <span className="mono dim">{g}</span>
          <div className="style-grid">
            {SKINS.filter((s) => s.group === g).map((s, i) => (
              <button key={s.id} className={`style-tile lg-press${s.id === skin ? " on" : ""}`} onClick={() => pick(s.id)} aria-pressed={s.id === skin} aria-label={`${s.name} style`}>
                <Sample id={s.id} i={i + g.length} pal={pal} />
                <b>{s.name}</b>
                {s.id === skin && <i className="style-check" aria-hidden><LuCheck /></i>}
              </button>
            ))}
          </div>
        </section>
      ))}

      <section className="style-keep">
        <span className="mono dim">Keep it, without an account</span>
        {AUTO_DEVICE ? (
          <div className="style-row on">
            <LuMonitorSmartphone aria-hidden />
            <span><b>Remembered on this computer</b><small>Every browser here (Chrome, Edge, Firefox, Safari) opens with your style. Only the style is saved.</small></span>
          </div>
        ) : (
          <button className={`style-row lg-press${sync ? " on" : ""}`} onClick={toggleSync} role="switch" aria-checked={sync}>
            <LuMonitorSmartphone aria-hidden />
            <span><b>Remember on this computer</b><small>Chrome, Edge, Firefox, Safari: every browser here opens with your style. Only the style is saved.</small></span>
            <i className="sw" aria-hidden />
          </button>
        )}
        <div className="style-row code">
          <LuTicket aria-hidden />
          <span><b>Style code</b><small>Carry your style to any browser or device.</small></span>
          <button className="pill lg-press" onClick={share}>{code ?? "Get code"}</button>
        </div>
        <div className="style-redeem">
          <input className="line-input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Have a code? ORBI-…" maxLength={11} autoComplete="off" onKeyDown={(e) => e.key === "Enter" && redeem()} />
          <button className="pill lg-press" disabled={typed.trim().length < 6} onClick={redeem}>Apply</button>
        </div>
      </section>
    </Pop>
  );
}
