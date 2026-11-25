import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.6), "strike")
for k in ["this", "ocean", "dives", "plunge", "signal"]: add(A[k], "move")
add(fr("this", 0.15), "click"); add(fr("ocean", 0.4), "arrive"); add(fr("risk", 0.3), "strike")
for i in range(22): add(A["dives"] + (A["plunge"] - A["dives"]) * i / 22, "tap")
add(fr("plunge", 0.4), "launch"); add(fr("signal", 0.8), "end"); add(A["orbi"] + 0.1, "word"); add(fr("orbi2", 0.2), "burn"); add(fr("orbi2", 0.45), "done"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
