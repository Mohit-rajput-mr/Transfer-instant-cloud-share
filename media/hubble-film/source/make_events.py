import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.55), "strike")
for k in ["this", "mirror", "blur", "edge", "why", "washer", "gap", "fix", "sharp"]: add(A[k], "move")
add(fr("this", 0.45), "click"); add(fr("mirror", 0.2), "click"); add(fr("blur", 0.1), "strike"); add(fr("edge", 0.5), "click"); add(fr("why", 0.6), "strike")
add(fr("washer", 0.55), "click"); add(fr("gap", 0.75), "strike"); add(fr("fix", 0.6), "done"); add(fr("sharp", 0.3), "done")
add(A["orbi"] + 0.1, "word")
for i in range(12):
    t = (fr("orbi", 0.25) + (A["orbi2"] - fr("orbi", 0.25)) * (i + 1) / 4) if i < 4 else (A["orbi2"] + D["orbi2"] * 0.78 * (i - 3) / 9)
    add(t, "click")
add(fr("orbi2", 0.8), "burn"); add(fr("orbi3", 0.2), "arrive"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
