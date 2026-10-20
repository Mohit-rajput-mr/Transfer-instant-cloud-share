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
add(A["hook"] + 3.0, "click"); add(A["hook"] + 3.6, "click"); add(A["hook"] + 4.2, "click")
add(A["radio"] + 0.8, "word"); add(A["radio"] + 4.5, "move")
for i in range(12): add(A["hop"] + 3.0 + i * 0.35, "tap")
add(A["pair"] + 1.0, "launch"); add(A["pair"] + 2.6, "arrive"); add(A["pair"] + 6.0, "done")
for i in range(6): add(A["ble"] + 2.0 + i * 0.9, "tap")
add(A["range"] + 0.8, "move")
add(A["orbi"] + 1.2, "click"); add(A["orbi"] + 4.5, "done"); add(A["orbi"] + 8.0, "launch")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
