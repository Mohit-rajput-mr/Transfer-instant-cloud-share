import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.6), "strike")
for k in ["this", "cloth", "air", "high", "rpm", "coax", "alone", "first", "field", "more"]: add(A[k], "move")
add(fr("this", 0.4), "click"); add(fr("cloth", 0.1), "click"); add(fr("cloth", 0.35), "strike"); add(fr("air", 0.2), "click"); add(fr("air", 0.45), "click"); add(fr("rpm", 0.7), "strike")
add(fr("coax", 0.1), "click"); add(fr("coax", 0.3), "click"); add(fr("first", 0.05), "launch"); add(fr("field", 0.3), "done"); add(fr("more", 0.8), "done")
add(A["orbi"] + 0.1, "word"); add(fr("orbi", 0.45), "click"); add(fr("orbi2", 0.45), "burn"); add(fr("orbi2", 0.6), "launch"); add(fr("orbi3", 0.2), "arrive"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
