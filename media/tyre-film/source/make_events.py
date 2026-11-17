import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.32), "strike"); add(fr("hook", 0.36), "word"); add(fr("hook", 0.6), "word"); add(fr("hook", 0.82), "launch")
for k in ["cut", "tube", "inflate", "armour", "less", "liner", "bead", "seal", "nailT", "flatT", "nailL", "slow", "fix", "plug", "heat", "but", "verdict", "orbi", "orbi2"]: add(A[k], "move")
add(fr("cut", 0.05), "lid"); add(fr("cut", 0.36), "click"); add(fr("cut", 0.5), "click"); add(fr("cut", 0.68), "click")
add(fr("tube", 0.48), "click"); add(fr("inflate", 0.1), "launch"); add(fr("inflate", 0.7), "arrive")
add(fr("less", 0.08), "lid"); add(fr("less", 0.5), "word"); add(fr("liner", 0.1), "click"); add(fr("liner", 0.62), "click")
add(fr("bead", 0.12), "tap"); add(fr("bead", 0.5), "launch"); add(fr("bead", 0.86), "strike"); add(fr("bead", 0.87), "word")
add(fr("seal", 0.1), "done"); add(fr("nailT", 0.38), "strike"); add(fr("nailT", 0.62), "launch"); add(fr("flatT", 0.8), "word")
add(fr("nailL", 0.34), "strike"); add(fr("nailL", 0.55), "done"); add(fr("fix", 0.2), "lid"); add(fr("fix", 0.66), "click")
add(fr("plug", 0.2), "tap"); add(fr("plug", 0.55), "click"); add(fr("plug", 0.8), "word"); add(fr("but", 0.15), "tap"); add(fr("but", 0.58), "click")
add(fr("verdict", 0.12), "word"); add(fr("verdict", 0.72), "done")
add(fr("orbi", 0.7), "lid"); add(fr("orbi2", 0.05), "launch"); add(fr("orbi2", 0.3), "arrive"); add(fr("orbi2", 0.65), "burn"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
