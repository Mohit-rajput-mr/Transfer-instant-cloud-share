import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.45), "tap"); add(fr("hook", 0.55), "done"); add(fr("hook", 0.8), "word")
for k in ["why", "coil", "field", "induce", "wake", "talk", "key", "mix", "bank", "thief", "reveal", "orbi", "orbi2"]: add(A[k], "move")
add(fr("coil", 0.3), "click"); add(fr("field", 0.35), "launch"); add(fr("induce", 0.3), "arrive"); add(fr("wake", 0.15), "done")
for i in range(6): add(fr("talk", 0.6) + i * 0.22, "tap")
add(fr("key", 0.3), "lid")
for a in (0.15, 0.27, 0.39): add(fr("mix", a), "tap")
add(fr("mix", 0.65), "arrive"); add(fr("bank", 0.4), "click"); add(fr("bank", 0.5), "done"); add(fr("bank", 0.6), "word")
add(fr("thief", 0.5), "launch"); add(fr("thief", 0.78), "strike"); add(fr("reveal", 0.7), "word")
add(fr("orbi", 0.35), "lid")
for i in range(12): add(fr("orbi2", 0.32) + i * 0.09 * D["orbi2"] / D["orbi2"], "tap")
add(fr("orbi2", 0.78), "burn"); add(A["end"], "end")
json.dump({"events": ev, "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
