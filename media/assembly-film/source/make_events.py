# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(1.2, "launch")
add(A["line"] + 3.2, "click"); add(A["line"] + 4.0, "click"); add(A["line"] + 4.8, "click")
add(A["ford"] + 1.0, "strike"); add(A["ford"] + 5.0, "word")
add(A["robots"] + 1.0, "burn")
add(A["check"] + 2.0, "done")
add(A["orbi"] + 3.0, "tap"); add(A["orbi"] + 5.5, "tap"); add(A["orbi"] + 7.0, "done")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
