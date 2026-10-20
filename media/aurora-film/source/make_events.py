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
add(A["hook"] + 4.5, "lid")
add(A["wind"] + 1.0, "launch")
add(A["shield"] + 0.6, "word"); add(A["poles"] + 2.5, "done")
add(A["hit"] + 1.4, "strike"); add(A["hit"] + 2.0, "strike")
for i in range(3): add(A["colors"] + 0.6 + i * 1.0, "word")
add(A["oval"] + 0.6, "click"); add(A["oval"] + 1.6, "click")
add(A["storm"] + 0.4, "launch"); add(A["storm"] + 2.5, "done")
add(A["close"] + 0.6, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
