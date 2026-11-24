import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.5), "strike")
for k in ["real", "why", "sound", "pile", "tail", "drop", "rocket", "date", "mach", "today"]: add(A[k], "move")
add(fr("real", 0.25), "click"); add(fr("real", 0.62), "click"); add(fr("why", 0.6), "click"); add(fr("sound", 0.15), "click"); add(fr("pile", 0.6), "strike")
add(fr("tail", 0.3), "click"); add(fr("rocket", 0.35), "click"); add(fr("date", 0.05), "word"); add(fr("mach", 0.5), "strike"); add(fr("mach", 0.55), "click")
add(A["orbi"] + 0.1, "word"); add(fr("orbi", 0.4), "launch"); add(fr("orbi2", 0.4), "arrive"); add(fr("orbi3", 0.2), "done"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
