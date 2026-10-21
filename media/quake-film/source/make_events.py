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
add(A["hook"] + 3.6, "lid")
add(A["fault"] + 1.0, "move")
add(A["strain"] + 1.0, "move"); add(A["strain"] + 5.0, "word")
add(A["snap"] + 1.6, "strike"); add(A["snap"] + 1.8, "burn")
add(A["waves"] + 1.0, "launch"); add(A["waves"] + 4.5, "arrive")
add(A["scale"] + 1.5, "click"); add(A["scale"] + 3.0, "click"); add(A["scale"] + 6.0, "strike")
add(A["warn"] + 1.2, "tap"); add(A["warn"] + 4.5, "strike")
add(A["close"] + 0.6, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
