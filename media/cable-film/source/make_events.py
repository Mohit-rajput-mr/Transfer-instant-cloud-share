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
add(A["hook"] + 2.4, "lid")
add(A["scale"] + 1.2, "word"); add(A["scale"] + (A["inside"] - A["scale"]) * 0.5, "word")
add(A["inside"] + 0.5, "click"); add(A["inside"] + (A["repeat"] - A["inside"]) * 0.55, "done")
add(A["repeat"] + 0.8, "launch")
add(A["shore"] + 0.8, "word")
add(A["break"] + (A["repair"] - A["break"]) * 0.45, "strike"); add(A["break"] + (A["repair"] - A["break"]) * 0.75, "click")
add(A["repair"] + 1.0, "launch"); add(A["repair"] + (A["orbi"] - A["repair"]) * 0.85, "done")
for i in range(6): add(A["orbi"] + (A["end"] - A["orbi"]) * 0.2 + i * 0.3, "tap")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
