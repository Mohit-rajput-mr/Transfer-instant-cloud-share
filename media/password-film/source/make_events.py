import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(A["hook"], "word"); add(fr("hook", 0.8), "strike")
for k in ["why", "stored", "blender", "oneway", "tiny", "login", "guess", "salt", "slow", "reveal", "orbi", "orbi2"]: add(A[k], "move")
add(fr("why", 0.6), "word"); add(fr("blender", 0.1), "tap"); add(fr("blender", 0.35), "launch"); add(fr("blender", 0.8), "arrive")
add(fr("oneway", 0.72), "strike"); add(fr("tiny", 0.1), "tap"); add(fr("tiny", 0.7), "arrive")
add(fr("login", 0.55), "click"); add(fr("login", 0.72), "done")
for i in range(5): add(fr("guess", 0.2 + i * 0.1), "tap")
add(fr("guess", 0.78), "strike"); add(fr("salt", 0.3), "click"); add(fr("salt", 0.8), "arrive")
add(fr("reveal", 0.4), "strike"); add(fr("orbi", 0.3), "launch"); add(fr("orbi", 0.8), "lid")
for i in range(12): add(fr("orbi2", 0.35) + i * 0.12, "tap")
add(fr("orbi2", 0.78), "burn"); add(A["end"], "end")
json.dump({"events": ev, "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
