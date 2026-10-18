# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in ["origin", "finders", "grid", "zigzag", "mask", "damage", "repair", "big", "end"]:
    add(A[k], "move")
add(0.4, "launch"); add(A["hook"] + 2.6, "done")                      # the phone comes in, the code reads
add(A["origin"] + 0.4, "click")                                        # 1994
for i in range(3): add(A["finders"] + 2.0 + i * 0.35, "tap")           # three finders light up
add(A["grid"] + 1.6, "click")
for i in range(6): add(A["zigzag"] + 0.8 + i * 0.7, "word")            # the snake
add(A["mask"] + 2.2, "launch")                                         # the mask sweeps in
SP = A["damage"] + 2.2
add(SP - 0.7, "strike"); add(SP, "burn")                               # the cup tips, the splash
add(A["damage"] + 3.4, "launch"); add(A["repair"] - 0.3, "done")       # scan again: still reads
add(A["repair"] + 1.0, "arrive")
add(A["big"] + 2.4, "launch"); add(A["big"] + 4.0, "done")
add(d["duration"] - 2.2, "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
