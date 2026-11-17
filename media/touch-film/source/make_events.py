import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.14), "strike"); add(fr("hook", 0.42), "tap"); add(fr("hook", 0.44), "word"); add(fr("hook", 0.62), "word"); add(fr("hook", 0.86), "launch")
for k in ["layers", "grid", "field", "finger", "dip", "centre", "multi", "glove", "rain", "sausage", "old", "orbi", "orbi2"]: add(A[k], "move")
add(fr("layers", 0.06), "lid"); add(fr("layers", 0.3), "click"); add(fr("layers", 0.45), "click"); add(fr("layers", 0.7), "click")
add(fr("grid", 0.05), "click"); add(fr("grid", 0.7), "click"); add(fr("grid", 0.82), "click")
add(fr("field", 0.05), "tap"); add(fr("field", 0.3), "click"); add(fr("finger", 0.55), "launch")
add(fr("dip", 0.1), "strike"); add(fr("dip", 0.65), "word"); add(fr("centre", 0.6), "done")
add(fr("multi", 0.05), "word"); add(fr("multi", 0.72), "word"); add(fr("glove", 0.2), "strike"); add(fr("glove", 0.65), "done")
add(fr("rain", 0.1), "tap"); add(fr("rain", 0.4), "tap"); add(fr("sausage", 0.3), "tap"); add(fr("sausage", 0.62), "word")
add(fr("old", 0.3), "click"); add(fr("old", 0.72), "word")
add(fr("orbi", 0.15), "tap"); add(fr("orbi", 0.45), "lid"); add(fr("orbi2", 0.02), "launch"); add(fr("orbi2", 0.22), "arrive"); add(fr("orbi2", 0.62), "burn"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
