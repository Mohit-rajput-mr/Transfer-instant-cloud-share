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
add(A["bin"] + 0.6, "move"); add(A["bin"] + 3.5, "click")
add(A["index"] + 1.5, "word")
add(A["pointer"] + 1.0, "strike"); add(A["pointer"] + 5.0, "done")
add(A["recover"] + 0.6, "launch"); add(A["recover"] + 3.5, "done")
add(A["ssd"] + 3.0, "burn")
add(A["key"] + 3.5, "strike")
add(A["copies"] + 1.0, "click"); add(A["copies"] + 2.0, "click"); add(A["copies"] + 3.0, "click")
add(A["orbi"] + 1.0, "tap"); add(A["orbi"] + 6.0, "burn")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
