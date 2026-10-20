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
add(A["hook"] + (A["ble"] - A["hook"]) * 0.45, "launch"); add(A["hook"] + (A["ble"] - A["hook"]) * 0.82, "done")
for i in range(4): add(A["ble"] + 0.8 + i * 1.0, "tap")
add(A["hash"] + (A["wifi"] - A["hash"]) * 0.75, "done")
add(A["wifi"] + 0.5, "launch"); add(A["wifi"] + (A["fast"] - A["wifi"]) * 0.45, "click")
add(A["fast"] + 0.6, "word"); add(A["fast"] + (A["range"] - A["fast"]) * 0.7, "done")
add(A["range"] + 1.2, "word")
add(A["crack"] + 0.8, "click"); add(A["crack"] + (A["android"] - A["crack"]) * 0.55, "strike")
add(A["android"] + 1.0, "launch"); add(A["android"] + (A["orbi"] - A["android"]) * 0.6, "done")
add(A["orbi"] + (A["end"] - A["orbi"]) * 0.3, "lid")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
