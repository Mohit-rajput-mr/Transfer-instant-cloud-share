# Sound cues for synth.py from the voice timings (vo/lines.json), matching film.js's beats.
import json
d = json.load(open("vo/lines.json")); L = {l["key"]: l for l in d["lines"]}; A = {k: l["at"] for k, l in L.items()}
def wt(k, word):
    ln = L[k]; ws = ln["text"].split(" "); tot = sum(len(w) + 2 for w in ws); nm = lambda w: "".join(c for c in w.lower() if c.isalnum())
    i = next(j for j, w in enumerate(ws) if nm(w) == nm(word)); return ln["at"] + sum(len(w) + 2 for w in ws[:i]) / tot * ln["dur"]
ev = []; add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in list(A)[1:-1]: add(A[k], "move")
add(wt("hook", "melting"), "burn"); add(wt("rack", "hundred"), "word"); add(wt("rack", "roughly"), "word")
for i in range(8): add(wt("rack", "roughly") + 0.1 + i * 0.12, "tap")
add(wt("air", "can't"), "strike"); add(wt("plate", "bolt") + 0.6, "lid"); add(wt("plate", "liquid"), "arrive")
add(wt("loop", "hands"), "done"); add(wt("tower", "dumps"), "launch"); add(wt("orbi", "signs"), "click"); add(wt("orbi", "bytes"), "launch")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues")
