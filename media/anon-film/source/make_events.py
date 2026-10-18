# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
keys = [l["key"] for l in d["lines"]]
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in keys[1:-1]:
    add(A[k], "move")
add(A["hook"] + 2.6, "strike")                                           # UNTRACEABLE?
add(A["pros"] + 0.6, "word"); add(A["tools"] + 0.3, "click")
add(A["slip"] + 0.2, "lid"); add(A["slip"] + 0.6, "strike")
span = A["leak"] - A["slips"]
for i in range(3): add(A["slips"] + span * (0.05 + i * 0.28), "tap")
sl = A["why"] - A["leak"]
for i in range(3): add(A["leak"] + 0.6 + i * 0.6, "click")
add(A["leak"] + sl * 0.66, "strike")                                     # LEAKED
add(A["why"] + 0.2, "launch"); add(A["why"] + 1.2, "word")
half = A["none"] + (A["direct"] - A["none"]) * 0.42
add(A["none"], "launch"); add(half, "click")
add(A["direct"] + 1.2, "strike"); add(A["direct"] + 2.6, "launch")
P = A["pieces"]; split = P + (A["vault"] - P) * 0.35
add(split, "burn")
for i in range(12): add(split + i * 0.12 + 1.6, "tap") if i % 3 == 0 else None
add(A["vault"] + 1.4, "lid")
C = A["code"]; cs = A["join"] - C
add(C + 1.0, "launch"); add(C + 3.0, "arrive")
for i in range(6): add(C + cs * (0.62 + i * 0.05), "tap")
add(C + cs * 0.92, "lid")
J = A["join"]; add(J + 0.4, "launch"); add(J + 0.4 + 1.2 + 1.5, "arrive"); add(J + 3.3, "click")
N = A["next"]; add(N + 0.4, "launch"); add(N + 1.6, "word")
B = A["burn"]; add(B + 0.1, "word"); add(B + 1.2, "burn"); add(B + 1.6, "burn")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
