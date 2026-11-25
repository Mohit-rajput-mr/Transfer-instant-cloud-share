import json
d = json.load(open("vo/lines.json")); A = {l["key"]: l["at"] for l in d["lines"]}; D = {l["key"]: l["dur"] for l in d["lines"]}
fr = lambda k, a: A[k] + D[k] * a
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(fr("hook", 0.05), "word"); add(fr("hook", 0.6), "strike")
for k in ["this", "fast", "late", "eyes", "chute", "bits", "words"]: add(A[k], "move")
add(fr("this", 0.15), "click"); add(A["fast"] + 0.3, "launch"); add(fr("late", 0.95), "arrive"); add(fr("eyes", 0.6), "done"); add(fr("chute", 0.2), "strike")
for i in range(4): add(fr("bits", 0.1) + (A["words"] - fr("bits", 0.1)) * i / 4, "click")
for i in range(4): add(fr("words", 0.05 + i * 0.18), "tap")
add(A["cracked"], "done"); add(A["orbi"] + 0.1, "word")
for i in range(4): add(fr("orbi", 0.45) + 0.3 * i, "tap")
add(fr("orbi2", 0.15), "click"); add(fr("orbi2", 0.3), "arrive"); add(fr("orbi2", 0.75), "tap"); add(fr("orbi2", 0.9), "done"); add(A["end"], "end")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
