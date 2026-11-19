import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.08), "word"); add(fr("hook", 0.5), "strike")
for k in ["block", "crank", "head", "intake", "comp", "power", "exhaust", "turns", "four", "fly", "speed", "heat", "otto", "orbi"]: add(A[k], "move")
for a in (0.02, 0.2, 0.4, 0.68): add(fr("block", a), "click")
for a in (0.08, 0.3, 0.72): add(fr("crank", a), "click")
for a in (0.18, 0.3, 0.5, 0.62, 0.82): add(fr("head", a), "click")
add(fr("turns", 0.62), "strike")
for a in (0.18, 0.25, 0.31, 0.38): add(fr("four", a), "tap")
add(fr("speed", 0.4), "click"); add(fr("speed", 0.72), "click"); add(fr("heat", 0.35), "strike"); add(fr("otto", 0.02), "word")
add(A["orbi"] + 3.2, "launch"); add(A["orbi2"] + 0.2, "tap"); add(fr("orbi2", 0.32), "strike")
add(fr("orbi2", 0.86), "arrive"); add(fr("orbi3", 0.2), "done"); add(fr("orbi3", 0.3), "click"); add(fr("orbi3", 0.52), "lid"); add(fr("orbi3", 0.78), "burn"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
