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
add(A["door"] + 5.0, "move")
add(A["bolts"] + 1.0, "click"); add(A["bolts"] + 1.4, "click"); add(A["bolts"] + 1.8, "click")
add(A["timer"] + 1.5, "word")
add(A["relock"] + 2.5, "strike")
add(A["slow"] + 1.5, "launch")
add(A["orbi"] + 2.0, "click"); add(A["orbi"] + 5.5, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
