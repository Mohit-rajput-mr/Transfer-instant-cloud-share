import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(0.4, "word")
for k in ["p1", "p2", "p3", "p4", "q", "s1", "s2", "s3", "s4", "a1", "a2", "a3", "w1", "w2", "off", "r1"]: add(A[k], "move")
for i in range(6): add(A["p1"] + 0.1 + i * (D["p1"] - 0.6) / 6, "click")
for i in range(3): add(A["p2"] + 0.1 + i * (D["p2"] - 0.6) / 3, "strike")
for i in range(3): add(fr("p3", 0.18) + i * (D["p3"] * 0.82) / 3.2, "click")
for i in range(3): add(A["p4"] + 0.2 + i * 0.45, "tap")
for i in range(6): add(fr("q", 0.12) + i * (D["q"] * 0.88) / 6.5, "tap")
add(fr("s1", 0.5), "launch"); add(fr("s1", 0.95), "arrive"); add(fr("s2", 0.15), "lid"); add(fr("s2", 0.75), "burn"); add(A["s3"] + 0.2, "strike")
for f in [0, 0.3, 0.55, 0.78]: add(fr("s4", f) + 0.1, "tap")
add(fr("a1", 0.5), "click"); add(fr("a2", 0.35), "arrive"); add(fr("a3", 0.3), "launch"); add(fr("a3", 0.45), "tap"); add(fr("a3", 0.85), "done"); add(fr("a3", 0.86), "burn")
add(fr("w1", 0.4), "click"); add(fr("w2", 0.1), "click"); add(fr("w2", 0.45), "click"); add(fr("off", 0.1), "tap"); add(fr("off", 0.6), "arrive"); add(fr("r1", 0.45), "strike"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
