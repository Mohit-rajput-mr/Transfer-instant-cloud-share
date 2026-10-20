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
for i in range(5): add(A["train"] + 0.8 + i * 1.1, "tap")
add(A["learn"] + 0.6, "launch"); add(A["learn"] + (A["prompt"] - A["learn"]) * 0.4, "done")
add(A["prompt"] + 0.6, "word"); add(A["prompt"] + (A["start"] - A["prompt"]) * 0.5, "click")
add(A["start"] + 0.4, "strike")
for i in range(8): add(A["steps"] + 0.4 + i * (A["latent"] - A["steps"]) / 8.5, "tap")
add(A["latent"] + (A["seed"] - A["latent"]) * 0.55, "launch")
add(A["seed"] + 0.4, "word"); add(A["seed"] + (A["close"] - A["seed"]) * 0.6, "done")
add(A["close"] + 0.4, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
