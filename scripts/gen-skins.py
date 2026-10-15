# Generates the "Styles" block at the end of src/app/globals.css (how a dropped object looks).
#   python3 scripts/gen-skins.py > /tmp/skins.css   then replace the block between the two marker comments.
# Every style paints the object on the ball element's ::before (the element itself turns transparent), lit like a
# real thing: a specular highlight, a body that darkens away from the light, a rim of bounced light and a soft
# shadow. Only styles that are flat on purpose (Pixel, Blocky) stay 2D. Colour schemes (data-pal) recolour or
# desaturate whatever style is on. CSS only: no blur filters, nothing that repaints every frame.
S = ":is(.sphere,.mball,.zsphere)"
T = ":is(.ext,.mball > span,.zext)"
R = ":is(.ring,.mring,.zring)"
H = "var(--h)"


def h(s, l, a=None):
    return f"hsl({H} {s}% {l}%{(' / ' + str(a)) if a is not None else ''})"


SPEC = "radial-gradient(circle at 31% 24%, rgba(255,255,255,0.92) 0, rgba(255,255,255,0.38) 8%, transparent 27%)"
SOFT = "radial-gradient(ellipse 62% 38% at 42% 16%, rgba(255,255,255,0.5), transparent 72%)"
SHADE = "radial-gradient(circle at 36% 30%, transparent 46%, rgba(0,0,0,0.42) 86%, rgba(0,0,0,0.6) 100%)"
IN3D = "inset -8px -10px 18px rgba(0,0,0,0.45), inset 5px 6px 12px rgba(255,255,255,0.16)"
BEVEL = "inset 0 1.5px 0 rgba(255,255,255,0.65), inset 0 -4px 8px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(0,0,0,0.12)"
DROP = "drop-shadow(0 7px 9px rgba(0,0,0,0.5))"


def ball(s1, l1, s2, l2, s3, l3):
    return f"radial-gradient(circle at 40% 34%, {h(s1, l1)}, {h(s2, l2)} 46%, {h(s3, l3)} 82%, #050505 100%)"


def rim():
    return f"radial-gradient(circle at 70% 84%, {h(80, 76, 0.42)}, transparent 38%)"


def metal(stops, ink, shadow="rgba(255,255,255,0.55)"):
    cg = ", ".join(stops)
    return (False, f"border-radius:50%; background: {SPEC}, conic-gradient(from 200deg at 50% 50%, {cg}); box-shadow: {IN3D}, inset 0 0 0 1px rgba(255,255,255,0.25);",
            f"color:{ink}; text-shadow:0 1px 0 {shadow};", "", False)


# id: (shaped, ::before css, text css, extra rules, drop shadow on the element)
SK = {
    # ---------------- office ----------------
    "file": (True, f"inset:2% 16%; border-radius:7%; clip-path:polygon(0 0,70% 0,100% 22%,100% 100%,0 100%); background: linear-gradient(225deg,#c9ced6 0 50%,transparent 50%) top right/30% 22% no-repeat, radial-gradient(ellipse 80% 40% at 30% 10%,rgba(255,255,255,0.9),transparent 70%), linear-gradient(180deg,{h(70, 60)},{h(70, 40)}) bottom/100% 27% no-repeat, linear-gradient(105deg,#ffffff,#eef1f5 55%,#d6dbe2);",
             "color:#1d2433; text-shadow:0 1px 0 rgba(255,255,255,0.8);", "", True),
    "folder": (True, f"inset:14% 4% 12%; border-radius:7%; clip-path:polygon(0 0,40% 0,48% 13%,100% 13%,100% 100%,0 100%); background: {SOFT}, linear-gradient(transparent 13%, rgba(255,255,255,0.45) 13% 14.5%, transparent 15%), linear-gradient(180deg,{h(66, 70)},{h(60, 52)} 55%,{h(62, 36)});",
               "color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.5); padding-top:10%;", "", True),
    "card": (True, f"inset:10% 2%; border-radius:16%; background: linear-gradient(180deg,{h(72, 62)},{h(72, 44)}) top/100% 25% no-repeat, linear-gradient(180deg,#ffffff,#e8ebf0 70%,#d5d9e0); box-shadow: {BEVEL}, 0 8px 18px rgba(0,0,0,0.45);",
             "color:#1f2430; text-shadow:0 1px 0 rgba(255,255,255,0.9); padding-top:12%;", "", False),
    "tile": (True, f"inset:6%; border-radius:16%; background: {SOFT}, linear-gradient(160deg,{h(66, 60)},{h(64, 42)} 60%,{h(66, 30)}); box-shadow: {BEVEL}, 0 8px 18px rgba(0,0,0,0.45);",
             "color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.45);", "", False),
    "chart": (False, f"border-radius:50%; background: radial-gradient(circle,#0c0d11 0 40%,#2a2d35 46%,transparent 47%), radial-gradient(circle at 36% 28%,rgba(255,255,255,0.45),transparent 48%), conic-gradient({h(74, 58)} 0 calc(var(--life,1) * 360deg),{h(20, 30)} 0); box-shadow: {IN3D}, 0 6px 14px rgba(0,0,0,0.4);",
              "color:#fff;", f"[data-skin=\"chart\"] {R}{{display:none}}", False),
    "badge": (True, f"inset:2%; clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%); background: radial-gradient(ellipse 70% 40% at 38% 18%,rgba(255,255,255,0.55),transparent 70%), conic-gradient(from 200deg,{h(55, 70)},{h(60, 38)},{h(55, 64)},{h(65, 28)},{h(55, 70)});",
              "color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.6);", "", True),
    "envelope": (True, f"inset:18% 2%; border-radius:6%; background: linear-gradient(to bottom right,transparent calc(50% - 1px),rgba(0,0,0,0.18) 50%,transparent calc(50% + 2px)) top left/50% 62% no-repeat, linear-gradient(to bottom left,transparent calc(50% - 1px),rgba(0,0,0,0.18) 50%,transparent calc(50% + 2px)) top right/50% 62% no-repeat, linear-gradient({h(60, 52)},{h(60, 52)}) left/5% 100% no-repeat, linear-gradient(180deg,#fdfbf7,#efe9df 70%,#ddd5c7); box-shadow: {BEVEL}, 0 8px 16px rgba(0,0,0,0.42);",
                 "color:#2f2a22; text-shadow:0 1px 0 rgba(255,255,255,0.8); padding-top:22%;", "", False),
    "ring": (False, f"border-radius:50%; background: radial-gradient(circle at 36% 28%,rgba(255,255,255,0.7) 0,transparent 22%), radial-gradient(circle,transparent 0 54%,{h(55, 24)} 55%,{h(70, 72)} 64%,{h(60, 46)} 72%,{h(55, 20)} 79%,transparent 80%);",
             f"color:{h(80, 84)}; text-shadow:0 1px 2px rgba(0,0,0,0.6);", f"[data-skin=\"ring\"] {R}{{display:none}}", True),
    "graphite": (False, f"border-radius:50%; background: {SPEC}, radial-gradient(circle at 40% 34%,#8d929c,#3c4048 50%,#15171b 86%,#050505); box-shadow: {IN3D};",
                 "color:#fff;", f"[data-skin=\"graphite\"] {R} .life{{stroke:#e8e8e8}}", False),
    # ---------------- materials (real things) ----------------
    "gold": metal(["#fff3bf", "#d9a93a 16%", "#8c6514 30%", "#f6d77c 48%", "#b3821f 64%", "#6e4c0e 80%", "#fff3bf"], "#3b2a05"),
    "silver": metal(["#ffffff", "#bcc3cb 16%", "#6f7782 30%", "#eceff2 48%", "#8d959f 64%", "#4f5660 80%", "#ffffff"], "#1c1f24"),
    "copper": metal(["#ffd6b6", "#c96e37 16%", "#7a3a17 30%", "#f2a674 48%", "#9c4c22 64%", "#5a2a0f 80%", "#ffd6b6"], "#2e1406"),
    "steel": (False, f"border-radius:50%; background: {SPEC}, repeating-radial-gradient(circle at 50% 50%,rgba(255,255,255,0.08) 0 1px,transparent 1px 3px), conic-gradient(from 210deg,#e4e8ec,#9aa2ab 14%,#5e666f 28%,#d5dade 46%,#7f8790 62%,#4a5159 80%,#e4e8ec); box-shadow: {IN3D}, inset 0 0 0 1px rgba(255,255,255,0.3);",
              "color:#14171b; text-shadow:0 1px 0 rgba(255,255,255,0.6);", "", False),
    "wood": (True, f"inset:5%; border-radius:20%; background: {SOFT}, repeating-radial-gradient(ellipse 150% 42% at 18% 112%,#9b6537 0 3px,#ab7743 3px 6px,#8a5730 6px 8px,#a06c3c 8px 11px), linear-gradient(#b07a45,#6e4422); box-shadow: {BEVEL}, 0 8px 16px rgba(0,0,0,0.45);",
             "color:#fff8ec; text-shadow:0 1px 2px rgba(40,20,5,0.8);", "", False),
    "marble": (False, f"border-radius:50%; background: {SPEC}, linear-gradient(118deg,transparent 36%,rgba(120,110,100,0.35) 41%,transparent 45%), linear-gradient(32deg,transparent 56%,rgba(140,130,120,0.3) 60%,transparent 63%), radial-gradient(circle at 40% 34%,#fbf9f5,#e2ddd5 55%,#b9b2a6 92%); box-shadow: {IN3D};",
               "color:#3b352c; text-shadow:0 1px 0 rgba(255,255,255,0.7);", "", False),
    "jade": (False, f"border-radius:50%; background: {SPEC}, radial-gradient(circle at 62% 70%,rgba(190,255,220,0.35),transparent 40%), radial-gradient(circle at 40% 34%,#bdf3d4,#3fae7d 45%,#0f5a3a 84%,#04150d); box-shadow: {IN3D};",
             "color:#fff; text-shadow:0 1px 2px rgba(0,40,20,0.7);", "", False),
    "pearl": (False, f"border-radius:50%; background: {SPEC}, conic-gradient(from 90deg,rgba(255,200,230,0.22),rgba(190,230,255,0.22),rgba(220,255,210,0.22),rgba(255,240,200,0.22),rgba(255,200,230,0.22)), radial-gradient(circle at 38% 32%,#ffffff,#f1ece6 34%,#d6ccd9 68%,#a99eb6); box-shadow: {IN3D};",
              "color:#3a3442; text-shadow:0 1px 0 rgba(255,255,255,0.8);", "", False),
    "obsidian": (False, f"border-radius:50%; background: {SPEC}, {rim()}, radial-gradient(circle at 40% 34%,#3b404a,#111318 52%,#000); box-shadow: {IN3D};",
                 "color:#fff;", "", False),
    "ceramic": (False, f"border-radius:50%; background: {SPEC}, {ball(45, 94, 38, 80, 34, 58)}; box-shadow: {IN3D};",
                f"color:{h(40, 22)}; text-shadow:0 1px 0 rgba(255,255,255,0.6);", "", False),
    "carbon": (False, f"border-radius:50%; background: {SPEC}, {SHADE}, repeating-linear-gradient(45deg,#1a1c20 0 3px,#2b2e34 3px 6px), #1a1c20; box-shadow: {IN3D}, inset 0 0 0 1px rgba(255,255,255,0.12);",
               f"color:#fff;", f"[data-skin=\"carbon\"] {R} .life{{stroke:{h(90, 62)}}}", False),
    "glass": (False, f"border-radius:50%; background: {SPEC}, radial-gradient(circle at 66% 78%,rgba(255,255,255,0.35),transparent 30%), radial-gradient(circle at 50% 50%,{h(70, 60, 0.12)},{h(70, 50, 0.38)} 80%); box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.55), inset 0 -8px 16px {h(80, 60, 0.35)}, inset 4px 6px 10px rgba(255,255,255,0.25);",
              "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.6);", "", False),
    # ---------------- clean ----------------
    "paper": (True, f"inset:6%; border-radius:10%; transform:rotate(-3deg); background: radial-gradient(ellipse 90% 60% at 100% 100%,rgba(0,0,0,0.12),transparent 60%), linear-gradient(90deg,{h(55, 56)} 0 9%,transparent 9%), repeating-linear-gradient(transparent 0 17%,rgba(60,50,40,0.08) 17% 18%), linear-gradient(160deg,#fbf8f2,#ece5d8); box-shadow: 0 1px 0 rgba(255,255,255,0.8) inset, 0 9px 16px rgba(0,0,0,0.42);",
              "color:#3a3229; text-shadow:none;", "", False),
    "pebble": (True, f"inset:4%; border-radius:44%; background: {SOFT}, radial-gradient(circle at 40% 30%,{h(30, 74)},{h(26, 52)} 60%,{h(28, 34)}); box-shadow: {IN3D}, 0 9px 18px rgba(0,0,0,0.42);",
               "color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.45);", "", False),
    # ---------------- playful ----------------
    "neon": (False, f"border-radius:50%; background: radial-gradient(circle at 36% 28%,rgba(255,255,255,0.25),transparent 40%), radial-gradient(circle,#05060a 60%,{h(100, 20)}); border:2.5px solid {h(100, 66)}; box-shadow:0 0 14px {h(100, 60)}, inset 0 0 14px {h(100, 60, 0.6)};",
             f"color:{h(100, 82)}; text-shadow:0 0 10px {h(100, 60)};", "", False),
    "candy": (False, f"border-radius:50%; background: {SPEC}, {SHADE}, repeating-linear-gradient(45deg,{h(85, 60)} 0 11%,#fff4f8 11% 18%); box-shadow: {IN3D};",
              "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.8);", "", False),
    "gem": (True, f"inset:0; clip-path:polygon(50% 2%,98% 38%,50% 98%,2% 38%); background: radial-gradient(circle at 36% 26%,rgba(255,255,255,0.85) 0,transparent 12%), conic-gradient(from 0deg at 50% 38%,{h(95, 80)},{h(85, 42)},{h(95, 86)},{h(75, 30)},{h(95, 70)},{h(85, 46)},{h(95, 80)});",
            "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.7); padding-bottom:12%;", "", True),
    "star": (True, f"inset:-2%; clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%); background: radial-gradient(circle at 42% 30%,rgba(255,255,255,0.8) 0,transparent 16%), radial-gradient(circle at 46% 40%,{h(95, 74)},{h(88, 50)} 55%,{h(85, 30)});",
             "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.7); padding-top:6%;", "", True),
    "planet": (False, f"border-radius:50%; background: {SOFT}, {SHADE}, repeating-linear-gradient(12deg,{h(62, 60)} 0 11%,{h(55, 46)} 11% 19%,{h(70, 68)} 19% 25%); box-shadow: {IN3D};",
               "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.6);", f"[data-skin=\"planet\"] :is(.halo,.zhalo){{display:block; inset:34% -12%; border-radius:50%; border:3px solid {h(70, 82, 0.75)}; border-left-color:transparent; transform:rotate(-16deg); animation:none}}", False),
    "fire": (False, f"border-radius:50% 50% 46% 46% / 58% 58% 42% 42%; background: radial-gradient(circle at 46% 30%,rgba(255,255,255,0.5),transparent 30%), radial-gradient(circle at 50% 72%,#fff6c2 0 10%,#ffc04d 28%,#ff6a1a 56%,#a8200a 82%,#3b0802); box-shadow: 0 0 18px rgba(255,120,30,0.45), {IN3D};",
             "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.7);", "", False),
    "bubble": (False, f"border-radius:50%; border:1px solid rgba(255,255,255,0.7); background: {SPEC}, radial-gradient(circle at 68% 78%,rgba(255,255,255,0.5) 0,transparent 14%), radial-gradient(circle,transparent 50%,rgba(255,255,255,0.18) 72%,rgba(255,255,255,0.55) 100%), conic-gradient(from 30deg,rgba(255,120,200,0.35),rgba(120,200,255,0.35),rgba(160,255,170,0.35),rgba(255,240,120,0.35),rgba(255,120,200,0.35));",
               "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.6);", "", False),
    # ---------------- kids ----------------
    "buddy": (False, f"border-radius:50%; background: radial-gradient(circle at 36% 40%,#1b1b1b 0 5.5%,transparent 6%), radial-gradient(circle at 64% 40%,#1b1b1b 0 5.5%,transparent 6%), radial-gradient(circle at 34% 37%,#fff 0 1.8%,transparent 2.2%), radial-gradient(circle at 62% 37%,#fff 0 1.8%,transparent 2.2%), radial-gradient(circle at 24% 56%,rgba(255,110,150,0.55) 0 7%,transparent 8%), radial-gradient(circle at 76% 56%,rgba(255,110,150,0.55) 0 7%,transparent 8%), {SPEC}, {ball(88, 78, 80, 58, 75, 36)}; box-shadow: {IN3D};",
              "color:#1b1b1b; text-shadow:0 1px 0 rgba(255,255,255,0.5); padding-top:42%;", "", False),
    "balloon": (True, f"inset:2% 16% 18%; border-radius:50% 50% 47% 47% / 55% 55% 45% 45%; background: radial-gradient(ellipse 22% 30% at 32% 26%,rgba(255,255,255,0.85),transparent 70%), radial-gradient(circle at 44% 38%,{h(88, 66)},{h(80, 46)} 70%,{h(80, 28)}); box-shadow: {IN3D};",
                "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.6); padding-bottom:14%;", "", True),
    "cloud": (True, f"inset:6% 0; background: radial-gradient(circle at 30% 62%,#fff 0 22%,transparent 23%), radial-gradient(circle at 52% 44%,#fff 0 29%,transparent 30%), radial-gradient(circle at 74% 60%,#fff 0 21%,transparent 22%), linear-gradient(#fff,#fff) 50% 76%/66% 26% no-repeat;",
              f"color:{h(55, 32)}; text-shadow:none; padding-top:16%;",
              f"[data-skin=\"cloud\"] {S}{{--ds: drop-shadow(0 -3px 0 rgba(255,255,255,0.4)) drop-shadow(0 6px 4px {h(40, 60, 0.45)}) drop-shadow(0 10px 12px rgba(0,0,0,0.4))}}", False),
    "blocks": (True, f"inset:8%; border-radius:14%; background: radial-gradient(circle at 30% 26%,rgba(255,255,255,0.55) 0 5%,{h(85, 62)} 6% 10%,{h(70, 40)} 11%,transparent 12%), radial-gradient(circle at 70% 26%,rgba(255,255,255,0.55) 0 5%,{h(85, 62)} 6% 10%,{h(70, 40)} 11%,transparent 12%), {SOFT}, linear-gradient(180deg,{h(85, 60)},{h(85, 48)}); box-shadow: inset 0 -7px 0 {h(70, 36)}, inset 0 2px 0 rgba(255,255,255,0.45), 0 6px 0 {h(70, 24)}, 0 12px 14px rgba(0,0,0,0.4);",
               "color:#fff; text-shadow:0 2px 0 rgba(0,0,0,0.35); padding-top:14%;", "", False),
    # ---------------- aesthetic ----------------
    "heart": (True, f"inset:0; clip-path:polygon(50% 94%,13% 58%,4% 40%,5% 23%,14% 11%,28% 6%,41% 9%,50% 20%,59% 9%,72% 6%,86% 11%,95% 23%,96% 40%,87% 58%); background: radial-gradient(ellipse 18% 13% at 28% 22%,rgba(255,255,255,0.9),transparent 70%), radial-gradient(circle at 40% 32%,{h(95, 80)},{h(82, 58)} 50%,{h(80, 34)} 90%);",
              "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.5); padding-bottom:10%;", "", True),
    "flower": (True, f"inset:0; background: radial-gradient(circle at 46% 46%,#fff7cf 0 6%,{h(92, 58)} 12%,{h(80, 40)} 18%,transparent 19%), radial-gradient(circle at 46% 18%,#fff 0 4%,{h(75, 84)} 10%,{h(70, 62)} 21%,transparent 22%), radial-gradient(circle at 73% 37%,#fff 0 4%,{h(75, 84)} 10%,{h(70, 62)} 21%,transparent 22%), radial-gradient(circle at 63% 71%,#fff 0 4%,{h(75, 84)} 10%,{h(70, 62)} 21%,transparent 22%), radial-gradient(circle at 29% 71%,#fff 0 4%,{h(75, 84)} 10%,{h(70, 62)} 21%,transparent 22%), radial-gradient(circle at 19% 37%,#fff 0 4%,{h(75, 84)} 10%,{h(70, 62)} 21%,transparent 22%);",
               "color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.7);", "", True),
    "clay": (False, f"border-radius:50%; background: radial-gradient(circle at 34% 28%,rgba(255,255,255,0.5),transparent 40%), {ball(70, 88, 55, 76, 45, 58)}; box-shadow: {IN3D}, 0 8px 18px {h(50, 40, 0.35)};",
             f"color:{h(40, 26)}; text-shadow:0 1px 0 rgba(255,255,255,0.5);", "", False),
    "moon": (False, f"border-radius:50%; background: radial-gradient(circle at 62% 34%,rgba(0,0,0,0.16) 0 8%,rgba(255,255,255,0.25) 9%,transparent 10.5%), radial-gradient(circle at 36% 64%,rgba(0,0,0,0.14) 0 11%,rgba(255,255,255,0.22) 12%,transparent 13.5%), radial-gradient(circle at 68% 70%,rgba(0,0,0,0.12) 0 5%,transparent 6.5%), {SHADE}, radial-gradient(circle at 34% 28%,#fdfbef,#d3cebd 58%,#8e8a78); box-shadow: {IN3D};",
             "color:#3a382f; text-shadow:0 1px 0 rgba(255,255,255,0.6);", "", False),
    "polaroid": (True, f"inset:2% 12%; transform:rotate(-4deg); background: radial-gradient(ellipse 40% 26% at 34% 22%,rgba(255,255,255,0.55),transparent 70%) 50% 9%/84% 64% no-repeat, linear-gradient(160deg,{h(65, 64)},{h(70, 34)}) 50% 9%/84% 64% no-repeat, linear-gradient(180deg,#ffffff,#eeeeea); box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06), 0 10px 18px rgba(0,0,0,0.45);",
                 "color:#2a2a2a; text-shadow:none; padding-top:66%;", "", False),
    "sticky": (True, f"inset:8%; transform:rotate(3deg); background: radial-gradient(ellipse 70% 40% at 100% 100%,rgba(0,0,0,0.16),transparent 70%), linear-gradient(transparent 0 84%,rgba(0,0,0,0.05) 84%), linear-gradient(170deg,{h(95, 84)},{h(90, 70)}); box-shadow:inset 0 1px 0 rgba(255,255,255,0.6), 0 12px 16px rgba(0,0,0,0.4);",
               f"color:{h(60, 20)}; text-shadow:none;", "", False),
    # ---------------- retro ----------------
    "pixel": (True, f"inset:4%; clip-path:polygon(20% 0,80% 0,80% 10%,90% 10%,90% 20%,100% 20%,100% 80%,90% 80%,90% 90%,80% 90%,80% 100%,20% 100%,20% 90%,10% 90%,10% 80%,0 80%,0 20%,10% 20%,10% 10%,20% 10%); background: linear-gradient(rgba(255,255,255,0.45),rgba(255,255,255,0.45)) 20% 20%/20% 10% no-repeat, linear-gradient(rgba(0,0,0,0.25),rgba(0,0,0,0.25)) 80% 80%/20% 10% no-repeat, {h(78, 55)};",
              "color:#fff; font-family:var(--mono); text-shadow:2px 2px 0 rgba(0,0,0,0.5);", "", False),
    "blocky": (True, "inset:6%; image-rendering:pixelated; background: linear-gradient(#6cbf3f,#6cbf3f) 0 0/100% 22% no-repeat, linear-gradient(90deg,#6cbf3f 0 12.5%,transparent 12.5% 37.5%,#6cbf3f 37.5% 50%,transparent 50% 75%,#6cbf3f 75% 87.5%,transparent 87.5%) 0 22%/100% 9% no-repeat, repeating-conic-gradient(#8b5a2b 0 25%,#76491f 0 50%) 0 0/25% 25%, #8b5a2b;",
               "color:#fff; font-family:var(--mono); text-shadow:2px 2px 0 rgba(0,0,0,0.6); padding-top:16%;", "", False),
    "vinyl": (False, f"border-radius:50%; background: radial-gradient(circle,#0b0b0b 0 3%,{h(70, 56)} 3.5% 30%,#111 31% 33%,transparent 34%), conic-gradient(from 20deg,rgba(255,255,255,0.14),transparent 12%,transparent 38%,rgba(255,255,255,0.12) 50%,transparent 62%,transparent 88%,rgba(255,255,255,0.14)), repeating-radial-gradient(circle,#151515 0 1.5%,#262626 1.5% 3%); box-shadow: {IN3D};",
              "color:#fff;", "", False),
    "sunset": (False, f"border-radius:50%; background: {SOFT}, {SHADE}, linear-gradient(transparent 56%,#0d0b1a 56% 59%,transparent 59% 65%,#0d0b1a 65% 68%,transparent 68% 74%,#0d0b1a 74% 76%,transparent 76%), linear-gradient(#ffd25e,#ff7a59 46%,{h(80, 46)}); box-shadow: {IN3D};",
               "color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.6);", "", False),
    "chrome": (False, f"border-radius:50%; background: {SPEC}, linear-gradient({h(80, 60, 0.22)},{h(80, 60, 0.22)}), linear-gradient(180deg,#ffffff 0%,#a4aab3 38%,#2f333a 50%,#7a8089 54%,#d3d8df 66%,#ffffff 100%); box-shadow: {IN3D}, inset 0 0 0 1px rgba(255,255,255,0.4);",
               "color:#111; text-shadow:0 1px 0 rgba(255,255,255,0.8);", "", False),
    # ---------------- easy to see ----------------
    "big": (False, f"border-radius:50%; background: radial-gradient(circle at 36% 28%,#ffffff,#f1f2f4 50%,#cfd3d9); border:5px solid {h(85, 42)}; box-shadow: inset -6px -8px 14px rgba(0,0,0,0.18), 0 6px 14px rgba(0,0,0,0.4);",
            "color:#000; text-shadow:none; font-size:calc(var(--s) * var(--k) * 0.18);",
            "[data-skin=\"big\"] .orb-label{font-size:16px; max-width:240px} [data-skin=\"big\"] .orb-meta{font-size:12px; color:#e6e6e6} [data-skin=\"big\"] :is(.ring,.mring,.zring) circle{stroke-width:3} [data-skin=\"big\"] .mname{font-size:calc(var(--md) * 0.2 + 3px)}", False),
}

out = [
    "/* >>> styles (generated by scripts/gen-skins.py) */",
    "/* ================= Styles: how a dropped object looks (picked by the visitor; see src/lib/skin-list.ts) ================= */",
    f"[data-skin] :is(.sphere,.mball,.zsphere,.ext) {{ --h: var(--hue); }}",
    f"[data-skin] :is(.mball,.zsphere) {{ --h: var(--sh); }}",
    f"[data-skin]:not([data-skin=\"orbit\"]) {S} {{ background: none; box-shadow: none; border-radius: 0; }}",
    f"[data-skin]:not([data-skin=\"orbit\"]) {S}::before {{ content: \"\"; position: absolute; inset: 0; z-index: 0; pointer-events: none; }}",
    f"[data-skin]:not([data-skin=\"orbit\"]) :is(.halo,.zhalo) {{ display: none; }}",
    f"[data-skin]:not([data-skin=\"orbit\"]) {T} {{ z-index: 1; }}",
    f"[data-skin]:not([data-skin=\"orbit\"]) .zext {{ position: relative; }}",
    f"[data-skin]:not([data-skin=\"orbit\"]) .orb.mine .sphere::before {{ outline: 2px solid rgba(255,255,255,0.85); outline-offset: 3px; }}",
    # colour schemes: recolour (type / accent) or tone down (muted / mono) whatever style is on
    "[data-pal=\"type\"] .orb, [data-pal=\"type\"] :is(.mball,.zsphere) { --hue: var(--th); --sh: var(--th); }",
    "[data-pal=\"accent\"] .orb, [data-pal=\"accent\"] :is(.mball,.zsphere) { --hue: 212; --sh: 212; }",
    "[data-pal=\"muted\"] { --pf: saturate(0.42) brightness(0.98); }",
    "[data-pal=\"mono\"] { --pf: grayscale(1) contrast(1.06); }",
    f"[data-skin] :is({S[4:-1]},.ring) {{ filter: var(--pf,) var(--ds,); }}",
    # calm motion for serious styles
    "[data-tone=\"calm\"] .orb { --drift: 0.25; }",
    "[data-tone=\"calm\"] .blob, [data-tone=\"calm\"] .blob.big { -webkit-backdrop-filter: none; backdrop-filter: none; background: linear-gradient(180deg, rgba(34,37,45,0.94), rgba(18,20,26,0.94)); border: 1px solid rgba(255,255,255,0.14); box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 14px 32px rgba(0,0,0,0.5); }",
    "[data-tone=\"calm\"] .blob::after { display: none; }",
    "[data-tone=\"calm\"] .member { animation: none; }",
]
bar = (f"content: \"\"; position: absolute; left: 22%; right: 22%; bottom: -14%; height: 4px; border-radius: 4px; z-index: 1; pointer-events: none; opacity: 1; animation: none;"
       f" box-shadow: inset 0 1px 0 rgba(255,255,255,0.35); background: linear-gradient(90deg, var(--bar, {h(85, 66)}) calc(var(--life, 1) * 100%), rgba(255,255,255,0.16) 0);")
for k, (shaped, shape, text, extra, drop) in SK.items():
    out.append(f"[data-skin=\"{k}\"] {S}::before {{ {shape} }}")
    out.append(f"[data-skin=\"{k}\"] {T} {{ {text} }}")
    if drop:
        out.append(f"[data-skin=\"{k}\"] {S} {{ --ds: {DROP}; }}")
    if shaped:
        out.append(f"[data-skin=\"{k}\"] {R} {{ display: none; }}")
        out.append(f"[data-skin=\"{k}\"] {S}::after {{ {bar} }}")
        out.append(f"[data-skin=\"{k}\"] .orb.dying .sphere::after {{ --bar: var(--danger); }}")
    if extra:
        out.append(extra)
out.append("/* <<< styles */")
print("\n".join(out))
