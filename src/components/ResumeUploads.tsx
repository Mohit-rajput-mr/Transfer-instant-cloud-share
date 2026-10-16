"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { LuCheck, LuUpload } from "react-icons/lu";
import { dropPending, pendingUploads, resumeCopy, sameFile, useCloud, type PendingUpload } from "@/lib/cloud";
import { CHUNK } from "@/lib/crypto";
import { hold } from "@/lib/p2p";
import { dropOwnerKey, formatBytes } from "@/lib/client";

// Big uploads that were cut off by closing the page (or a crash): the object is still in orbit and R2
// keeps the parts that made it. Picking the same file again sends only what is missing.

let list: PendingUpload[] = [];
let loaded = false;
const subs = new Set<() => void>();
const emit = (next: PendingUpload[]) => {
  list = next;
  subs.forEach((f) => f());
};
const drop = (id: string) => emit(list.filter((u) => u.id !== id));

async function load() {
  if (loaded || typeof indexedDB === "undefined") return;
  loaded = true;
  const all = await pendingUploads();
  // only the ones still in orbit (asking also keeps them alive a while longer)
  const live = await Promise.all(
    all.map(async (u) => {
      const r = await fetch(`/api/transfers/${u.id}/store`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner: u.owner, action: "alive" }) }).catch(() => null);
      const ok = r?.ok ? (await r.json().catch(() => null))?.ok !== false : r ? false : true;
      if (!ok) dropPending(u.id);
      return ok ? u : null;
    }),
  );
  emit(live.filter((u): u is PendingUpload => !!u));
}

export function usePendingCount() {
  useEffect(() => void load(), []);
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => list.length,
    () => 0,
  );
}

export default function ResumeUploads() {
  const items = useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => list,
    () => list,
  );
  if (!items.length) return null;
  return (
    <>
      {items.map((u) => (
        <ResumeItem key={u.id} u={u} />
      ))}
    </>
  );
}

function ResumeItem({ u }: { u: PendingUpload }) {
  const cloud = useCloud().get(u.id);
  const input = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  const hue = { "--hue": (u.id.charCodeAt(0) * 37) % 360 } as CSSProperties;

  useEffect(() => {
    if (cloud?.state !== "saved") return;
    const t = setTimeout(() => drop(u.id), 6000);
    return () => clearTimeout(t);
  }, [cloud?.state, u.id]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!sameFile(u, f)) {
      setErr(`That isn't ${u.fileName} (${formatBytes(u.size)}). Pick the same file.`);
      return;
    }
    setErr("");
    // this device sends it directly again too, while the rest uploads
    hold(u.id, f, u.key, u.nonce, CHUNK, 30 * 60_000);
    void resumeCopy(u, f);
  };
  const discard = () => {
    fetch(`/api/transfers/${u.id}`, { method: "DELETE", headers: { "x-owner": u.owner } }).catch(() => {});
    dropOwnerKey(u.id);
    dropPending(u.id);
    drop(u.id);
  };

  const busy = cloud?.state === "saving" || cloud?.state === "paused";
  return (
    <div className="dock-item lg resume" style={hue}>
      <i className={`dock-dot${busy ? " live" : ""}`} />
      <div className="dock-main">
        <b className="ellip">{u.label}</b>
        <span className="mono">
          {cloud?.state === "saved" ? (
            <span className="dock-cloud ok">Finished <LuCheck className="ic-inline" /> safe to close</span>
          ) : cloud?.state === "saving" ? (
            `Resumed · ${Math.round(cloud.frac * 100)}%${cloud.speed ? ` · ${cloud.speed}` : ""}, keep open`
          ) : cloud?.state === "paused" ? (
            `Paused at ${Math.round(cloud.frac * 100)}%, waiting for the network`
          ) : cloud?.state === "failed" ? (
            "Couldn't finish it. Try again."
          ) : (
            `Upload stopped · ${formatBytes(u.size)}. Pick the same file to finish.`
          )}
        </span>
        {busy && <span className="dock-bar"><i style={{ transform: `scaleX(${Math.max(0.03, cloud!.frac)})` }} /></span>}
        {err && <span className="mono err-line">{err}</span>}
      </div>
      {!busy && cloud?.state !== "saved" && (
        <>
          <input ref={input} type="file" hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
          <button className="pill lg-press solid" onClick={() => input.current?.click()}><LuUpload aria-hidden /> Finish</button>
          <button className="dock-x lg-press" aria-label="Discard" title="Discard" onClick={discard}>×</button>
        </>
      )}
    </div>
  );
}
