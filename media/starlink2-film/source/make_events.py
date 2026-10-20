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
add(A["tower"] + 0.6, "click"); add(A["tower"] + 2.0, "lid")
add(A["dish"] + 0.8, "done")
for i in range(5): add(A["array"] + 0.8 + i * 0.9, "tap")
add(A["sats"] + 0.8, "word")
add(A["fast"] + 0.6, "launch")
add(A["lag"] + 1.0, "word"); add(A["lag"] + (A["ground"] - A["lag"]) * 0.6, "click")
add(A["ground"] + 0.6, "launch")
add(A["laser"] + 1.0, "strike")
add(A["vacuum"] + 1.0, "word")
for i in range(6): add(A["hop"] + i * (A["orbi"] - A["hop"]) / 7, "tap")
add(A["orbi"] - 0.5, "done"); add(A["orbi"] + 0.6, "lid")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
