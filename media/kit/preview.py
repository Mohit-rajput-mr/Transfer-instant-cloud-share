# python3 kit/preview.py out.png key:frac key:frac ... → renders stills at RS 0.5 and makes a contact sheet (run in a film's source dir)
import json, os, subprocess, sys
from PIL import Image, ImageDraw
out, specs = sys.argv[1], sys.argv[2:]
L = {l["key"]: l for l in json.load(open("vo/lines.json"))["lines"]}
ts = [round(L[k]["at"] + L[k]["dur"] * float(f), 2) if k in L else float(k) for k, f in (s.split(":") for s in specs)]
d = os.path.join(os.path.dirname(os.path.abspath(out)), "pv"); os.makedirs(d, exist_ok=True)
for f in os.listdir(d): os.remove(os.path.join(d, f))
r = subprocess.run(["node", "kit/render.cjs", "still", ",".join(map(str, ts)), d], env={**os.environ, "RS": os.environ.get("RS", "0.5")}, capture_output=True, text=True)
print("\n".join(l for l in (r.stdout + r.stderr).splitlines() if "GL Driver" not in l)[-3000:])
ims = []
for t, s in zip(ts, specs):
    p = os.path.join(d, f"{int(t * 30 + 0.5):05d}.png")
    im = Image.open(p).resize((270, 480)) if os.path.exists(p) else Image.new("RGB", (270, 480), "red")
    ImageDraw.Draw(im).text((6, 6), s, fill="yellow"); ims.append(im)
cols = min(6, len(ims)); rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * 270, rows * 480)); [sheet.paste(im, ((i % cols) * 270, (i // cols) * 480)) for i, im in enumerate(ims)]; sheet.save(out)
