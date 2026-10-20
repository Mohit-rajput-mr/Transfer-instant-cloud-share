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
add(A["hook"] + 4.0, "lid")
add(A["fuel"] + 0.8, "word"); add(A["fuel"] + 2.5, "launch")
add(A["clouds"] + 2.0, "done"); add(A["clouds"] + 4.5, "strike")
add(A["low"] + 0.6, "word"); add(A["low"] + 2.2, "launch")
add(A["spin"] + 0.6, "launch"); add(A["spin"] + 5.0, "click"); add(A["spin"] + 7.0, "click")
add(A["eye"] + 0.8, "word"); add(A["eye"] + 4.0, "strike")
add(A["land"] + 0.6, "launch"); add(A["land"] + 3.5, "done")
add(A["close"] + 0.6, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
