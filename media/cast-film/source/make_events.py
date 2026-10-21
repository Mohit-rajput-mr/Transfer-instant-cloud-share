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
add(A["shout"] + 1.5, "launch")
add(A["answer"] + 1.0, "click"); add(A["answer"] + 3.0, "click"); add(A["answer"] + 4.0, "click")
add(A["stream"] + 1.0, "tap"); add(A["stream"] + 5.0, "launch")
add(A["local"] + 2.5, "strike")
add(A["orbi"] + 1.5, "click"); add(A["orbi"] + 4.5, "done")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
