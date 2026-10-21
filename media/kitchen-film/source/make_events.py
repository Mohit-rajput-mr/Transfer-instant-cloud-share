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
add(A["order"] + 1.0, "launch"); add(A["order"] + 4.0, "click"); add(A["order"] + 6.0, "click")
add(A["station"] + 1.0, "move")
add(A["timer"] + 4.0, "word"); add(A["timer"] + 5.5, "strike")
add(A["expo"] + 4.5, "click")
add(A["brigade"] + 1.5, "word")
add(A["orbi"] + 3.5, "click"); add(A["orbi"] + 6.0, "move"); add(A["orbi"] + 7.0, "move"); add(A["orbi"] + 8.0, "click")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
