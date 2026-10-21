"use client";
import { useEffect, useRef, type RefObject } from "react";

// Every modal card (Pop, Drawer, the phone menu) shares one stack: only the top one hears Escape and holds the
// keyboard (focus goes in on open, Tab stays inside), and on close focus goes back to what opened it. Non-modal
// layers (the New task box, the Send menu) ask dialogOpen() first, so one Escape closes one thing.
const stack: object[] = [];
export const dialogOpen = () => stack.length > 0;
export function pushDialog(id: object) {
  stack.push(id);
  return () => {
    const i = stack.lastIndexOf(id);
    if (i >= 0) stack.splice(i, 1);
  };
}
export const isTop = (id: object) => stack[stack.length - 1] === id;

/** where Tab goes inside a dialog of n controls with focus on index i (-1: not on one): an index when it must wrap
 *  (or come back in), -1 when the browser's own next step is right */
export function wrapIndex(i: number, n: number, back: boolean) {
  if (n <= 0) return -1;
  if (i < 0) return back ? n - 1 : 0;
  if (back) return i === 0 ? n - 1 : -1;
  return i === n - 1 ? 0 : -1;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const focusables = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0 && !el.closest('[inert],[aria-hidden="true"]'));

// what had focus before the current element (an autoFocus in a new card moves focus before its effect runs)
let before: Element | null = null;
let current: Element | null = null;
if (typeof document !== "undefined")
  document.addEventListener("focusin", (e) => {
    if (e.target === current) return;
    before = current;
    current = e.target as Element;
  }, true);

/** a modal card: focus in (what autoFocus picked, else the card itself), Tab trapped, Escape → onEscape (top card
 *  only), focus back to the trigger on close. The element needs tabIndex={-1}. */
export function useDialog(ref: RefObject<HTMLElement | null>, onEscape: () => void) {
  const esc = useRef(onEscape);
  useEffect(() => {
    esc.current = onEscape;
  }, [onEscape]);
  useEffect(() => {
    const id = {};
    const drop = pushDialog(id);
    // read at each use: a card may swap its root element (the viewer: loading → the file)
    const box = () => ref.current;
    const el0 = box();
    const act = document.activeElement;
    // an autoFocus inside already took focus during the commit: the trigger is the one focused before it
    const inside = !!el0 && el0.contains(act);
    const was = inside ? before : act;
    const back = was instanceof HTMLElement && was !== document.body ? was : null;
    if (el0 && !inside) el0.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      const el = box();
      if (!isTop(id) || !el) return;
      if (e.key === "Escape") {
        e.preventDefault();
        esc.current();
      } else if (e.key === "Tab") {
        const list = focusables(el);
        const t = wrapIndex(list.indexOf(document.activeElement as HTMLElement), list.length, e.shiftKey);
        if (!list.length) {
          e.preventDefault();
          el.focus({ preventScroll: true });
        } else if (t >= 0) {
          e.preventDefault();
          list[t].focus();
        }
      }
    };
    // capture: the top card hears it before any layer under it
    window.addEventListener("keydown", key, true);
    return () => {
      drop();
      window.removeEventListener("keydown", key, true);
      // back to the button that opened it (if it is still there and focus didn't move on to something else)
      const now = document.activeElement;
      if (back && back.isConnected && (!now || now === document.body || !now.isConnected)) back.focus({ preventScroll: true });
    };
  }, [ref]);
}
