# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(2.6, "strike"); add(A["sats"] + 0.5, "word"); add(A["shout"] + 0.2, "launch")
add(A["delay"] + 0.6, "click"); add(A["dist"] + 0.3, "done")
for i in range(3): add(A["rings"] + i * (A["four"] - A["rings"]) / 3 + 0.2, "tap")
add(A["four"] + 0.4, "done"); add(A["einstein"] + 0.6, "click"); add(A["einstein"] + 2.2, "click")
add(A["drift"] + 0.4, "burn"); add(A["drift"] + 2.0, "strike"); add(A["orbi"] + 1.0, "click")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
