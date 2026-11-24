import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.55), "strike")
for k in ["real", "build", "engine", "props", "tunnel", "lift", "warp", "day", "rail", "twelve", "four", "gust"]: add(A[k], "move")
add(fr("real", 0.5), "click"); add(fr("build", 0.05), "click"); add(fr("engine", 0.15), "click"); add(fr("engine", 0.55), "click"); add(fr("props", 0.2), "click"); add(fr("props", 0.45), "click")
add(fr("tunnel", 0.08), "click"); add(fr("tunnel", 0.25), "click"); add(fr("tunnel", 0.6), "word"); add(fr("lift", 0.32), "click"); add(fr("lift", 0.58), "strike")
add(fr("warp", 0.12), "click"); add(fr("warp", 0.5), "click"); add(fr("day", 0.05), "word"); add(fr("rail", 0.72), "launch"); add(fr("twelve", 0.92), "done")
for i in range(4): add(fr("four", 0.05 + i * 0.14), "click")
add(fr("gust", 0.6), "strike")
add(A["orbi"] + 0.1, "word"); add(fr("orbi", 0.25), "click"); add(fr("orbi2", 0.55), "tap"); add(fr("orbi2", 0.85), "done"); add(fr("orbi3", 0.2), "arrive"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
