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
for i, dd in enumerate([0, 0.25, 0.5, 1.1]):
    add(A["wire"] + 2.0 + dd, "click")
add(A["letters"] + 2.5, "tap"); add(A["letters"] + 4.5, "tap")
add(A["first"] + 1.0, "strike")
for i, dd in enumerate([0, 0.25, 0.5, 1.0, 1.5, 2.0, 2.6, 2.85, 3.1]):
    add(A["sos"] + 0.4 + dd, "tap")
add(A["orbi"] + 2.0, "done"); add(A["orbi"] + 6.0, "click")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
