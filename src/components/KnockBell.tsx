"use client";
import { useEffect, useState } from "react";
import { BsIncognito } from "react-icons/bs";
import { answerKnock, knocksAt, type Knocker, type SpaceSession } from "@/lib/space";

/** Inside an anonymous space: someone typed its 4 letters. Let in hands them the invite, sealed to their one-time key. */
export default function KnockBell({ space, toast }: { space: SpaceSession; toast: (t: string) => void }) {
  const [knocks, setKnocks] = useState<Knocker[]>([]);
  const [done, setDone] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let live = true;
    let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const k = await knocksAt(space).catch(() => null);
      if (!live) return;
      if (k) setKnocks(k);
      t = setTimeout(tick, document.hidden ? 15_000 : 4_000);
    };
    tick();
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [space]);

  const answer = async (k: Knocker, allow: boolean) => {
    setDone((d) => new Set(d).add(k.id));
    try {
      await answerKnock(space, k, allow);
      toast(allow ? "Let in: they're stepping into the space" : "Turned away");
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const open = knocks.filter((k) => !done.has(k.id));
  if (!open.length) return null;
  return (
    <div className="knock-bell" role="alertdialog" aria-label="Someone is knocking">
      {open.slice(0, 3).map((k) => (
        <div key={k.id}>
          <BsIncognito aria-hidden />
          <span>Someone typed this space&apos;s code and is knocking</span>
          <button className="no lg-press" onClick={() => answer(k, false)}>No</button>
          <button className="in lg-press" onClick={() => answer(k, true)}>Let in</button>
        </div>
      ))}
    </div>
  );
}
