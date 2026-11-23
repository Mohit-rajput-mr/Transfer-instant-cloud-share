import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.6), "strike")
for k in ["tower", "iron", "summer", "winter", "sun", "lean", "loop", "parts", "rivets", "hot", "cool", "wind", "curve"]: add(A[k], "move")
for a in (0.25, 0.37, 0.49): add(fr("tower", a), "tap")
add(fr("summer", 0.15), "click"); add(fr("summer", 0.6), "strike"); add(fr("winter", 0.3), "click"); add(fr("sun", 0.2), "word"); add(fr("lean", 0.3), "click")
add(fr("loop", 0.4), "word"); add(fr("parts", 0.9), "strike"); add(fr("rivets", 0.9), "strike"); add(fr("cool", 0.3), "click"); add(fr("wind", 0.55), "click"); add(fr("curve", 0.45), "word")
add(A["orbi"] + 0.1, "word"); add(fr("orbi2", 0.2), "launch"); add(fr("orbi2", 0.8), "arrive"); add(fr("orbi3", 0.2), "click"); add(fr("orbi3", 0.5), "launch"); add(fr("orbi3", 0.95), "done"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
