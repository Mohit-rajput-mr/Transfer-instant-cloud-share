import json
d = json.load(open("vo/lines.json")); L = {l["key"]: l for l in d["lines"]}; A = {k: l["at"] for k, l in L.items()}
ev = [{"t": A[k], "k": "move"} for k in list(A)[1:-1]]
ev += [{"t": round(A["grow"] + 0.2 + i * L["grow"]["dur"] / 16, 2), "k": "tap"} for i in range(16)]
ev += [{"t": A["spot"] + 0.6, "k": "arrive"}, {"t": A["learn"] + 0.3, "k": "word"}, {"t": A["cta"] + 0.8, "k": "click"}, {"t": A["end"], "k": "logo"}]
json.dump({"events": sorted(ev, key=lambda e: e["t"]), "vo": A, "duration": d["duration"]}, open("events.json", "w"), indent=1)
