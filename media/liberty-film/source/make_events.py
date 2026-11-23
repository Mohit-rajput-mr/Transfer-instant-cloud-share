import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.6), "strike")
for k in ["statue", "skin", "hollow", "frame", "pylon", "flex", "sway", "hammer", "brown", "green", "protect"]: add(A[k], "move")
add(fr("statue", 0.45), "click"); add(fr("skin", 0.2), "strike"); add(fr("hollow", 0.75), "word"); add(fr("pylon", 0.1), "click"); add(fr("pylon", 0.45), "click"); add(fr("pylon", 0.75), "click")
add(fr("flex", 0.6), "strike"); add(fr("brown", 0.2), "word"); add(fr("protect", 0.3), "click")
add(A["orbi"] + 0.1, "word"); add(fr("orbi", 0.3), "click"); add(fr("orbi2", 0.5), "launch"); add(fr("orbi3", 0.2), "arrive"); add(fr("orbi3", 0.9), "done"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
