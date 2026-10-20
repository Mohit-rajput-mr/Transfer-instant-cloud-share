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
for i in range(5): add(A["explode"] + 1.5 + i * 0.7, "tap")
add(A["explode"] + 5.5, "strike")
add(A["guess"] + 3.0, "launch")
for i in range(6): add(A["improve"] + 1.0 + i * 0.9, "click")
add(A["improve"] + 7.0, "done")
add(A["real"] + 1.0, "word"); add(A["real"] + 2.8, "word"); add(A["real"] + 4.6, "word")
add(A["left"] + 1.0, "move"); add(A["left"] + 4.5, "done")
add(A["result"] + 1.5, "strike")
add(A["orbi"] + 1.0, "click"); add(A["orbi"] + 4.0, "done")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
