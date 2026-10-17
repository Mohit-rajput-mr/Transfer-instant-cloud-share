"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { LuArchive, LuArrowUp, LuBriefcase, LuChevronRight, LuCircleHelp, LuFileText, LuImage, LuInfo, LuLayers, LuLayoutGrid, LuListChecks, LuMessageSquareText, LuMoon, LuMusic, LuOrbit, LuPalette, LuShieldCheck, LuSparkles, LuSun, LuTimer, LuUser, LuUserX, LuVideo, LuWifi, LuX } from "react-icons/lu";
import { KINDS, type Kind } from "@/lib/skin-list";
import { useTheme } from "@/lib/theme";

const ICON = { all: LuLayoutGrid, photo: LuImage, video: LuVideo, doc: LuFileText, audio: LuMusic, archive: LuArchive } as const;
type Scope = "all" | "near" | "mine";

/** Phones: a sidebar that slides in from the right, holding everything that doesn't fit the slim top bar. */
export default function MobileMenu(props: {
  space: string | null;
  kind: Kind;
  onKind: (k: Kind) => void;
  onSend: () => void;
  onSpaces: () => void;
  onStyle: () => void;
  onHow: () => void;
  onTasks: () => void;
  taskCount: number;
  onClose: () => void;
  /** what to show (Nearby only in the public void, Mine once you have something up) */
  scope?: { value: Scope; set: (s: Scope) => void; near: number | null; mine: number };
  onBoard?: () => void;
  /** /work: theme switch instead of styles, and the way back to the classic look */
  work?: { onBoard: () => void };
}) {
  const [theme, setTheme] = useTheme();
  const [out, setOut] = useState(false);
  const { onClose } = props;
  const close = useCallback(() => {
    setOut(true);
    setTimeout(onClose, 220);
  }, [onClose]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    document.documentElement.classList.add("card-open");
    return () => {
      window.removeEventListener("keydown", k);
      document.documentElement.classList.remove("card-open");
    };
  }, [close]);
  const go = (f: () => void) => () => {
    close();
    setTimeout(f, 240);
  };
  const row = (icon: ReactNode, label: string, sub: string | null, onClick: () => void, cls = "") => (
    <button className={`sd-row lg-press ${cls}`} onClick={onClick}>
      <span className="sd-ic">{icon}</span>
      <span className="sd-txt"><b>{label}</b>{sub && <small>{sub}</small>}</span>
      <LuChevronRight className="sd-go" aria-hidden />
    </button>
  );
  const board = props.work?.onBoard ?? props.onBoard;
  const s = props.scope;
  return (
    <>
      <div className={`scrim sd-scrim${out ? " out" : ""}`} onClick={close} />
      <aside className={`side-menu${out ? " out" : ""}`} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="sd-head">
          <span className="sd-where"><i aria-hidden />{props.space ? `In ${props.space}` : props.work ? "Public workspace" : "You're in the public void"}</span>
          <button className="sd-x" onClick={close} aria-label="Close menu"><LuX /></button>
        </div>
        <div className="sd-body">
          <button className="sd-send lg-press" onClick={go(props.onSend)}><LuArrowUp aria-hidden /><span><b>Send</b><small>files · folders · links</small></span></button>

          <div className="sd-list">
            {row(<LuOrbit />, props.space ?? "Spaces", props.space ? "your space · switch or leave" : "private rooms · search · create", go(props.onSpaces))}
            {row(<LuListChecks />, "Tasks", props.taskCount ? `${props.taskCount} open` : "assign · wire files", go(props.onTasks))}
            {board && row(<LuMessageSquareText />, "Notes board", "every note on one board", go(board))}
            {props.work
              ? row(theme === "light" ? <LuMoon /> : <LuSun />, theme === "light" ? "Dark mode" : "Light mode", "switch the theme", () => setTheme(theme === "light" ? "dark" : "light"))
              : row(<LuPalette />, "Style", "how files look", go(props.onStyle))}
          </div>

          <div className="sd-list">
            <Link className="sd-row sd-up lg-press" href="/upgrade" onClick={close}>
              <span className="sd-ic"><LuSparkles /></span>
              <span className="sd-txt"><b>Upgrade</b><small>Pro and Business plans</small></span>
              <LuChevronRight className="sd-go" aria-hidden />
            </Link>
            {props.work
              ? row(<LuOrbit />, "Switch to Classic", "the orbit look", () => window.location.assign("/"))
              : row(<LuBriefcase />, "Switch to Work", "the calm editor look", () => window.location.assign("/work"))}
            {!props.work && row(<LuCircleHelp />, "How it works", "drop · lock · beam · burn", go(props.onHow))}
            <Link className="sd-row lg-press" href="/about" onClick={close}>
              <span className="sd-ic"><LuInfo /></span>
              <span className="sd-txt"><b>About · Contact</b></span>
              <LuChevronRight className="sd-go" aria-hidden />
            </Link>
          </div>

          {s && (
            <>
              <span className="sd-sec">Show</span>
              <div className="sd-seg" role="radiogroup" aria-label="Show">
                <button role="radio" aria-checked={s.value === "all"} className={s.value === "all" ? "on" : ""} onClick={() => s.set("all")}><LuLayers aria-hidden />All</button>
                {s.near !== null && <button role="radio" aria-checked={s.value === "near"} className={s.value === "near" ? "on" : ""} onClick={() => s.set("near")}><LuWifi aria-hidden />Nearby{s.near ? ` ${s.near}` : ""}</button>}
                {s.mine > 0 && <button role="radio" aria-checked={s.value === "mine"} className={s.value === "mine" ? "on" : ""} onClick={() => s.set("mine")}><LuUser aria-hidden />Mine {s.mine}</button>}
              </div>
            </>
          )}
          <span className="sd-sec">File type</span>
          <div className="sd-kinds" role="radiogroup" aria-label="File type">
            {KINDS.map((k) => {
              const I = ICON[k.id];
              return <button key={k.id} role="radio" aria-checked={props.kind === k.id} className={props.kind === k.id ? "on" : ""} onClick={() => props.onKind(k.id)}><I aria-hidden />{k.id === "all" ? "All" : k.name}</button>;
            })}
          </div>
          <div className="sd-facts">
            <span><LuUserX aria-hidden />No login</span>
            <span><LuShieldCheck aria-hidden />Encrypted</span>
            <span><LuTimer aria-hidden />Burns in 5–30 min</span>
          </div>
        </div>
      </aside>
    </>
  );
}
