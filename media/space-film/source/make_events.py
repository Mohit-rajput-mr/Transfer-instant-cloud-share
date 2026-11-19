import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.36), "word"); add(fr("hook", 0.72), "strike")
for k in ["airlock", "lungs", "fizz", "boil", "swell", "brain", "cold", "sun", "ninety", "leblanc", "suit"]: add(A[k], "move")
add(fr("airlock", 0.15), "click"); add(fr("lungs", 0.12), "tap"); add(fr("lungs", 0.68), "tap"); add(fr("fizz", 0.08), "word"); add(fr("boil", 0.06), "click")
add(fr("swell", 0.2), "click"); add(fr("swell", 0.72), "click"); add(fr("brain", 0.55), "strike"); add(fr("cold", 0.15), "click"); add(fr("sun", 0.25), "click")
add(fr("ninety", 0.05), "click"); add(fr("leblanc", 0.02), "word"); add(fr("leblanc", 0.8), "word"); add(fr("suit", 0.05), "word")
add(A["orbi"] + 0.1, "word"); add(fr("orbi2", 0.3), "tap"); add(fr("orbi2", 0.45), "arrive"); add(fr("orbi3", 0.05), "click"); add(fr("orbi3", 0.48), "click"); add(fr("orbi3", 0.8), "burn"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
