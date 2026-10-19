# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(0.8, "strike"); add(A["sand"] + 0.8, "word"); add(A["ingot"] + 0.6, "launch")
add(A["wafer"] + 0.5, "click"); add(A["light"] + 0.5, "click")
for i in range(8): add(A["euv"] + 0.5 + i * 0.4, "tap")
add(A["mask"] + 0.5, "burn"); add(A["mask"] + 1.5, "done")
for i in range(8): add(A["layers"] + 0.3 + i * (A["clean"] - A["layers"] - 1) / 8, "tap")
add(A["clean"] + 0.5, "word"); add(A["cut"] + 0.8, "lid"); add(A["orbi"] + 0.6, "launch")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
