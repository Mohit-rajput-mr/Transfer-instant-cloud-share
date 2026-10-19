# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(0.5, "click"); add(1.6, "click"); add(A["game"] + 0.2, "strike")
for i in range(7): add(A["tokens"] + 0.4 + i * 0.2, "tap")
add(A["map"] + 1.2, "word")
for i in range(3): add(A["attn"] + 0.4 + i * 0.5, "click")
add(A["score"] + 0.4, "launch"); add(A["score"] + 1.8, "done")
for i in range(7): add(A["loop"] + i * (A["learn"] - A["loop"]) / 7, "tap")
add(A["learn"] + 0.6, "word"); add(A["wrong"] + 0.3, "strike")
add(A["orbi"] + 0.6, "click"); add(A["orbi"] + 3.0, "burn")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
