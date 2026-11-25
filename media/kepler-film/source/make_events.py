import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.6), "strike")
for k in ["this", "dip", "wheels", "idea", "k2"]: add(A[k], "move")
add(fr("this", 0.15), "click"); add(fr("dip", 0.4), "strike"); add(fr("dip", 0.6), "done"); add(A["fail"] - 1.5, "strike"); add(fr("fail", 0.1), "strike")
add(fr("idea", 0.4), "arrive"); add(fr("balance", 0.6), "done"); add(fr("k2", 0.7), "end"); add(A["orbi"] + 0.1, "word"); add(fr("orbi", 0.6), "tap"); add(fr("orbi2", 0.3), "click"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
