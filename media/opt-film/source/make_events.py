# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(A["hook"] + 1.2, "strike")
add(A["call"] + 0.6, "click"); add(A["call"] + 1.0, "click"); add(A["call"] + (A["prem"] - A["call"]) * 0.6, "click")
for i in range(3): add(A["prem"] + 0.6 + i * 1.2, "tap")
add(A["win"] + 0.3, "launch"); add(A["lose"] - 1.8, "strike"); add(A["lose"] + 1.0, "lid")
add(A["put"] + 0.6, "click"); add(A["decay"] + 0.6, "burn"); add(A["curve"] + 0.4, "word")
for i in range(6): add(A["seller"] + 0.4 + i * 0.9, "tap")
add(A["vol"] + 0.6, "word")
sp = A["tip"] - A["why"]
for i in range(4): add(A["why"] + 0.4 + i * sp * 0.2, "tap")
sp = A["end"] - A["tip"]
for f in (0.05, 0.35, 0.6): add(A["tip"] + sp * f, "tap")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
