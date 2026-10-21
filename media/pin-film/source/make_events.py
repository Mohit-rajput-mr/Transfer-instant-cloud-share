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
for i in range(10): add(A["brute"] + 1.0 + i * 0.2, "tap")
add(A["chip"] + 1.5, "move"); add(A["chip"] + 4.5, "click")
add(A["delay"] + 2.0, "word"); add(A["delay"] + 3.0, "word"); add(A["delay"] + 4.0, "word")
add(A["wipe"] + 1.5, "burn")
add(A["key"] + 1.5, "move"); add(A["key"] + 4.5, "done")
add(A["orbi"] + 1.0, "click"); add(A["orbi"] + 6.5, "strike")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
