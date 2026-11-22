import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.45), "strike"); add(fr("hook", 0.7), "word")
for k in ["tower", "enemy", "vortex", "rock", "flower", "setbacks", "confuse", "sway", "core", "pump", "piles", "spire"]: add(A[k], "move")
for a in (0.3, 0.42, 0.54): add(fr("tower", a), "tap")
add(fr("enemy", 0.45), "strike"); add(fr("vortex", 0.05), "word"); add(fr("rock", 0.2), "click"); add(fr("flower", 0.05), "word")
for i in range(27): add(A["setbacks"] + D["setbacks"] * i / 27, "click")
add(fr("confuse", 0.62), "strike"); add(fr("core", 0.12), "click"); add(fr("core", 0.55), "click"); add(fr("pump", 0.75), "strike")
add(fr("piles", 0.05), "word"); add(fr("piles", 0.25), "click"); add(fr("piles", 0.55), "click"); add(fr("spire", 0.15), "click")
add(A["orbi"] + 0.1, "word"); add(fr("orbi2", 0.1), "tap")
for i in range(4): add(A["orbi2"] + i * 0.9, "launch")
add(fr("orbi3", 0.15), "click"); add(fr("orbi3", 0.55), "arrive"); add(fr("orbi3", 0.95), "done"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
