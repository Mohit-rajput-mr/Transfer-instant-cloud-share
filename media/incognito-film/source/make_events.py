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
add(A["hook"] + 2.8, "lid")
for i in range(5): add(A["forget"] + 2.5 + i * 0.9, "tap")
for i in range(3): add(A["see"] + 0.5 + i * 1.6, "click")
add(A["ip"] + (A["login"] - A["ip"]) * 0.35, "done")
add(A["login"] + 1.2, "strike")
add(A["google"] + 0.6, "word")
add(A["real"] + 0.6, "done"); add(A["real"] + (A["orbi"] - A["real"]) * 0.45, "strike")
add(A["orbi"] + 1.0, "lid"); add(A["orbi"] + (A["end"] - A["orbi"]) * 0.45, "word")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
