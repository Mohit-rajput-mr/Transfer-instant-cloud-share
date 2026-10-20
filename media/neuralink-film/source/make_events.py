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
add(A["coin"] + 1.0, "lid")
for i in range(5): add(A["threads"] + 0.6 + i * 0.9, "tap")
add(A["robot"] + 0.6, "click"); add(A["robot"] + (A["spikes"] - A["robot"]) * 0.5, "word")
for i in range(5): add(A["spikes"] + 0.8 + i * 1.3, "tap")
add(A["decode"] + (A["wireless"] - A["decode"]) * 0.4, "done")
add(A["wireless"] + 0.6, "launch"); add(A["wireless"] + (A["people"] - A["wireless"]) * 0.5, "lid")
add(A["people"] + 0.8, "word")
add(A["close"] + 0.6, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
