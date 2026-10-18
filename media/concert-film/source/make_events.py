# Sound cues for synth.py, placed from the voice timings (vo/lines.json) so they always match film.html's shots.
import json
d = json.load(open("vo/lines.json"))
A = {l["key"]: l["at"] for l in d["lines"]}
ev = []
add = lambda t, k: ev.append({"t": round(t, 2), "k": k})
add(A["hook"], "word")
# every cut gets a whoosh
for t in [A["scene"], A["scene"] + 2.2, A["want"], A["old"], A["send"], A["pop"], A["pop"] + 1.5, A["pop"] + 2.6, A["pop"] + 3.6,
          A["how"], A["pack"], A["pieces"], A["vault"], A["ring"], A["land"], A["land"] + 5.0, A["burn"]]:
    add(t, "move")
add(A["want"] + 1.6, "strike")                      # SEND IT!
dd = A["send"] - A["old"]
for f in (0.42, 0.8, 0.95):
    add(A["old"] + f * dd, "strike")                 # the old ways crossed out
tap = A["send"] + 3.0
add(tap, "tap"); add(tap + 0.1, "launch")            # launch
add(A["pop"] + 0.5, "arrive")                       # friends' phones light up
add(A["pop"] + 3.7, "strike")                       # ROCK!
add(A["how"], "word")
P = A["pack"]
add(P + 0.8, "tap"); add(P + 3.25, "lid"); add(P + 4.6, "click")   # frames in, lid shuts, code lock
S = A["pieces"]
add(S + 0.5, "click"); add(S + 1.0, "launch"); add(S + 3.4, "arrive")  # the notes fly together
add(A["vault"] + 2.3, "lid")                        # the shutter comes down
R = A["ring"]
add(R + 1.0, "launch"); add(R + 2.5, "arrive"); add(R + 5.4, "strike")  # the wave, never your seat
L = A["land"]
add(L + 0.2, "tap"); add(L + 0.4, "launch"); add(L + 3.1, "done"); add(L + 4.6, "arrive")
B = A["burn"]
add(B + 0.2, "click"); add(B + 1.3, "burn"); add(B + 2.2, "burn"); add(B + 3.6, "burn")
add(A["end"], "logo")
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
print(len(ev), "cues, duration", d["duration"])
