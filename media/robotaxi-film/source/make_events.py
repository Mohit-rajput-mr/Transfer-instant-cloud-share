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
add(A["hook"] + 1.6, "lid")
for i in range(6): add(A["lidar"] + 0.5 + i * 0.9, "tap")
add(A["cloud"] + 1.0, "launch")
add(A["camera"] + 1.0, "click"); add(A["radar"] + 1.2, "word")
for i in range(3): add(A["fuse"] + 1.0 + i * 0.6, "click")
add(A["predict"] + (A["tesla"] - A["predict"]) * 0.35, "strike")
add(A["tesla"] + 0.6, "word"); add(A["tesla"] + (A["close"] - A["tesla"]) * 0.45, "word")
add(A["close"] + 0.6, "done")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
