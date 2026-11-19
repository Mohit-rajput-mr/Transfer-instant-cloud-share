// Work light-mode contrast scan (owner 2026-11-19): `next start -p 3311`, then `node scripts/contrast-scan.cjs`.
// Lists every visible text whose WCAG contrast against what is behind it is under 3, per Work panel.
const { chromium } = require('playwright');
// every visible text element: its colour against the first opaque background behind it; flag WCAG contrast < 3
const scan = () => {
  const lum = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b] = m.slice(0, 3).map((v) => { v = v / 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return { L: .2126 * r + .7152 * g + .0722 * b, a: m[3] === undefined ? 1 : +m[3] }; };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); const c = lum(cs.backgroundColor); if (c && c.a > .6) return c.L; if (cs.backgroundImage && cs.backgroundImage.includes('gradient') && e !== document.body) { const m = cs.backgroundImage.match(/rgba?\([^)]*\)/); if (m) { const g = lum(m[0]); if (g && g.a > .6) return g.L; } } } return lum(getComputedStyle(document.body).backgroundColor).L; };
  const out = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) return;
    const fg = lum(cs.color); if (!fg || fg.a < .3) return;
    const b = bgOf(el); const hi = Math.max(fg.L, b), lo = Math.min(fg.L, b); const ratio = (hi + .05) / (lo + .05);
    if (ratio < 3) out.push(`${ratio.toFixed(1)}  ${el.tagName.toLowerCase()}.${(el.className && el.className.baseVal === undefined ? el.className : '').toString().split(' ').slice(0, 2).join('.')}  "${el.textContent.trim().slice(0, 40)}"`);
  });
  return [...new Set(out)];
};
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 850 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('orbit:work-theme', 'light'); } catch {} });
  const now = Date.now(), iso = (t) => new Date(t).toISOString();
  const items = [{ id: 'mine234', name: 'screenshot', fileName: 's.png', mime: 'image/png', size: 64500, salt: 'c2FsdA', iterations: 600000, hue: 230, status: 'ready', netHash: null, area: null, maxDownloads: null, downloads: 4, devices: 1, views: 12, watchers: 1, by: 'jigsaw', space: null, life: 30, open: true, from: 'ab12cd34ef', groupName: null, skin: null, thumb: false, task: null, anon: false, createdAt: iso(now - 60000), expiresAt: iso(now + 25 * 60000), verified: true, byHue: 140 }];
  await ctx.addInitScript(() => { try { localStorage.setItem('orbit:own:mine234', 'a'.repeat(64)); } catch {} });
  const list = (r) => r.fulfill({ json: { items, online: 1, bubbles: [], tasks: [], now: Date.now() } });
  await ctx.route('**/api/transfers?**', list); await ctx.route('**/api/transfers', (r) => r.request().method() === 'GET' ? list(r) : r.continue());
  const p = await ctx.newPage();
  await p.goto('http://localhost:3311/work'); await p.waitForTimeout(4000);
  for (let i = 0; i < 3 && await p.locator('.pop-scrim, .scrim').count(); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
  const screens = [['canvas', null], ['anonymous', '[title="Stay anonymous"]'], ['spaces', '[title="Spaces"]'], ['tasks', '[title="Tasks"]'], ['notes', '[title="Notes board"]'], ['share', '[title="Share this workspace"]']];
  for (const [name, sel] of screens) {
    if (sel) { const l = p.locator(sel).first(); if (!(await l.count())) { console.log(`-- ${name}: control not found`); continue; } await l.click({ force: true }).catch(() => {}); await p.waitForTimeout(900); }
    const bad = await p.evaluate(scan);
    console.log(`-- ${name}: ${bad.length} low-contrast`); bad.slice(0, 14).forEach((x) => console.log('   ', x));
    await p.screenshot({ path: `/tmp/claude-0/light-${name}.png` });
    if (sel) { await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
  }
  await b.close();
})();
