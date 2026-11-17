import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.38), "strike"); add(fr("hook", 0.62), "click"); add(fr("hook", 0.66), "done"); add(fr("hook", 0.86), "launch")
for k in ["parts", "pins", "block", "key", "align", "turn", "wrong", "combos", "history", "orbi", "orbi2"]: add(A[k], "move")
add(fr("parts", 0.05), "lid"); add(fr("parts", 0.4), "click"); add(fr("pins", 0.35), "click"); add(fr("pins", 0.55), "click"); add(fr("pins", 0.75), "click")
add(fr("block", 0.3), "word"); add(fr("block", 0.75), "strike")
for i in range(5): add(fr("key", 0.2 + i * 0.14), "tap")
add(fr("align", 0.55), "done"); add(fr("turn", 0.25), "click"); add(fr("turn", 0.6), "lid"); add(fr("turn", 0.85), "done")
add(fr("wrong", 0.45), "strike"); add(fr("wrong", 0.8), "word"); add(fr("combos", 0.6), "word"); add(fr("history", 0.05), "word"); add(fr("history", 0.62), "word")
add(fr("orbi", 0.15), "tap"); add(fr("orbi", 0.45), "lid"); add(fr("orbi2", 0.02), "launch"); add(fr("orbi2", 0.22), "arrive"); add(fr("orbi2", 0.62), "burn"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
