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
add(A["hook"] + 3.4, "click")
add(A["fan"] + 0.4, "launch")
add(A["split"] + 0.6, "lid"); add(A["split"] + (A["squeeze"] - A["split"]) * 0.5, "word")
for i in range(6): add(A["squeeze"] + 1.6 + i * 0.7, "tap")
add(A["bang"] + 0.6, "strike"); add(A["bang"] + (A["cool"] - A["bang"]) * 0.45, "word")
add(A["cool"] + 0.6, "lid"); add(A["cool"] + 2.0, "done")
add(A["turbine"] + 0.6, "launch"); add(A["turbine"] + (A["thrust"] - A["turbine"]) * 0.4, "click")
add(A["thrust"] + 0.8, "launch")
for i in range(4): add(A["sum"] + 0.15 + i * (A["orbi"] - A["sum"] - 0.4) / 4.6, "strike")
add(A["orbi"] + 1.0, "word"); add(A["orbi"] + (A["end"] - A["orbi"]) * 0.6, "lid")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
