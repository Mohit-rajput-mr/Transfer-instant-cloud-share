import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.4), "click")
for k in ["this", "mirror", "why", "cold", "shield", "launch", "unfold", "risk", "far", "align"]: add(A[k], "move")
add(fr("this", 0.45), "click"); add(fr("mirror", 0.15), "strike"); add(fr("mirror", 0.4), "click"); add(fr("why", 0.15), "click"); add(fr("cold", 0.25), "strike"); add(fr("shield", 0.35), "click")
add(fr("launch", 0.1), "launch"); add(fr("unfold", 0.98), "done"); add(fr("far", 0.2), "word"); add(fr("align", 0.6), "done")
add(A["orbi"] + 0.1, "word"); add(fr("orbi", 0.3), "click"); add(fr("orbi2", 0.1), "tap"); add(fr("orbi2", 0.15), "arrive"); add(fr("orbi3", 0.2), "done"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
