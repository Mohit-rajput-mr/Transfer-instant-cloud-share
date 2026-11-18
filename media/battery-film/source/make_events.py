import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.4), "strike"); add(fr("hook", 0.86), "launch")
for k in ["parts", "ions", "flow", "warm", "cold", "sag", "stuck", "plating", "ev", "orbi", "orbi2"]: add(A[k], "move")
add(fr("parts", 0.3), "click"); add(fr("parts", 0.5), "click"); add(fr("parts", 0.72), "click")
add(fr("flow", 0.4), "launch"); add(fr("warm", 0.3), "done")
add(fr("cold", 0.3), "strike"); add(fr("sag", 0.5), "word"); add(fr("sag", 0.78), "strike")
add(fr("stuck", 0.6), "done"); add(fr("plating", 0.5), "strike"); add(fr("ev", 0.3), "word")
add(fr("orbi", 0.15), "tap"); add(fr("orbi", 0.45), "lid"); add(fr("orbi2", 0.02), "launch"); add(fr("orbi2", 0.22), "arrive"); add(fr("orbi2", 0.62), "burn"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
