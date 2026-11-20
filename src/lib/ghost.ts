// Ghost World (owner 2026-11-20): one worldwide room only anonymous people are in, separate from the open void.
// Under the hood an anonymous space with a fixed slug that never closes and has no passcode (migration 044). What
// ghosts send there is only seen there; the open void never lists it, and ghosts never see the open void.
export const GHOST = "anon-0-ghost";
export const GHOST_TITLE = "Ghost World";
// its "open" objects need a content key like any anonymous space; every ghost may open them, so it is a fixed one
// (what is sent there is as public as the open void, but only to ghosts)
export const GHOST_KEY = "R2hvc3RXb3JsZC1PcmJpdA";
export const isGhost = (slug: string | null | undefined) => slug === GHOST;
