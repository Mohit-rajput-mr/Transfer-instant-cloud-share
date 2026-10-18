# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(A["hook"], "word"); add(A["scene"], "move"); add(fr("scene", 0.45), "move")
add(A["mess"], "move")
for a, x in [(0.15, 0.55), (0.35, 0.7), (0.55, 0.85)]: add(fr("mess", a), "tap"); add(fr("mess", x), "strike")
add(fr("space", 0.0), "launch")
for f in (0.25, 0.5, 0.75): add(fr("space", f), "tap")
add(A["join"], "lid"); add(fr("join", 0.4), "arrive"); add(fr("join", 0.52), "arrive"); add(fr("join", 0.64), "arrive"); add(fr("join", 0.76), "arrive")
add(A["invisible"], "move"); add(fr("invisible", 0.55), "move")
add(A["task"], "launch"); add(fr("task", 0.5), "tap"); add(fr("route", 0.1), "tap"); add(fr("route", 0.45), "move")
for i in range(4): add(fr("route", 0.55) + i * 0.3, "click")
add(A["wire"], "launch"); add(fr("wire", 0.4), "tap"); add(fr("wire", 0.6), "move"); add(fr("wire", 0.8), "click"); add(fr("wire", 0.92), "click")
add(A["move"], "launch")
for f in (0.5, 0.63, 0.75): add(fr("move", f), "click")
add(fr("move", 0.84), "done")
add(A["log"], "move"); add(fr("log", 0.1), "tap")
add(A["cancel"], "launch"); add(fr("cancel", 0.55), "move"); add(fr("cancel", 0.78), "strike")
add(A["lock"], "move"); add(fr("lock", 0.3), "click"); add(fr("lock", 0.45), "move"); add(fr("lock", 0.75), "strike")
add(A["burn"], "move"); add(fr("burn", 0.55), "burn")
add(A["end"], "end")
json.dump({"events": ev, "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
