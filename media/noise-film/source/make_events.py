import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "strike"); add(fr("hook", 0.35), "tap"); add(fr("hook", 0.62), "word"); add(fr("hook", 0.86), "launch")
for k in ["wave", "ear", "flight", "idea", "cut", "mic", "flip", "mix", "cancel", "fast", "limits", "trans", "orbi", "orbi2"]: add(A[k], "move")
add(fr("wave", 0.3), "click"); add(fr("wave", 0.5), "click"); add(fr("ear", 0.05), "word"); add(fr("ear", 0.35), "word"); add(fr("ear", 0.62), "word")
add(fr("flight", 0.05), "strike"); add(fr("flight", 0.7), "lid"); add(fr("idea", 0.6), "done")
add(fr("cut", 0.05), "lid"); add(fr("cut", 0.45), "click"); add(fr("cut", 0.65), "click"); add(fr("cut", 0.8), "click")
add(fr("mic", 0.3), "launch"); add(fr("flip", 0.1), "strike"); add(fr("flip", 0.7), "word"); add(fr("mix", 0.4), "launch")
add(fr("cancel", 0.6), "done"); add(fr("fast", 0.2), "tap"); add(fr("limits", 0.52), "strike"); add(fr("limits", 0.82), "click"); add(fr("trans", 0.3), "word")
add(fr("orbi", 0.15), "tap"); add(fr("orbi", 0.45), "lid"); add(fr("orbi2", 0.02), "launch"); add(fr("orbi2", 0.22), "arrive"); add(fr("orbi2", 0.62), "burn"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
