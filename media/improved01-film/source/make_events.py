# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.js's shots.
import json
d = json.load(open("vo/lines.json"))
L = {l["key"]: l for l in d["lines"]}
A = {k: l["at"] for k, l in L.items()}
def wt(k, word):
    ln = L[k]; ws = ln["text"].split(" "); tot = sum(len(w) + 2 for w in ws)
    nm = lambda w: "".join(c for c in w.lower() if c.isalnum())
    i = next(j for j, w in enumerate(ws) if nm(w) == nm(word)); return ln["at"] + sum(len(w) + 2 for w in ws[:i]) / tot * ln["dur"]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in list(A)[1:-1]: add(A[k], "move")
add(wt("hook", "forty"), "word"); add(wt("hook", "with"), "word")
add(wt("scene", "snaps") + 0.15, "click")
add(wt("want", "send") - 0.05, "word")
for i in range(4): add(wt("send", "code") + i * 0.22, "tap")
add(wt("send", "send"), "launch")
for i in range(10): add(A["pop"] + 0.3 + i * 0.18, "arrive")
add(A["how"] + 0.05, "strike")
add(wt("lock", "locked") + 0.8, "lid")
add(wt("lock", "key"), "done")
add(wt("pieces", "fly"), "launch")
add(A["vault"] + 0.6, "lid")
add(wt("area", "rough"), "word")
add(A["unlock"] + 0.2, "tap")
for i in range(4): add(wt("unlock", "types") + 0.1 + i * 0.2, "tap")
add(wt("unlock", "click"), "done")
add(wt("burn", "vault"), "burn")
add(wt("burn", "no") + 0.4, "word")
add(A["space"] + 0.6, "done")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
