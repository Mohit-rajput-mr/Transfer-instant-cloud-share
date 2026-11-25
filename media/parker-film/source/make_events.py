import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.6), "strike")
for k in ["this", "close", "speed", "hot", "shield", "cool", "alone", "wait"]: add(A[k], "move")
add(fr("this", 0.2), "click"); add(fr("close", 0.65), "arrive"); add(fr("speed", 0.05), "launch"); add(fr("speed", 0.5), "move"); add(fr("speed", 0.9), "done")
add(fr("hot", 0.7), "strike"); add(fr("shield", 0.3), "click"); add(fr("cool", 0.2), "click"); add(fr("wait", 0.7), "done")
add(A["orbi"] + 0.1, "word")
for i in range(5): add(fr("orbi", 0.5) if i == 0 else A["orbi2"] + 1.1 * (i - 1), "tap")
add(fr("orbi3", 0.1), "arrive"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
