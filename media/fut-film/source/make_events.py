# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(0.6, "word"); add(A["deal"] + (A["what"] - A["deal"]) * 0.6, "done")
add(A["what"] + 0.6, "click"); add(A["oblig"] + 0.6, "strike"); add(A["oblig"] + 1.2, "click")
for i in range(4): add(A["exch"] + 0.4 + i * 0.6, "tap")
add(A["spec"] + 0.4, "click"); add(A["spec"] + (A["margin"] - A["spec"]) * 0.4, "click")
add(A["margin"] + 0.4, "word"); add(A["margin"] + 1.6, "click")
sp = A["call"] - A["daily"]
for i in range(5): add(A["daily"] + i * sp / 5 + 0.1, "tap")
add(A["call"] + 1.0, "lid"); add(A["call"] + 1.6, "click")
sp = A["tip"] - A["why"]
for i in range(3): add(A["why"] + 0.4 + i * sp * 0.25, "tap")
add(A["tip"] + 0.2, "click")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
