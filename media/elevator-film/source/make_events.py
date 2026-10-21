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
add(A["cables"] + 1.0, "move")
add(A["counter"] + 1.0, "move")
add(A["governor"] + 4.0, "strike")
add(A["brakes"] + 0.8, "click"); add(A["brakes"] + 1.2, "click")
add(A["history"] + 4.5, "strike"); add(A["history"] + 5.2, "click")
add(A["buffers"] + 1.0, "move")
add(A["close"] + 0.6, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
