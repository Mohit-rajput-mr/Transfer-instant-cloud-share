import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.08), "strike"); add(fr("hook", 0.4), "word"); add(fr("hook", 0.66), "word"); add(fr("hook", 0.82), "launch")
for k in ["cut", "loop", "fluid", "boil", "evap", "stuck", "comp", "hot", "cond", "cap", "again", "thermo", "door", "seal", "sum", "orbi", "orbi2"]: add(A[k], "move")
add(fr("cut", 0.04), "lid"); add(fr("cut", 0.36), "click"); add(fr("cut", 0.42), "click"); add(fr("cut", 0.45), "click")
for f in [0.3, 0.48, 0.64, 0.8]: add(fr("loop", f), "click")
add(fr("fluid", 0.12), "tap"); add(fr("fluid", 0.78), "strike"); add(fr("fluid", 0.79), "word")
add(fr("boil", 0.2), "launch"); add(fr("evap", 0.15), "launch"); add(fr("evap", 0.5), "click")
add(fr("comp", 0.06), "click"); add(fr("comp", 0.2), "click"); add(fr("comp", 0.62), "strike"); add(fr("comp", 0.63), "word"); add(fr("comp", 0.83), "word")
add(fr("hot", 0.1), "click"); add(fr("hot", 0.6), "word"); add(fr("cond", 0.1), "launch"); add(fr("cond", 0.8), "word")
add(fr("cap", 0.05), "click"); add(fr("cap", 0.52), "lid"); add(fr("cap", 0.62), "word"); add(fr("again", 0.72), "word")
add(fr("thermo", 0.05), "click"); add(fr("thermo", 0.6), "done"); add(fr("door", 0.08), "lid"); add(fr("door", 0.48), "strike"); add(fr("door", 0.49), "word")
add(fr("seal", 0.62), "done"); add(fr("sum", 0.08), "word"); add(fr("sum", 0.7), "word")
add(fr("orbi", 0.55), "lid"); add(fr("orbi2", 0.02), "launch"); add(fr("orbi2", 0.22), "arrive"); add(fr("orbi2", 0.62), "burn"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
