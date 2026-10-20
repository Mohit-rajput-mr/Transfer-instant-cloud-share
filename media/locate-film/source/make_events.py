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
add(A["gps"] + 1.0, "move"); add(A["gps"] + 3.5, "done")
for i in range(6): add(A["wifi"] + 2.0 + i * 0.5, "tap")
add(A["map"] + 1.5, "launch"); add(A["map"] + 5.0, "strike")
add(A["cell"] + 1.0, "click"); add(A["cell"] + 2.0, "click"); add(A["cell"] + 3.0, "click")
add(A["ip"] + 2.0, "word")
add(A["orbi"] + 1.0, "click"); add(A["orbi"] + 5.0, "done")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
