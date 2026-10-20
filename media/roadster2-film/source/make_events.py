# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(1.2, "strike")
add(A["demo"] + 0.8, "launch")
add(A["grip"] + 0.8, "word"); add(A["grip"] + (A["fans"] - A["grip"]) * 0.5, "click")
add(A["fans"] + 0.6, "done")
for i in range(4): add(A["fans"] + 1.6 + i * 0.5, "tap")
add(A["tunnel"] + 0.6, "launch")
add(A["skirts"] + 0.4, "lid")
add(A["low"] + 0.6, "strike")
for i in range(3): add(A["math"] + 0.6 + i * (A["num"] - A["math"]) * 0.32, "word")
add(A["num"] + 0.4, "launch"); add(A["num"] + 2.0, "done")
add(A["history"] + 0.6, "click")
add(A["claims"] + 0.4, "word")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
