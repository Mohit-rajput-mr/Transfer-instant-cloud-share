# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(A["hook"] + 1.6, "strike"); add(A["hook"] + 3.4, "launch")
add(A["liq"] + 0.6, "click"); add(A["lows"] + 0.4, "word")
for i in range(0, 36, 4): add(A["lows"] + 1.8 + i * 0.04, "tap")
add(A["side"] + 0.3, "word")
sp = A["why"] - A["fund"]; add(A["fund"] + 0.6, "click"); add(A["fund"] + sp * 0.6, "click"); add(A["why"] + (A["sweep"] - A["why"]) * 0.45, "click")
add(A["sweep"] - 0.15, "launch")
for i in range(8): add(A["sweep"] + (A["rip"] - A["sweep"]) * (0.35 + i * 0.07), "burn")
add(A["rip"] + 0.3, "launch"); add(A["rip"] + 2.0, "done"); add(A["wick"] - 0.15, "launch")
add(A["wick"] + 0.8, "click"); add(A["wick"] + 2.4, "click")
sp = A["buyside"] - A["vs"]; add(A["vs"] + 0.4, "lid"); add(A["vs"] + sp * 0.4, "done"); add(A["vs"] + sp * 0.7, "word")
for i in range(0, 36, 4): add(A["buyside"] + 1.0 + i * 0.04, "tap")
add(A["tip"] + 0.2, "click")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
