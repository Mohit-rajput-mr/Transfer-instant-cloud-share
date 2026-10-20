# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(2.2, "strike")
for i in range(6): add(A["ice"] + 0.6 + i * 1.1, "tap")
add(A["charge"] + 1.6, "word"); add(A["charge"] + 2.4, "word")
for i in range(6): add(A["leader"] + 0.6 + i * (A["streamer"] - A["leader"]) / 7, "click")
add(A["streamer"] + 1.2, "launch")
add(A["stroke"] + 0.1, "strike"); add(A["stroke"] + (A["thunder"] - A["stroke"]) * 0.3, "strike")
add(A["thunder"] + 0.2, "launch")
for i in range(6): add(A["count"] + (A["close"] - A["count"]) * (0.15 + i * 0.09), "tap")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
