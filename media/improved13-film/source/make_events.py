import json
d = json.load(open("vo/lines.json")); L = {l["key"]: l for l in d["lines"]}; A = {k: l["at"] for k, l in L.items()}
def wt(k, word):
    ln = L[k]; ws = ln["text"].split(" "); tot = sum(len(w) + 2 for w in ws); nm = lambda w: "".join(c for c in w.lower() if c.isalnum())
    i = next(j for j, w in enumerate(ws) if nm(w) == nm(word)); return ln["at"] + sum(len(w) + 2 for w in ws[:i]) / tot * ln["dur"]
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in list(A)[1:-1]: add(A[k], "move")
add(wt("scene", "concrete"), "burn"); add(wt("scene", "blue"), "click")
for i in range(10): add(wt("listen", "listens") + i * 0.14, "click")
add(A["map"] + 0.3, "launch")
for i in range(3): add(wt("circles", "draw") + i * 0.35, "lid")
add(wt("circles", "that's"), "done"); add(wt("cell", "towers"), "move"); add(wt("orbi", "rough"), "done"); add(wt("orbi", "never"), "burn"); add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
