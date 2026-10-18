# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(A["hook"] + 0.4, "strike")
add(A["think"] + 0.6, "click")
add(A["blend"] + 0.3, "launch"); add(A["blend"] + 1.2, "burn")
for i in range(2): add(A["same"] + 0.6 + i * 0.8, "click")
add(A["same"] + (A["oneway"] - A["same"]) * 0.6, "lid")
for i in range(3): add(A["oneway"] + 0.2 + i * 0.25 + 0.7, "tap")
add(A["oneway"] + (A["login"] - A["oneway"]) * 0.55 + 0.6, "strike")
add(A["login"] + 0.4, "launch"); add(A["login"] + (A["salt"] - A["login"]) * 0.45, "done")
for i in range(6): add(A["salt"] + 0.4 + i * 0.3, "tap")
add(A["leak"] + 0.4, "lid"); add(A["leak"] + 1.0, "launch")
for i in range(4): add(A["guess"] + 0.3 + i * (A["slow"] - A["guess"]) * 0.2 + 0.7, "tap")
add(A["slow"] + 0.3, "word")
add(A["orbi"] + 0.6, "click")
add(A["rounds"] + 0.3, "burn"); add(A["rounds"] + (A["tries"] - A["rounds"]) * 0.5, "launch")
for i in range(6): add(A["tries"] + 0.3 + i * 0.25, "tap")
add(A["tries"] + 2.0, "lid")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
