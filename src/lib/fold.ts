// The Classic bar folds itself only as far as it must: it tries each fold level (0 = everything on one line) and keeps
// the first one where logo, middle and icons fit side by side without touching. The last level always fits (the
// middle gets its own row), so nothing ever slides under anything else, whatever the counts, names or window width.
export const FOLDS = 3;

/** the lowest level that fits; `fits(level)` applies the level and measures */
export function pickFold(fits: (level: number) => boolean, max = FOLDS) {
  for (let l = 0; l < max; l++) if (fits(l)) return l;
  return max;
}

/** apply a level as data-fold (an attribute React never rewrites, unlike className) */
export function setFold(el: HTMLElement, level: number) {
  el.dataset.fold = String(level);
}

/** whether the bar's row holds its three parts side by side (natural widths, with the row's column gap) */
export function rowFits(row: HTMLElement) {
  const parts = [...row.children].filter((c) => (c as HTMLElement).offsetParent !== null) as HTMLElement[];
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
  const need = parts.reduce((s, c) => s + c.scrollWidth, 0) + gap * Math.max(0, parts.length - 1);
  return need <= row.clientWidth + 0.5;
}
