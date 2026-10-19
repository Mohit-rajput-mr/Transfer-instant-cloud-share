"use client";
import { useEffect, useRef, useState } from "react";
import { LuSmile } from "react-icons/lu";

// A small emoji picker like a chat app's: a smiley button by the text box opens a grid in tabs; recent ones first.
const SETS: [string, string][] = [
  ["Smileys", "😀😃😄😁😆😅🤣😂🙂🙃😉😊😇🥰😍🤩😘😋😛😜🤪😝🤑🤗🤭🤫🤔🤐🤨😐😑😶😏😒🙄😬😮‍💨🤥😌😔😪😴😷🤒🤕🤢🤮🥵🥶🥴😵🤯🤠🥳😎🤓🧐😕😟🙁😮😯😲😳🥺😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈💀💩🤡👻👽🤖"],
  ["Hands", "👍👎👌🤌🤏✌️🤞🤟🤘🤙👈👉👆👇☝️✋🤚🖐️🖖👋🤝🙏✍️💪👏🙌👐🤲🫶👀🧠"],
  ["Hearts", "❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝💯💢💥💫💦💨🔥✨⭐🌟⚡🎉🎊"],
  ["Objects", "📁📂📄📃📑📊📈📉📎🖇️📌📍✂️🖊️✏️📝💼🗂️🗃️🗄️🔒🔓🔑🧾📦📮📬📅📆⏰⏳⌛💻🖥️📱⌨️🖨️💾💿📷🎥📞☎️💡🔋🔌💰💳🏠🏢🚗✈️🚀☕🍕🎂🎁"],
  ["Symbols", "✅☑️✔️❌❎⚠️🚫⛔❓❗‼️⁉️➕➖➗✖️💲♻️🔁🔂▶️⏸️⏹️⏺️⏭️⏮️🔼🔽⬆️⬇️⬅️➡️↩️↪️🆗🆕🆓🆙🆒🔴🟠🟡🟢🔵🟣⚫⚪"],
];
const split = (s: string) =>
  typeof Intl.Segmenter === "function" ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s), (x) => x.segment) : Array.from(s.replace(/\uFE0F|\u200D/g, ""));
const RECENT = "orbit:emoji-recent";
const recent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT) || "[]");
  } catch {
    return [];
  }
};

export default function EmojiPicker(props: { onPick: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [mine, setMine] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setMine(recent());
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), setOpen(false));
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc, true);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc, true);
    };
  }, [open]);
  const pick = (e: string) => {
    props.onPick(e);
    const next = [e, ...recent().filter((x) => x !== e)].slice(0, 24);
    try {
      localStorage.setItem(RECENT, JSON.stringify(next));
    } catch {}
    setMine(next);
  };
  const tabs: [string, string[]][] = [...(mine.length ? [["Recent", mine] as [string, string[]]] : []), ...SETS.map(([n, s]) => [n, split(s)] as [string, string[]])];
  const cur = tabs[Math.min(tab, tabs.length - 1)];
  return (
    <div className="emoji" ref={box}>
      <button type="button" className={`emoji-btn lg-press${open ? " on" : ""}`} onClick={() => setOpen((o) => !o)} aria-label="Emoji" aria-expanded={open} title="Emoji">
        <LuSmile aria-hidden />
      </button>
      {open && (
        <div className="emoji-pop" role="dialog" aria-label="Pick an emoji">
          <div className="emoji-tabs" role="tablist">
            {tabs.map(([n], i) => (
              <button key={n} type="button" role="tab" aria-selected={cur[0] === n} className={cur[0] === n ? "on" : ""} onClick={() => setTab(i)}>{n}</button>
            ))}
          </div>
          <div className="emoji-grid">
            {cur[1].map((e, i) => (
              <button key={`${e}${i}`} type="button" onClick={() => pick(e)} aria-label={e}>{e}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
