# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(A["hook"], "word"); add(fr("hook", 0.32), "click"); add(fr("hook", 0.45), "move"); add(fr("hook", 0.62), "burn")
add(A["q"], "move"); add(fr("q", 0.5), "tap"); add(fr("q", 0.85), "launch")
add(A["bits"], "move"); add(fr("bits", 0.12), "strike"); add(fr("bits", 0.6), "word")
add(A["packets"], "burn"); add(fr("packets", 0.32), "launch"); add(fr("packets", 0.85), "done")
add(A["label"], "move"); add(fr("label", 0.3), "click")
add(A["wifi"], "move"); add(fr("wifi", 0.1), "launch"); add(fr("wifi", 0.55), "move"); add(fr("wifi", 0.7), "arrive")
add(A["hops"], "move")
for i in range(8): add(fr("hops", 0.15 + i * 0.1), "tap")
add(A["routes"], "arrive"); add(fr("routes", 0.5), "move"); add(fr("routes", 0.62), "word")
add(A["speed"], "launch"); add(fr("speed", 0.3), "strike")
add(A["arrive"], "arrive"); add(fr("arrive", 0.22), "move"); add(fr("arrive", 0.55), "click"); add(fr("arrive", 0.86), "launch"); add(fr("arrive", 0.98), "click")
add(A["whole"], "move"); add(fr("whole", 0.5), "done"); add(fr("whole", 0.6), "move"); add(fr("whole", 0.85), "arrive")
add(A["problem"], "move")
add(A["lock"], "move"); add(fr("lock", 0.18), "lid"); add(fr("lock", 0.22), "click"); add(fr("lock", 0.45), "move")
add(A["parts"], "move"); add(fr("parts", 0.15), "launch"); add(fr("parts", 0.45), "strike"); add(fr("parts", 0.7), "launch")
add(A["near"], "move"); add(fr("near", 0.25), "arrive"); add(fr("near", 0.85), "burn")
add(A["end"], "end")
json.dump({"events": ev, "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
