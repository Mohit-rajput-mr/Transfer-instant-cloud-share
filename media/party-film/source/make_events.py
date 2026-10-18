# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(A["hook"], "word")
for t in [A["scene"], A["scene"] + 2.2, A["want"], A["airdrop"], A["fail"] + 6.0, A["send"], A["pop"], A["pop"] + 1.4, A["pop"] + 2.5,
          A["how"], A["wifi"], A["room"], A["speed"], A["lock"], A["burn"]]:
    add(t, "move")
add(A["want"] + 0.9, "strike")                                   # NOW!
add(A["airdrop"] + 0.5, "launch"); add(A["airdrop"] + 2.2, "tap")  # the share sheet, first person
F = A["fail"]
add(F + 2.0, "click"); add(F + 3.3, "tap"); add(F + 4.3, "tap"); add(F + 6.3, "strike")  # toggle, one by one, laptop ✕
tap = A["send"] + 2.6
add(tap, "tap"); add(tap + 0.1, "launch")
P = A["pop"]
add(P + 0.4, "arrive"); add(P + 0.9, "click"); add(P + 1.6, "click"); add(P + 2.7, "done")
W = A["wifi"]
for k in range(5): add(W + 0.5 + k * 1.4, "word")                  # wifi rings
add(W + 3.0, "click"); add(W + 6.0, "arrive")                     # fingerprint, NEARBY
R = A["room"]
add(R + 2.4, "launch"); add(R + 3.2, "arrive")                    # the note up, the ring out
S = A["speed"]
for b in range(3): add(S + 1.6 + b * 1.3, "launch")                # three at a time
add(S + 3.6, "burn"); add(S + 4.2, "strike")                      # one drops, goes again
add(S + 6.2, "launch"); add(S + 7.2, "launch"); add(S + 8.6, "done")
L = A["lock"]
add(L + 1.2, "move"); add(L + 4.6, "done")                        # stirred into a key
for i in range(12): add(L + 6.4 + i * 0.28, "tap")                 # wrong guesses
add(L + 6.4 + 12 * 0.28, "lid")                                   # locked
B = A["burn"]
add(B + 0.2, "click"); add(B + 1.3, "burn"); add(B + 2.2, "burn")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
