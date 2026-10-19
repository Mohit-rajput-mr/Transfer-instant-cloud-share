# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(0.6, "launch"); add(A["pixel"] + 0.6, "click"); add(A["count"] + 0.4, "strike")
add(A["organic"] + 0.5, "word"); add(A["black"] + 0.3, "lid"); add(A["stack"] + 0.3, "launch")
add(A["glow"] + 0.3, "click"); add(A["touch"] + 0.3, "click"); add(A["fold"] + 0.5, "word"); add(A["hz"] + 0.6, "burn"); add(A["orbi"] + 0.6, "done")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
