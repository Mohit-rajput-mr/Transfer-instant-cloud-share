# Sound cues for synth.py from the voice timings (vo/lines.json): a whoosh at every section, clicks on the UI beats.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(A["hook"], "word")
for k in ["open", "space", "task", "route", "move", "arrange", "cancel", "lock"]: add(A[k], "move")
add(fr("space", 0.5), "tap"); add(fr("space", 0.85), "done")
add(fr("task", 0.4), "tap"); add(fr("task", 0.85), "click")
add(A["submit"], "launch"); add(fr("submit", 0.7), "arrive")
for f in (0.3, 0.45, 0.6, 0.8): add(fr("route", f), "click")
for f in (0.3, 0.6): add(fr("color", f), "tap")
for f in (0.2, 0.5, 0.8): add(fr("move", f), "click")
add(fr("arrange", 0.3), "lid"); add(fr("arrange", 0.55), "done")
add(fr("cancel", 0.6), "strike")
add(A["end"], "end")
json.dump({"events": ev, "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
