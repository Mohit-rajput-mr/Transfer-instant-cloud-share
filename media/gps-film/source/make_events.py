import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(A["hook"], "launch"); add(fr("hook", 0.75), "strike")
for k in ["why", "sats", "shout", "listen", "dist", "bubble", "space", "catch", "fourth", "crazy", "gain", "drift", "fix", "reveal", "orbi", "orbi2"]: add(A[k], "move")
add(fr("why", 0.55), "launch"); add(fr("why", 0.7), "word")
for i in range(3): add(fr("shout", 0.1) + i * 0.6, "tap")
add(fr("listen", 0.55), "arrive"); add(fr("dist", 0.5), "click")
for a in (0.04, 0.32, 0.64): add(fr("bubble", a), "launch")
add(fr("bubble", 0.82), "done"); add(fr("space", 0.15), "strike"); add(fr("space", 0.62), "word")
add(fr("catch", 0.5), "strike"); add(fr("fourth", 0.1), "arrive"); add(fr("fourth", 0.7), "click")
add(A["crazy"], "strike"); add(fr("crazy", 0.55), "word"); add(fr("gain", 0.66), "click")
add(fr("drift", 0.3), "launch"); add(fr("fix", 0.2), "click"); add(fr("fix", 0.5), "done")
add(fr("reveal", 0.55), "word"); add(A["orbi"], "arrive")
for i in range(6): add(fr("orbi2", 0.1 + i * 0.03), "tap")
add(fr("orbi2", 0.45), "lid"); add(fr("orbi2", 0.78), "burn"); add(A["end"], "end")
json.dump({"events": ev, "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
