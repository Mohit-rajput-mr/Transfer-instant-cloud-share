# Generates the styles (skins) CSS block for globals.css. One entry per skin:
#   id: (shaped, shape-css for ::before, text-css, extra rules)
S = ":is(.sphere,.mball,.zsphere)"
T = ":is(.ext,.mball > span,.zext)"
R = ":is(.ring,.mring,.zring)"
H = "var(--h)"
def h(s, l, a=None): return f"hsl({H} {s}% {l}%{(' / '+str(a)) if a is not None else ''})"

SK = {
 # ---------------- professional ----------------
 "file": (True, f"inset:2% 16%; border-radius:8%; clip-path:polygon(0 0,70% 0,100% 22%,100% 100%,0 100%); background: linear-gradient(225deg,{h(30,78)} 0 50%,transparent 50%) top right/30% 22% no-repeat, linear-gradient({h(62,48)},{h(62,48)}) bottom/100% 26% no-repeat, linear-gradient(#fbfcfd,#e3e7ed);", "color:#1d2433; text-shadow:none;", ""),
 "folder": (True, f"inset:14% 4% 12%; border-radius:6%; clip-path:polygon(0 0,40% 0,48% 13%,100% 13%,100% 100%,0 100%); background: linear-gradient(transparent 13%, rgba(255,255,255,0.22) 13% 15%, transparent 15%), linear-gradient({h(62,64)},{h(58,46)});", "color:#fff; padding-top:10%;", ""),
 "card": (True, f"inset:10% 2%; border-radius:16%; background: linear-gradient({h(68,54)},{h(68,54)}) top/100% 24% no-repeat, linear-gradient(#ffffff,#eceef2); box-shadow:0 6px 18px rgba(0,0,0,0.35);", "color:#1f2430; text-shadow:none; padding-top:12%;", ""),
 "tile": (True, f"inset:6%; border-radius:12%; background: linear-gradient(160deg,{h(62,52)},{h(62,40)}); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18);", "color:#fff;", ""),
 "chart": (False, f"border-radius:50%; background: radial-gradient(circle,#14161b 0 47%,transparent 48%), conic-gradient({h(72,58)} 0 calc(var(--life,1) * 360deg),{h(22,28)} 0);", "color:#fff;", f"[data-skin=\"chart\"] {R}{{display:none}}"),
 "badge": (True, f"inset:2%; clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%); background: linear-gradient(160deg,{h(58,56)},{h(62,36)});", "color:#fff;", ""),
 "envelope": (True, f"inset:18% 2%; border-radius:6%; background: linear-gradient(to bottom right,transparent calc(50% - 1px),{h(30,70)} 50%,transparent calc(50% + 1px)) top left/50% 62% no-repeat, linear-gradient(to bottom left,transparent calc(50% - 1px),{h(30,70)} 50%,transparent calc(50% + 1px)) top right/50% 62% no-repeat, linear-gradient({h(55,52)},{h(55,52)}) left/6% 100% no-repeat, #f7f4ee;", "color:#2f2a22; text-shadow:none; padding-top:22%;", ""),
 "minimal": (False, f"border-radius:50%; border:2px solid {h(70,70)}; background: {h(60,50,0.08)};", f"color:{h(80,84)}; text-shadow:none;", ""),
 "graphite": (False, "border-radius:50%; background: radial-gradient(circle at 35% 30%,#8a8f99,#3a3e46 55%,#16181c);", "color:#fff;", f"[data-skin=\"graphite\"] :is(.ring,.mring,.zring) .life{{stroke:#e8e8e8}}"),
 # ---------------- clean ----------------
 "glass": (False, f"border-radius:50%; border:1px solid rgba(255,255,255,0.55); background: radial-gradient(circle at 30% 24%,rgba(255,255,255,0.6),rgba(255,255,255,0.08) 38%,transparent 60%), {h(70,60,0.22)}; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);", "color:#fff;", ""),
 "paper": (True, f"inset:6%; border-radius:12%; transform:rotate(-3deg); background: linear-gradient(90deg,{h(55,56)} 0 9%,transparent 9%), repeating-linear-gradient(transparent 0 17%,rgba(60,50,40,0.08) 17% 18%), #f3eee4; box-shadow:0 6px 14px rgba(0,0,0,0.35);", "color:#3a3229; text-shadow:none;", ""),
 "pebble": (True, f"inset:4%; border-radius:42%; background: radial-gradient(circle at 34% 28%,rgba(255,255,255,0.35),transparent 40%), linear-gradient(160deg,{h(34,70)},{h(30,46)}); box-shadow:0 8px 18px rgba(0,0,0,0.35);", "color:#fff;", ""),
 # ---------------- playful ----------------
 "neon": (False, f"border-radius:50%; background:#07080b; border:2px solid {h(100,62)}; box-shadow:0 0 14px {h(100,60)}, inset 0 0 14px {h(100,60,0.6)};", f"color:{h(100,78)}; text-shadow:0 0 10px {h(100,60)};", ""),
 "candy": (False, f"border-radius:50%; background: radial-gradient(circle at 32% 26%,rgba(255,255,255,0.85) 0 7%,transparent 22%), repeating-linear-gradient(45deg,{h(85,62)} 0 11%,#fff 11% 18%);", "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.8);", ""),
 "gem": (True, f"inset:0; clip-path:polygon(50% 2%,98% 38%,50% 98%,2% 38%); background: conic-gradient(from 0deg at 50% 38%,{h(95,78)},{h(85,46)},{h(95,82)},{h(75,34)},{h(95,72)},{h(85,50)},{h(95,78)});", "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.7); padding-bottom:12%;", ""),
 "star": (True, f"inset:-2%; clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%); background: radial-gradient(circle at 42% 38%,{h(95,80)},{h(88,52)} 70%);", "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.7); padding-top:6%;", ""),
 "planet": (False, f"border-radius:50%; background: radial-gradient(circle at 34% 28%,rgba(255,255,255,0.35),transparent 45%), repeating-linear-gradient(12deg,{h(62,60)} 0 11%,{h(55,48)} 11% 19%,{h(70,66)} 19% 25%); box-shadow: inset -10px -12px 22px rgba(0,0,0,0.5);", "color:#fff;", f"[data-skin=\"planet\"] :is(.halo,.zhalo){{display:block; inset:34% -12%; border-radius:50%; border:3px solid {h(70,82,0.75)}; border-left-color:transparent; transform:rotate(-16deg); animation:none}}"),
 "fire": (False, "border-radius:50% 50% 46% 46% / 58% 58% 42% 42%; background: radial-gradient(circle at 50% 72%,#fff6c2 0 10%,#ffc04d 28%,#ff6a1a 56%,#a8200a 82%,#3b0802);", "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.7);", ""),
 "bubble": (False, f"border-radius:50%; border:1px solid rgba(255,255,255,0.65); background: radial-gradient(circle at 30% 24%,rgba(255,255,255,0.9) 0 5%,transparent 16%), radial-gradient(circle,transparent 52%,rgba(255,255,255,0.18) 72%,rgba(255,255,255,0.5) 100%), conic-gradient(from 30deg,rgba(255,120,200,0.32),rgba(120,200,255,0.32),rgba(160,255,170,0.32),rgba(255,240,120,0.32),rgba(255,120,200,0.32));", "color:#fff;", ""),
 # ---------------- kids ----------------
 "buddy": (False, f"border-radius:50%; background: radial-gradient(circle at 36% 40%,#1b1b1b 0 5.5%,transparent 6%), radial-gradient(circle at 64% 40%,#1b1b1b 0 5.5%,transparent 6%), radial-gradient(circle at 34% 37%,#fff 0 1.8%,transparent 2.2%), radial-gradient(circle at 62% 37%,#fff 0 1.8%,transparent 2.2%), radial-gradient(circle at 24% 56%,rgba(255,110,150,0.55) 0 7%,transparent 8%), radial-gradient(circle at 76% 56%,rgba(255,110,150,0.55) 0 7%,transparent 8%), radial-gradient(circle at 36% 30%,{h(85,76)},{h(80,58)} 70%);", "color:#1b1b1b; text-shadow:none; padding-top:42%;", ""),
 "balloon": (True, f"inset:2% 16% 18%; border-radius:50% 50% 47% 47% / 55% 55% 45% 45%; background: radial-gradient(circle at 34% 28%,rgba(255,255,255,0.75) 0 7%,transparent 20%), radial-gradient(circle at 50% 50%,{h(88,62)},{h(80,46)} 80%);", "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.6); padding-bottom:14%;", ""),
 "cloud": (True, f"inset:6% 0; background: radial-gradient(circle at 30% 62%,{h(80,94)} 0 22%,transparent 23%), radial-gradient(circle at 52% 44%,{h(80,94)} 0 29%,transparent 30%), radial-gradient(circle at 74% 60%,{h(80,94)} 0 21%,transparent 22%), linear-gradient({h(80,94)},{h(80,94)}) 50% 76%/66% 26% no-repeat; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.3));", f"color:{h(55,32)}; text-shadow:none; padding-top:16%;", ""),
 "blocks": (True, f"inset:8%; border-radius:16%; background: radial-gradient(circle at 30% 26%,rgba(255,255,255,0.4) 0 9%,transparent 10%), radial-gradient(circle at 70% 26%,rgba(255,255,255,0.4) 0 9%,transparent 10%), {h(85,55)}; box-shadow: inset 0 -7px 0 {h(70,38)}, 0 5px 0 {h(70,28)};", "color:#fff; text-shadow:0 2px 0 rgba(0,0,0,0.35); padding-top:12%;", ""),
 # ---------------- aesthetic ----------------
 "heart": (True, f"inset:0; clip-path:polygon(50% 94%,13% 58%,4% 40%,5% 23%,14% 11%,28% 6%,41% 9%,50% 20%,59% 9%,72% 6%,86% 11%,95% 23%,96% 40%,87% 58%); background: radial-gradient(circle at 34% 28%,{h(95,88)},{h(82,62)} 62%);", "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.5); padding-bottom:10%;", ""),
 "flower": (True, f"inset:0; background: radial-gradient(circle at 50% 50%,{h(92,62)} 0 17%,transparent 18%), radial-gradient(circle at 50% 22%,{h(75,86)} 0 21%,transparent 22%), radial-gradient(circle at 77% 41%,{h(75,86)} 0 21%,transparent 22%), radial-gradient(circle at 67% 75%,{h(75,86)} 0 21%,transparent 22%), radial-gradient(circle at 33% 75%,{h(75,86)} 0 21%,transparent 22%), radial-gradient(circle at 23% 41%,{h(75,86)} 0 21%,transparent 22%);", "color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.7);", ""),
 "marble": (False, f"border-radius:50%; background: linear-gradient(118deg,transparent 38%,rgba(255,255,255,0.55) 43%,transparent 48%), linear-gradient(32deg,transparent 58%,{h(25,60,0.35)} 62%,transparent 66%), radial-gradient(circle at 70% 72%,{h(30,72,0.6)},transparent 52%), linear-gradient(160deg,#f6f3ee,#d6d0c6);", f"color:{h(25,28)}; text-shadow:none;", ""),
 "pastel": (False, f"border-radius:50%; background: radial-gradient(circle at 34% 28%,rgba(255,255,255,0.6),transparent 42%), {h(75,84)}; box-shadow:0 8px 20px {h(60,50,0.35)};", f"color:{h(40,30)}; text-shadow:none;", ""),
 "moon": (False, "border-radius:50%; background: radial-gradient(circle at 62% 34%,rgba(0,0,0,0.14) 0 9%,transparent 10%), radial-gradient(circle at 36% 64%,rgba(0,0,0,0.12) 0 12%,transparent 13%), radial-gradient(circle at 68% 70%,rgba(0,0,0,0.1) 0 6%,transparent 7%), radial-gradient(circle at 30% 28%,#fbf8ea,#cfcab8 58%,#8e8a78);", "color:#3a382f; text-shadow:none;", ""),
 "polaroid": (True, f"inset:2% 12%; transform:rotate(-4deg); background: linear-gradient(160deg,{h(65,62)},{h(70,34)}) 50% 9%/84% 64% no-repeat, #fbfbf7; box-shadow:0 8px 16px rgba(0,0,0,0.4);", "color:#2a2a2a; text-shadow:none; padding-top:66%;", ""),
 "sticky": (True, f"inset:8%; transform:rotate(3deg); background: linear-gradient(transparent 0 84%,rgba(0,0,0,0.06) 84%), linear-gradient({h(95,80)},{h(90,70)}); box-shadow:0 10px 14px rgba(0,0,0,0.38);", f"color:{h(60,20)}; text-shadow:none;", ""),
 # ---------------- retro ----------------
 "pixel": (True, f"inset:4%; clip-path:polygon(20% 0,80% 0,80% 10%,90% 10%,90% 20%,100% 20%,100% 80%,90% 80%,90% 90%,80% 90%,80% 100%,20% 100%,20% 90%,10% 90%,10% 80%,0 80%,0 20%,10% 20%,10% 10%,20% 10%); background: linear-gradient(rgba(255,255,255,0.45),rgba(255,255,255,0.45)) 20% 20%/20% 10% no-repeat, linear-gradient(rgba(0,0,0,0.25),rgba(0,0,0,0.25)) 80% 80%/20% 10% no-repeat, {h(78,55)};", "color:#fff; font-family:var(--mono); text-shadow:2px 2px 0 rgba(0,0,0,0.5);", ""),
 "vinyl": (False, f"border-radius:50%; background: radial-gradient(circle,#0b0b0b 0 3%,{h(70,56)} 3.5% 30%,#111 31% 33%,transparent 34%), repeating-radial-gradient(circle,#151515 0 1.5%,#252525 1.5% 3%); animation: spin 6s linear infinite;", "color:#fff;", ""),
 "sunset": (False, f"border-radius:50%; background: linear-gradient(transparent 56%,#0d0b1a 56% 59%,transparent 59% 65%,#0d0b1a 65% 68%,transparent 68% 74%,#0d0b1a 74% 76%,transparent 76%), linear-gradient(#ffd25e,#ff7a59 46%,{h(80,46)});", "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.6);", ""),
 "chrome": (False, f"border-radius:50%; background: linear-gradient({h(80,60,0.28)},{h(80,60,0.28)}), linear-gradient(180deg,#ffffff 0%,#a4aab3 40%,#3a3e46 50%,#cfd4dc 60%,#ffffff 100%);", "color:#111; text-shadow:0 1px 0 rgba(255,255,255,0.8);", ""),
 # ---------------- easy to see ----------------
 "big": (False, f"border-radius:50%; background:#fff; border:5px solid {h(85,42)};", "color:#000; text-shadow:none; font-size:calc(var(--s) * var(--k) * 0.18);",
   "[data-skin=\"big\"] .orb-label{font-size:16px; max-width:240px} [data-skin=\"big\"] .orb-meta{font-size:12px; color:#e6e6e6} [data-skin=\"big\"] :is(.ring,.mring,.zring) circle{stroke-width:3} [data-skin=\"big\"] .mname{font-size:calc(var(--md) * 0.2 + 3px)}"),
}

out = ["", "/* ================= Styles: how a dropped object looks (picked by the visitor; see src/lib/skins.ts) =================",
       "   Every style draws the object on the ball element's ::before; the ball element itself turns transparent. Styles with",
       "   a shape that is not a circle swap the lifetime ring for a bar under the shape (::after). Generated by a script. */",
       f"[data-skin] :is(.sphere,.mball,.zsphere,.ext) {{ --h: var(--hue); }}",
       f"[data-skin] :is(.mball,.zsphere) {{ --h: var(--sh); }}",
       f"[data-skin]:not([data-skin=\"orbit\"]) {S} {{ background: none; box-shadow: none; border-radius: 0; }}",
       f"[data-skin]:not([data-skin=\"orbit\"]) {S}::before {{ content: \"\"; position: absolute; inset: 0; z-index: 0; pointer-events: none; transition: transform 0.3s var(--spring); }}",
       f"[data-skin]:not([data-skin=\"orbit\"]) :is(.halo,.zhalo) {{ display: none; }}",
       f"[data-skin]:not([data-skin=\"orbit\"]) {T} {{ z-index: 1; }}",
       f"[data-skin]:not([data-skin=\"orbit\"]) .zext {{ position: relative; }}",
       f"[data-skin]:not([data-skin=\"orbit\"]) .orb.mine .sphere::before {{ outline: 2px solid rgba(255,255,255,0.85); outline-offset: 3px; }}",
       # calm motion for serious styles
       "[data-tone=\"calm\"] .orb { --drift: 0.25; }",
       "[data-tone=\"calm\"] .blob, [data-tone=\"calm\"] .blob.big { -webkit-backdrop-filter: none; backdrop-filter: none; background: rgba(20,22,28,0.88); border: 1px solid rgba(255,255,255,0.14); box-shadow: 0 12px 30px rgba(0,0,0,0.45); }",
       "[data-tone=\"calm\"] .blob::after { display: none; }",
       "[data-tone=\"calm\"] .member { animation: none; }",
      ]
bar = (f"content: \"\"; position: absolute; left: 22%; right: 22%; bottom: -14%; height: 4px; border-radius: 4px; z-index: 1; pointer-events: none; opacity: 1; animation: none; box-shadow: none;"
       f" background: linear-gradient(90deg, var(--bar, {h(85,72)}) calc(var(--life, 1) * 100%), rgba(255,255,255,0.16) 0);")
for k, (shaped, shape, text, extra) in SK.items():
    out.append(f"[data-skin=\"{k}\"] {S}::before {{ {shape} }}")
    out.append(f"[data-skin=\"{k}\"] {T} {{ {text} }}")
    if shaped:
        out.append(f"[data-skin=\"{k}\"] {R} {{ display: none; }}")
        out.append(f"[data-skin=\"{k}\"] {S}::after {{ {bar} }}")
        out.append(f"[data-skin=\"{k}\"] .orb.dying .sphere::after {{ --bar: var(--danger); }}")
    if extra: out.append(extra)
out.append("@media (prefers-reduced-motion: reduce) { [data-skin=\"vinyl\"] :is(.sphere,.mball,.zsphere)::before { animation: none; } }")
print("\n".join(out))
import json
pass
