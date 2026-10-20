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
add(A["hook"] + (A["float"] - A["hook"]) * 0.75, "launch")
add(A["float"] + 2.5, "word"); add(A["float"] + (A["ballast"] - A["float"]) * 0.55, "click")
add(A["ballast"] + 2.2, "lid"); add(A["ballast"] + 3.0, "launch")
for i in range(4): add(A["trim"] + 0.8 + i * 1.0, "tap")
add(A["trim"] + (A["planes"] - A["trim"]) * 0.6, "done")
add(A["planes"] + 0.8, "word")
add(A["deep"] + 0.4, "click"); add(A["deep"] + (A["rise"] - A["deep"]) * 0.35, "word")
add(A["rise"] + 0.4, "strike"); add(A["rise"] + 2.5, "launch")
add(A["oxygen"] + 1.0, "word"); add(A["oxygen"] + (A["quiet"] - A["oxygen"]) * 0.6, "done")
for i in range(3): add(A["quiet"] + 0.6 + i * 1.6, "tap")
for i in range(3): add(A["orbi"] + 1.6 + i * 0.8, "click")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
