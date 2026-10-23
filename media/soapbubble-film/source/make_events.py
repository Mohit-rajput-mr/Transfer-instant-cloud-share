# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(1.2, "word")
add(A["layers"] + 1.5, "click")
add(A["round"] + 2.0, "move")
add(A["colours"] + 1.0, "word")
add(A["pop"] + 4.0, "strike")
add(A["orbi"] + 1.0, "tap"); add(A["orbi"] + 2.0, "tap"); add(A["orbi"] + 3.0, "tap")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
