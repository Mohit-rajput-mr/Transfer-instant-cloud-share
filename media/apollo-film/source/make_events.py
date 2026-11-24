import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.5), "strike")
for k in ["real", "small", "speed", "air", "blunt", "shield", "burn", "silver", "blackout", "g", "chutes", "splash", "flip"]: add(A[k], "move")
add(fr("real", 0.5), "click"); add(fr("small", 0.62), "click"); add(fr("speed", 0.15), "strike"); add(fr("air", 0.45), "click")
add(fr("blunt", 0.05), "click"); add(fr("blunt", 0.3), "click"); add(fr("blunt", 0.6), "click"); add(fr("shield", 0.2), "click"); add(fr("shield", 0.5), "click"); add(fr("shield", 0.65), "click")
add(fr("burn", 0.25), "click"); add(fr("silver", 0.05), "word"); add(fr("blackout", 0.05), "strike"); add(fr("g", 0.05), "strike")
add(fr("chutes", 0.12), "click"); add(fr("chutes", 0.6), "click"); add(fr("splash", 0.05), "word"); add(fr("flip", 0.6), "done")
add(A["orbi"] + 0.1, "word"); add(fr("orbi2", 0.28), "burn"); add(fr("orbi2", 0.55), "launch"); add(fr("orbi3", 0.2), "arrive"); add(fr("orbi3", 0.9), "done"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
