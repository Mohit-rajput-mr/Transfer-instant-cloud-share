import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.55), "strike")
for k in ["bridge", "hang", "load", "towers", "anchor", "cable", "strands", "wires", "spin", "move", "range", "orange"]: add(A[k], "move")
add(fr("bridge", 0.1), "click"); add(fr("bridge", 0.5), "click"); add(fr("load", 0.05), "click"); add(fr("load", 0.35), "click"); add(fr("load", 0.7), "click"); add(fr("towers", 0.4), "strike")
add(fr("anchor", 0.3), "strike"); add(fr("cable", 0.3), "click"); add(fr("strands", 0.2), "word"); add(fr("wires", 0.8), "strike"); add(fr("range", 0.2), "click"); add(fr("orange", 0.15), "word")
add(A["orbi"] + 0.1, "word")
for i in range(4): add(A["orbi2"] + i * 0.5, "launch")
add(A["orbi3"] + 0.1, "click"); add(fr("orbi3", 0.5), "arrive"); add(fr("orbi3", 0.95), "done"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
