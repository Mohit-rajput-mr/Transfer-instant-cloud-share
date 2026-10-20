# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(2.8, "strike"); add(A["grid"] + 0.5, "word"); add(A["charge"] + 0.5, "click"); add(A["finger"] + 1.6, "tap")
add(A["find"] + 0.4, "done"); add(A["multi"] + 0.4, "tap"); add(A["multi"] + 0.6, "tap"); add(A["glove"] + 0.4, "lid")
add(A["water"] + 0.4, "burn"); add(A["orbi"] + 1.0, "click"); add(A["orbi"] + (A["end"] - A["orbi"]) * 0.4, "tap")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
