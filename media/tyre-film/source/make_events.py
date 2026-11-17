import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.3), "strike"); add(fr("hook", 0.36), "word"); add(fr("hook", 0.58), "word"); add(fr("hook", 0.84), "word")
for k in ["tube1", "tube2", "tube3", "less1", "less2", "less3", "nailT", "nailL", "fix", "heat", "but", "verdict", "orbi", "orbi2"]: add(A[k], "move")
add(fr("tube1", 0.3), "lid"); add(fr("tube2", 0.2), "launch"); add(fr("tube3", 0.2), "click")
add(fr("less1", 0.5), "done"); add(fr("less2", 0.55), "click"); add(fr("less3", 0.35), "arrive")
add(fr("nailT", 0.22), "strike"); add(fr("nailT", 0.3), "launch"); add(fr("nailT", 0.82), "word")
add(fr("nailL", 0.14), "strike"); add(fr("nailL", 0.35), "done")
add(fr("fix", 0.2), "lid"); add(fr("fix", 0.75), "click"); add(fr("fix", 0.9), "word")
add(fr("heat", 0.2), "tap"); add(fr("but", 0.35), "tap")
add(fr("verdict", 0.3), "word"); add(fr("verdict", 0.6), "done")
add(fr("orbi", 0.7), "lid"); add(fr("orbi2", 0.05), "launch"); add(fr("orbi2", 0.3), "arrive"); add(fr("orbi2", 0.7), "burn"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
