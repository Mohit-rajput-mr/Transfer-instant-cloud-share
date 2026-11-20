import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.4), "strike")
for k in ["tanks", "why", "pumps", "gg", "cool", "spark", "nozzle", "push", "nine"]: add(A[k], "move")
add(fr("tanks", 0.15), "click"); add(fr("tanks", 0.42), "click"); add(fr("tanks", 0.62), "word"); add(fr("why", 0.1), "tap"); add(fr("why", 0.45), "tap"); add(fr("why", 0.72), "tap")
add(fr("pumps", 0.2), "click"); add(fr("pumps", 0.55), "click"); add(fr("gg", 0.1), "click"); add(fr("gg", 0.65), "click"); add(fr("cool", 0.05), "word"); add(fr("cool", 0.48), "click")
add(fr("nozzle", 0.2), "click"); add(fr("nozzle", 0.6), "click"); add(fr("push", 0.08), "tap"); add(fr("push", 0.25), "tap"); add(fr("push", 0.62), "word"); add(fr("nine", 0.55), "word")
add(A["orbi"] + 0.1, "word"); add(fr("orbi2", 0.1), "tap"); add(fr("orbi2", 0.55), "tap"); add(fr("orbi2", 0.65), "arrive"); add(fr("orbi3", 0.1), "click"); add(fr("orbi3", 0.62), "burn"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
