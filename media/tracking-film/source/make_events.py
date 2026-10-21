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
add(A["cookie"] + 2.0, "tap")
for i in range(5): add(A["across"] + 2.0 + i * 0.6, "click")
for i in range(4): add(A["finger"] + 3.0 + i * 0.7, "word")
add(A["finger"] + 7.0, "done")
for i in range(4): add(A["auction"] + 3.0 + i * 0.4, "tap")
add(A["auction"] + 5.0, "strike")
add(A["block"] + 1.5, "done")
add(A["orbi"] + 1.0, "click"); add(A["orbi"] + 5.5, "burn")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
