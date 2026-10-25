import json
d = json.load(open("vo/lines.json")); L = {l["key"]: l for l in d["lines"]}; A = {k: l["at"] for k, l in L.items()}
def wt(k, word):
    ln = L[k]; ws = ln["text"].split(" "); tot = sum(len(w) + 2 for w in ws); nm = lambda w: "".join(c for c in w.lower() if c.isalnum())
    i = next(j for j, w in enumerate(ws) if nm(w) == nm(word)); return ln["at"] + sum(len(w) + 2 for w in ws[:i]) / tot * ln["dur"]
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in list(A)[1:-1]: add(A[k], "move")
add(wt("old", "snap"), "strike"); add(wt("old", "lose") + 0.5, "click"); add(wt("chip", "soldered"), "done")
add(wt("profile", "little"), "launch"); add(wt("profile", "number"), "lid"); add(wt("qr", "scan"), "word"); add(wt("qr", "where"), "arrive")
add(wt("multi", "switch"), "tap"); add(wt("orbi", "every"), "word"); add(wt("orbi", "grab"), "launch"); add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
