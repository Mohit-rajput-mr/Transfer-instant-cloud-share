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
add(A["hook"] + 3.0, "lid")
add(A["pellet"] + 1.0, "click"); add(A["pellet"] + (A["fission"] - A["pellet"]) * 0.6, "word")
add(A["fission"] + (A["chain"] - A["fission"]) * 0.35, "strike")
for i in range(4): add(A["chain"] + 0.3 + i * (A["control"] - A["chain"]) / 4.2, "launch")
add(A["control"] + (A["steam"] - A["control"]) * 0.5, "lid")
add(A["steam"] + 0.4, "launch"); add(A["turbine"] + 0.6, "click"); add(A["turbine"] + (A["tower"] - A["turbine"]) * 0.45, "done")
add(A["tower"] + (A["boil"] - A["tower"]) * 0.45, "word")
add(A["boil"] + 1.2, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
