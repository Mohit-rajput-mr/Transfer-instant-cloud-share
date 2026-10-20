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
add(A["plain"] + (A["keys"] - A["plain"]) * 0.35, "click")
add(A["keys"] + 1.6, "launch"); add(A["keys"] + (A["lock"] - A["keys"]) * 0.6, "word")
add(A["lock"] + (A["send"] - A["lock"]) * 0.45, "lid"); add(A["lock"] + (A["send"] - A["lock"]) * 0.92, "done")
add(A["send"] + (A["open"] - A["send"]) * 0.15, "lid")
add(A["open"] + 1.0, "done")
for i in range(6): add(A["guess"] + 0.6 + i * 0.7, "tap")
add(A["catch"] + (A["orbi"] - A["catch"]) * 0.5, "strike")
for i in range(6): add(A["orbi"] + (A["end"] - A["orbi"]) * 0.4 + i * 0.25, "tap")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
