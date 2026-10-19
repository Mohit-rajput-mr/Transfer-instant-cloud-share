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
add(A["tower"] + 0.6, "click"); add(A["tower"] + 1.4, "lid")
add(A["old"] + 1.0, "launch"); add(A["old"] + (A["leo"] - A["old"]) * 0.5, "word")
add(A["leo"] + 0.6, "launch"); add(A["leo"] + 1.4, "done")
add(A["swarm"] + 0.8, "word")
for i in range(5): add(A["dish"] + 0.6 + i * 1.2, "tap")
add(A["ground"] + 0.6, "launch")
for i in range(6): add(A["hop"] + i * (A["orbi"] - A["hop"]) / 6, "tap")
add(A["orbi"] - 0.5, "done"); add(A["orbi"] + 0.6, "word")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
