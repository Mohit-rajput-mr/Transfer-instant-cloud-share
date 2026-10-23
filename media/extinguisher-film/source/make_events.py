# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(1.2, "burn")
add(A["hook"] + 6.0, "strike")
add(A["inside"] + 3.0, "click"); add(A["inside"] + 3.3, "launch")
add(A["types"] + 0.5, "word"); add(A["types"] + 2.5, "word"); add(A["types"] + 5.0, "word")
add(A["powder"] + 1.5, "launch")
add(A["pass"] + 2.0, "click"); add(A["pass"] + 3.0, "tap"); add(A["pass"] + 4.0, "launch"); add(A["pass"] + 5.0, "move")
add(A["close"] + 0.6, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
