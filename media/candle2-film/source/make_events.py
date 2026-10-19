# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(0.9, "strike"); add(A["book"] - 0.15, "launch")
add(A["book"] + 1.2, "click"); add(A["book"] + 3.4, "click")
for k in ("eat", "step"):
    n = A[{"eat": "step", "step": "drain"}[k]]
    x = A[k] + 0.3
    while x < n - 0.3: add(x, "tap"); x += 0.45
x = A["drain"] + 0.3
while x < A["wick"] - 0.3: add(x, "tap"); x += 0.45
add(A["red"] + 1.0, "lid"); add(A["wick"] + 1.0, "word"); add(A["liq"] - 0.15, "launch")
add(A["liq"] + 0.8, "click"); add(A["liq"] + (A["where"] - A["liq"]) * 0.55, "click")
for i in range(0, 36, 4): add(A["where"] + 1.6 + i * 0.04, "tap")
add(A["sweep"] - 0.15, "launch")
for i in range(8): add(A["sweep"] + (A["rip"] - A["sweep"]) * (0.35 + i * 0.07), "burn")
add(A["rip"] + 0.3, "launch"); add(A["rip"] + 2.0, "done")
for i in range(0, 36, 4): add(A["flip"] + 1.4 + i * 0.04, "tap")
sp = A["tip"] - A["spot"]
for f in (0.1, 0.3, 0.6): add(A["spot"] + sp * f, "click")
sp = A["end"] - A["tip"]
for f in (0.05, 0.45, 0.65): add(A["tip"] + sp * f, "tap")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
