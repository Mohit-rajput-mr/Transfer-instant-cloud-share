# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(1.2, "tap")
add(A["spin"] + 2.5, "click"); add(A["spin"] + 4.0, "click")
add(A["set"] + 1.5, "click"); add(A["set"] + 2.6, "click"); add(A["set"] + 3.7, "click")
add(A["open"] + 2.5, "done"); add(A["open"] + 3.2, "launch")
add(A["wrong"] + 1.5, "strike")
add(A["orbi"] + 2.0, "tap"); add(A["orbi"] + 5.0, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
