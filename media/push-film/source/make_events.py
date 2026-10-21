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
for i in range(5): add(A["poll"] + 1.0 + i * 0.5, "tap")
add(A["poll"] + 5.0, "done")
add(A["line"] + 1.0, "move"); add(A["line"] + 4.0, "click")
add(A["send"] + 1.5, "launch"); add(A["send"] + 4.5, "arrive")
add(A["wake"] + 0.8, "click"); add(A["wake"] + 2.5, "done")
add(A["fast"] + 1.0, "word")
add(A["orbi"] + 1.0, "click"); add(A["orbi"] + 6.0, "launch"); add(A["orbi"] + 8.0, "arrive")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
