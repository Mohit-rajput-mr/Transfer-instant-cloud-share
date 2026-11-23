import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.6), "strike")
for k in ["tower", "soil", "sink", "pause", "curve", "grow", "weights", "cables", "dig", "settle", "back", "stable"]: add(A[k], "move")
add(fr("tower", 0.2), "click"); add(fr("soil", 0.25), "click"); add(fr("sink", 0.5), "click"); add(fr("curve", 0.5), "word"); add(fr("grow", 0.8), "strike")
add(fr("weights", 0.3), "click"); add(fr("cables", 0.3), "click"); add(fr("dig", 0.6), "click"); add(fr("settle", 0.3), "word"); add(fr("back", 0.3), "strike"); add(fr("stable", 0.3), "word")
add(A["orbi"] + 0.1, "word"); add(fr("orbi2", 0.3), "click"); add(fr("orbi2", 0.6), "click"); add(fr("orbi2", 0.9), "click"); add(fr("orbi3", 0.45), "done"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
