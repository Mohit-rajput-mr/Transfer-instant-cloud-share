# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(0.6, "launch"); add(A["demo"] - 1.6, "strike")
add(A["demo"] + 0.6, "word")
add(A["grav"] + 0.4, "lid"); add(A["grav"] + (A["fans"] - A["grav"]) * 0.45, "strike")
add(A["fans"] + 0.6, "launch"); add(A["skirts"] + 0.4, "click"); add(A["press"] + 0.6, "word")
add(A["num"] + 0.4, "burn"); add(A["num"] + 2.0, "done")
add(A["slow"] + 0.6, "word"); add(A["old"] + 0.6, "click")
add(A["thrust"] + 0.6, "launch"); add(A["thrust"] + 0.8, "burn"); add(A["thrust"] + 1.2, "burn")
sp = A["end"] - A["claims"]
for f in (0.05, 0.3, 0.55): add(A["claims"] + sp * f, "click")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
