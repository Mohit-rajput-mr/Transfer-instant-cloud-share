# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(2.6, "strike"); add(A["inside"] + 0.6, "click"); add(A["inside"] + 1.6, "click"); add(A["inside"] + 3.0, "click")
add(A["charge"] + 0.4, "launch"); add(A["use"] + 0.4, "launch"); add(A["wear"] + 0.5, "lid")
add(A["lost"] + 0.4, "burn"); add(A["heat"] + 0.4, "strike"); add(A["heat"] + 1.6, "tap"); add(A["heat"] + 2.8, "tap")
add(A["tip"] + 0.4, "done"); add(A["orbi"] + 1.0, "click")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
