import json
d = json.load(open("vo/lines.json")); L = {l["key"]: l for l in d["lines"]}; A = {k: l["at"] for k, l in L.items()}
def wt(k, word):
    ln = L[k]; ws = ln["text"].split(" "); tot = sum(len(w) + 2 for w in ws); nm = lambda w: "".join(c for c in w.lower() if c.isalnum())
    i = next(j for j, w in enumerate(ws) if nm(w) == nm(word)); return ln["at"] + sum(len(w) + 2 for w in ws[:i]) / tot * ln["dur"]
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in list(A)[1:-1]: add(A[k], "move")
for i in range(6): add(wt("scene", "website") - 0.2 + i * 0.2, "click")
add(wt("scene", "never"), "burn"); add(wt("secret", "same"), "launch"); add(wt("clock", "time"), "lid"); add(wt("blend", "drop") + 0.6, "lid"); add(wt("blend", "blender"), "launch")
add(wt("blend", "six"), "done"); add(wt("match", "same", 3), "done"); add(wt("steal", "peeks"), "click"); add(wt("steal", "later"), "burn"); add(wt("orbi", "pieces"), "launch"); add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
