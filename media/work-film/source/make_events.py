# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in ["mess", "intern", "open", "drop", "wifi", "notes", "task", "route", "under", "private", "done"]:
    add(A[k], "move")
add(A["hook"] + 1.5, "strike")                                          # WHERE?!
M = A["mess"]; span = A["intern"] - M - 1.0
for i in range(5): add(M + 0.3 + i * span / 5, "tap")                    # the cards pile up
add(A["open"] + 0.2, "launch")                                          # the big screen
add(A["drop"] + 0.5, "click"); add(A["drop"] + 1.2, "launch")
for i in range(6): add(A["drop"] + 2.0 + i * 0.08, "arrive")            # every screen
for k in range(4): add(A["wifi"] + 0.4 + k * 1.6, "word")                # wifi rings
add(A["wifi"] + 1.0, "click")
add(A["notes"] + 1.3, "tap")
for i in range(4): add(A["notes"] + 3.2 + i * 0.25, "click")            # notes pop up
add(A["task"] + 1.5, "tap"); add(A["task"] + 2.0, "launch"); add(A["task"] + 3.0, "arrive")
R = A["route"]
for x in (1.3, 2.4, 3.4): add(R + x, "done")
U = A["under"]; add(U + 2.2, "launch"); add(U + 3.1, "arrive")
P = A["private"]; add(P + 0.3, "word"); add(P + 1.3, "lid")
add(A["done"] + 0.75, "strike"); add(A["done"] + 0.8, "done")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
