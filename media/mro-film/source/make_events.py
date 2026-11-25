import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.85), "strike")
for k in ["what", "this", "cam", "shot", "first", "tiny"]: add(A[k], "move")
add(fr("what", 0.1), "click"); add(fr("what", 0.6), "strike"); add(fr("this", 0.25), "click"); add(fr("cam", 0.2), "click"); add(fr("shot", 0.6), "launch"); add(fr("shot", 0.9), "done")
add(fr("first", 0.15), "arrive"); add(fr("tiny", 0.5), "click"); add(A["orbi"] + 0.1, "word")
for i in range(5): add(A["orbi2"] + D["orbi2"] * 0.75 * i / 5, "tap")
add(fr("orbi2", 0.85), "done"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
