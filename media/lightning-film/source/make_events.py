import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.2), "word"); add(fr("hook", 0.6), "strike")
for k in ["storm", "leader", "streamer", "flash", "heart", "restart", "marks", "ground", "car", "roy"]: add(A[k], "move")
for a in (0.1, 0.18, 0.55, 0.62): add(fr("storm", a), "click")
add(fr("strike", 0.3), "click"); add(fr("strike", 0.5), "click"); add(fr("strike", 0.7), "click")
add(fr("flash", 0.15), "click"); add(fr("flash", 0.75), "word"); add(fr("heart", 0.32), "click"); add(fr("heart", 0.62), "click")
for a in (0.35, 0.6, 0.9): add(fr("restart", a), "tap")
add(fr("marks", 0.3), "click"); add(fr("thunder", 0.1), "word"); add(fr("ground", 0.05), "click"); add(fr("ground", 0.62), "click")
add(fr("car", 0.42), "tap"); add(fr("car", 0.62), "tap"); add(fr("roy", 0.0), "word")
add(A["orbi"] + 0.2, "word"); add(fr("orbi2", 0.1), "tap"); add(fr("orbi2", 0.42), "arrive"); add(A["orbi3"] + 0.1, "click")
add(fr("orbi3", 0.55), "lid"); add(fr("orbi3", 0.78), "burn"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
