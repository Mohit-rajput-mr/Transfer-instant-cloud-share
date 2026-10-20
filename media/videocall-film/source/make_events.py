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
add(A["raw"] + 1.2, "launch")
add(A["same"] + 1.5, "click"); add(A["blocks"] + 1.0, "word"); add(A["blocks"] + (A["packets"] - A["blocks"]) * 0.55, "done")
for i in range(6): add(A["packets"] + 0.4 + i * 0.9, "tap")
add(A["late"] + 1.0, "strike")
add(A["server"] + 0.8, "launch"); add(A["server"] + (A["orbi"] - A["server"]) * 0.5, "word")
for i in range(6): add(A["orbi"] + 0.6 + i * 0.35, "tap")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
