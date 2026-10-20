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
add(A["hook"] + 4.0, "lid"); add(A["inside"] - 1.5, "done")
for i in range(5): add(A["inside"] + 1.5 + i * 0.6, "tap")
add(A["graphite"] + 0.6, "word")
add(A["silicon"] + 0.8, "launch"); add(A["silicon"] + (A["swell"] - A["silicon"]) * 0.7, "done")
add(A["swell"] + 1.4, "word")
for i in range(3): add(A["crack"] + (A["sponge"] - A["crack"]) * (i / 3.2 + 0.1), "click")
add(A["crack"] + (A["sponge"] - A["crack"]) * 0.75, "strike")
add(A["sponge"] + 0.6, "launch"); add(A["room"] + 0.6, "lid")
add(A["mix"] + 1.0, "word"); add(A["mix"] + (A["result"] - A["mix"]) * 0.5, "word")
add(A["result"] + 0.5, "done")
for i in range(6): add(A["orbi"] + 1.5 + i * 0.9, "tap")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
