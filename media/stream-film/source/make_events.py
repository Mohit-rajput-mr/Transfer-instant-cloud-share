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
add(A["hook"] + 4.0, "launch")
add(A["chunks"] + 1.0, "click")
add(A["measure"] + 1.0, "move")
add(A["switch"] + 2.0, "strike")
add(A["buffer"] + 1.0, "move")
add(A["cdn"] + 1.0, "launch")
add(A["orbi"] + 1.0, "move"); add(A["orbi"] + 9.0, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
