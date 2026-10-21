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
add(A["cells"] + 1.0, "move")
add(A["layers"] + 1.5, "word"); add(A["layers"] + 4.5, "word"); add(A["layers"] + 7.0, "done")
add(A["photon"] + 1.0, "launch"); add(A["photon"] + 2.0, "strike"); add(A["photon"] + 5.0, "move")
add(A["current"] + 1.0, "done"); add(A["current"] + 5.5, "click")
add(A["inverter"] + 1.5, "move"); add(A["inverter"] + 3.5, "done")
add(A["eff"] + 1.5, "word")
add(A["hour"] + 1.5, "launch"); add(A["hour"] + 5.0, "strike")
add(A["close"] + 0.6, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
