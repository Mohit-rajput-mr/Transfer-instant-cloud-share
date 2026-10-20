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
add(A["hook"] + 4.0, "lid")
add(A["packets"] + 1.0, "burn")
for i in range(6): add(A["route"] + 1.0 + i * 0.6, "tap")
add(A["route"] + 6.0, "done")
add(A["loss"] + 1.0, "strike"); add(A["loss"] + 3.5, "launch"); add(A["loss"] + 5.0, "arrive")
add(A["check"] + 3.0, "done"); add(A["check"] + 6.0, "strike")
add(A["parts"] + 1.5, "launch"); add(A["parts"] + 5.5, "strike"); add(A["parts"] + 7.0, "launch")
add(A["orbi"] + 1.0, "click"); add(A["orbi"] + 6.5, "strike"); add(A["orbi"] + 8.5, "launch"); add(A["orbi"] + 11.0, "done")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
