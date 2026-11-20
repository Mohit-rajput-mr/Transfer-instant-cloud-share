import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.52), "strike"); add(fr("hook", 0.6), "word"); add(fr("hook", 0.78), "click")
for k in ["tower", "storms", "sick", "ball", "trick", "tuned", "pistons", "forty", "soudelor", "visit"]: add(A[k], "move")
add(fr("tower", 0.35), "tap"); add(fr("tower", 0.47), "tap"); add(fr("tower", 0.59), "tap"); add(fr("storms", 0.02), "word"); add(fr("storms", 0.24), "word")
add(fr("sick", 0.05), "click"); add(fr("sick", 0.3), "click"); add(fr("sick", 0.72), "word"); add(fr("ball", 0.24), "click"); add(fr("ball", 0.46), "click"); add(fr("ball", 0.8), "click")
add(fr("trick", 0.12), "click"); add(fr("trick", 0.45), "click"); add(fr("trick", 0.7), "click"); add(fr("pistons", 0.12), "word"); add(fr("pistons", 0.62), "word")
add(fr("forty", 0.15), "strike"); add(fr("soudelor", 0.02), "word"); add(fr("soudelor", 0.86), "word"); add(fr("visit", 0.02), "word")
add(A["orbi"] + 0.1, "word"); add(fr("orbi2", 0.08), "tap"); add(fr("orbi2", 0.5), "click"); add(fr("orbi2", 0.72), "arrive")
for i in range(3): add(A["orbi3"] + i * 0.35 * 1.0, "tap")
add(fr("orbi3", 0.35), "click"); add(fr("orbi3", 0.8), "burn"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
