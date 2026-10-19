# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(3.3, "done"); add(3.5, "strike")
add(A["coil"] + 0.6, "click"); add(A["coil"] + (A["field"] - A["coil"]) * 0.5, "click")
add(A["field"] + 0.6, "word")
add(A["power"] + (A["talk"] - A["power"]) * 0.45, "done")
for i in range(8): add(A["talk"] + 0.6 + i * 0.4, "tap")
add(A["close"] + (A["token"] - A["close"]) * 0.45, "lid"); add(A["close"] + (A["token"] - A["close"]) * 0.95, "done")
add(A["token"] + 0.4, "click"); add(A["token"] + (A["replay"] - A["token"]) * 0.45, "click"); add(A["replay"] + 0.6, "strike")
add(A["orbi"] + 0.3, "launch"); add(A["orbi"] + 0.8, "word")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
