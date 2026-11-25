import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.55), "strike")
for k in ["this", "orbit", "water", "urine", "brine", "clean", "pct", "team"]: add(A[k], "move")
add(fr("this", 0.15), "click"); add(fr("this", 0.5), "click")
for i in range(16): add(fr("orbit", 0.05) + (A["water"] - fr("orbit", 0.05)) * i / 16, "tap")
add(fr("urine", 0.2), "click"); add(fr("brine", 0.2), "click"); add(fr("clean", 0.2), "click"); add(fr("pct", 0.45), "done"); add(fr("team", 0.3), "click")
add(A["orbi"] + 0.1, "word")
for i in range(8): add(fr("orbi", 0.3) + (fr("orbi", 0.9) - fr("orbi", 0.3)) * i / 8, "tap")
add(A["orbi2"], "arrive"); add(fr("orbi2", 0.3), "click"); add(fr("orbi2", 0.55), "click"); add(fr("orbi2", 0.8), "done"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
