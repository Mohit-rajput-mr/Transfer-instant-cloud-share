import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.55), "strike")
for k in ["this", "dish", "far", "gib", "cant", "pieces", "send", "back"]: add(A[k], "move")
add(fr("this", 0.3), "click"); add(fr("dish", 0.15), "click"); add(fr("far", 0.55), "arrive"); add(fr("gib", 0.3), "strike")
add(fr("chip", 0.5), "strike"); add(fr("pieces", 0.42), "strike"); add(fr("pieces", 0.55), "launch"); add(fr("pieces", 0.85), "done")
add(fr("send", 0.1), "launch"); add(fr("back", 0.25), "done")
add(A["orbi"] + 0.1, "word"); add(fr("orbi", 0.88), "click")
for i in range(6): add(A["orbi2"] + (A["orbi3"] - A["orbi2"]) * i / 6, "tap")
add(fr("orbi3", 0.2), "arrive"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
