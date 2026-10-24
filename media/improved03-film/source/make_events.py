import json
d = json.load(open("vo/lines.json")); L = {l["key"]: l for l in d["lines"]}; A = {k: l["at"] for k, l in L.items()}
def wt(k, word, nth=0):
    ln = L[k]; ws = ln["text"].split(" "); tot = sum(len(w) + 2 for w in ws); nm = lambda w: "".join(c for c in w.lower() if c.isalnum())
    idx = [j for j, w in enumerate(ws) if nm(w) == nm(word)][nth]; return ln["at"] + sum(len(w) + 2 for w in ws[:idx]) / tot * ln["dur"]
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in list(A)[1:-1]: add(A[k], "move")
for i in range(12): add(A["type"] + 0.3 + i * 0.13, "tap")
add(wt("type", "stole"), "strike"); add(wt("tokens", "chopped"), "word"); add(wt("tokens", "number"), "click")
add(wt("map", "cat"), "arrive"); add(wt("map", "sandwich"), "arrive"); add(wt("attend", "stole"), "done")
for i in range(4): add(wt("guess", "again") + i * 0.45, "tap")
add(wt("orbi", "locked"), "lid"); add(wt("orbi", "before"), "launch"); add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
