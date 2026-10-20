# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(2.6, "done"); add(A["dots"] + 0.5, "launch"); add(A["ir"] + 0.5, "click"); add(A["dark"] + 0.5, "word")
add(A["depth"] + 0.5, "burn"); add(A["photo"] + 0.6, "strike"); add(A["vault"] + 0.5, "lid"); add(A["odds"] + 0.3, "word")
add(A["orbi"] + 0.6, "click"); add(A["orbi"] + 3.0, "burn")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
