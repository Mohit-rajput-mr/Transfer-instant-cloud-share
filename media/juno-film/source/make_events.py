import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.6), "strike")
for k in ["this", "solar", "vault", "cam", "public"]: add(A[k], "move")
add(fr("this", 0.15), "click"); add(fr("solar", 0.9), "done"); add(fr("weak", 0.3), "strike"); add(fr("vault", 0.2), "click"); add(fr("cam", 0.4), "arrive"); add(fr("public", 0.1), "done")
add(A["orbi"] + 0.1, "word")
for i in range(3): add(fr("orbi", 0.3) + i * 0.8, "tap")
add(A["orbi2"], "arrive"); add(fr("orbi2", 0.6), "click"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
