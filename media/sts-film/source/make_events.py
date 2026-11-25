import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.6), "strike")
for k in ["real", "size", "heat", "alu", "tiles", "crush", "rcc", "colour", "glide", "steep", "orig"]: add(A[k], "move")
add(fr("real", 0.2), "click"); add(fr("real", 0.5), "click"); add(fr("size", 0.1), "click"); add(fr("size", 0.45), "click"); add(fr("heat", 0.3), "strike")
add(fr("alu", 0.1), "click"); add(fr("alu", 0.4), "click"); add(fr("tiles", 0.7), "done"); add(fr("rcc", 0.3), "click"); add(fr("colour", 0.05), "click"); add(fr("colour", 0.55), "click")
add(fr("glide", 0.15), "strike"); add(fr("orig", 0.5), "click")
add(A["orbi"] + 0.1, "word"); add(fr("orbi", 0.3), "click"); add(fr("orbi2", 0.1), "tap"); add(fr("orbi2", 0.75), "done"); add(fr("orbi3", 0.2), "arrive"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
