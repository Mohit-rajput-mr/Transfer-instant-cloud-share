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
add(A["hook"] + (A["booster"] - A["hook"]) * 0.82, "lid")
add(A["booster"] + 1.2, "word"); add(A["booster"] + (A["flip"] - A["booster"]) * 0.6, "click")
add(A["flip"] + (A["fins"] - A["flip"]) * 0.33, "strike"); add(A["flip"] + (A["fins"] - A["flip"]) * 0.6, "launch")
add(A["fins"] + 0.8, "word")
add(A["burn"] + 0.4, "launch"); add(A["burn"] + (A["slide"] - A["burn"]) * 0.55, "click")
add(A["slide"] + 1.6, "word")
add(A["catch"] + 0.4, "lid"); add(A["catch"] + (A["why"] - A["catch"]) * 0.62, "done")
add(A["why"] + 1.2, "word"); add(A["why"] + (A["first"] - A["why"]) * 0.45, "word")
add(A["first"] + 0.6, "strike")
add(A["orbi"] + (A["end"] - A["orbi"]) * 0.3 + 1.0, "done")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
