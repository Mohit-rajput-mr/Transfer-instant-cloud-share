# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(A["hook"] + 1.0, "strike")
for i in range(5): add(0.3 + i * 0.45, "tap")
add(A["time"] + 0.8, "click")
add(A["open"] + 0.6, "click"); add(A["green"] + 0.8, "done"); add(A["red"] + 0.8, "lid")
add(A["wicks"] + 1.6, "word"); add(A["wicks"] + 3.0, "word")
for i in range(4): add(A["fight"] + 0.5 + i * (A["reject"] - A["fight"]) / 4, "move")
add(A["reject"] + 2.2, "strike")
add(A["stop"] + 1.4, "click"); add(A["stop"] + 2.4, "click")
for i in range(0, 36, 4): add(A["crowd"] + 0.4 + i * 0.05, "tap")
H = A["hunt"]; span = A["legal"] - H - 1.4
add(H + 0.4, "launch")
for i in range(0, 36, 3): add(H + 0.2 + span * (0.27 + i / 36 * 0.15), "burn")
add(H + 0.2 + span * 0.5, "lid"); add(A["snap"] + 0.3, "launch"); add(A["snap"] + 1.5, "done")
add(A["legal"] + 0.6, "click"); add(A["legal"] + (A["tip"] - A["legal"]) * 0.5, "click")
sp = A["end"] - A["tip"]
for f in (0.3, 0.35, 0.6): add(A["tip"] + sp * f, "tap")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
