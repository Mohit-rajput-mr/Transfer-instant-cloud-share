# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(2.4, "strike"); add(A["stripe"] + 1.2, "tap"); add(A["chip"] + 0.5, "click")
add(A["ask"] + 0.4, "launch"); add(A["ask"] + 1.2, "launch"); add(A["sign"] + 1.0, "launch"); add(A["bank"] + 0.2, "launch"); add(A["bank"] + 1.6, "done")
add(A["replay"] + 0.3, "launch"); add(A["replay"] + 1.6, "launch"); add(A["replay"] + (A["tamper"] - A["replay"]) * 0.6, "strike")
add(A["tamper"] + 1.2, "burn"); add(A["orbi"] + 1.0, "click")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
