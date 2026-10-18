# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
for k in ["trail", "print", "vpn", "tor", "caught", "orbi", "lock", "trace", "burn"]:
    add(A[k], "move")
add(A["hook"] + 1.6, "strike")                                          # INVISIBLE?
for i in range(6): add(A["trail"] + 0.6 + i * 0.45, "tap")              # breadcrumbs
add(A["print"] + 0.4, "click"); add(A["print"] + (A["vpn"] - A["print"]) * 0.55, "click")
add(A["vpn"] + 0.5, "launch"); add(A["vpn"] + 2.6, "arrive")
for i in range(3): add(A["tor"] + 0.8 + (2 - i) * 0.5, "word")          # three layers wrap on
add(A["tor"] + 3.2, "launch")
P = A["peel"]
for b in (P + 0.3, P + 2.5, P + 4.7): add(b, "burn")                    # a layer pops off at each relay
add(P + 6.6, "arrive")
C = A["caught"]; add(C + 0.2, "lid"); add(C + 0.6, "strike")
span = A["orbi"] - C
for i in range(3): add(C + span * (0.45 + i * 0.15), "tap")
add(A["orbi"] + 0.3, "launch")
L = A["lock"]; sl = A["trace"] - L
add(L + 0.8, "click"); add(L + sl * 0.5, "launch"); add(L + sl * 0.82, "lid")
T = A["trace"]; add(T + 0.3, "click"); add(T + 3.3, "launch"); add(T + 3.5, "word")
B = A["burn"]; add(B + 0.1, "word"); add(B + 1.2, "burn"); add(B + 1.6, "burn")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
