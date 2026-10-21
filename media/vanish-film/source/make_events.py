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
add(A["send"] + 1.0, "launch"); add(A["send"] + 4.0, "arrive")
add(A["timer"] + 1.0, "click"); add(A["timer"] + 4.0, "burn")
add(A["server"] + 2.5, "burn")
add(A["catch"] + 1.5, "strike"); add(A["catch"] + 4.5, "click")
add(A["orbi"] + 1.0, "click"); add(A["orbi"] + 4.5, "word"); add(A["orbi"] + 7.0, "burn")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
