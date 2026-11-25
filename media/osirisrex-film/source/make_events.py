import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.6), "strike")
for k in ["this", "touch", "home", "stuck"]: add(A[k], "move")
add(fr("this", 0.15), "click"); add(fr("touch", 0.35), "strike"); add(fr("sink", 0.5), "strike"); add(fr("thrust", 0.4), "launch"); add(fr("home", 0.1), "arrive")
add(fr("stuck", 0.6), "strike"); add(fr("tools", 0.4), "done"); add(A["orbi"] + 0.1, "word"); add(fr("orbi2", 0.1), "tap"); add(fr("orbi2", 0.3), "arrive"); add(fr("orbi2", 0.75), "tap"); add(fr("orbi2", 0.85), "done"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
