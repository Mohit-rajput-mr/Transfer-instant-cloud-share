# After re-recording some lines (python vo.py <keys>): speed only those lines up (tempo.py does all) and re-time lines.json.
import json, re, subprocess, sys, wave
keys = sys.argv[1:]
gaps = {m.group(1): float(m.group(2)) for m in re.finditer(r'\("(\w+)",\s+".*?",\s+[0-9.]+,\s*([0-9.]+)\)', open("vo.py").read())}
for k in keys:
    f = f"vo/{k}.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f, "-af", "atempo=1.06", "-c:a", "pcm_s16le", f + ".t.wav"], check=True)
    subprocess.run(["mv", f + ".t.wav", f], check=True)
d = json.load(open("vo/lines.json")); at = 0.35
for ln in d["lines"]:
    w = wave.open(f"vo/{ln['key']}.wav"); ln["dur"] = round(w.getnframes() / w.getframerate(), 3); ln["at"] = round(at, 2); at += ln["dur"] + gaps[ln["key"]]
d["duration"] = round(at + 1.8, 2)
json.dump(d, open("vo/lines.json", "w"), indent=1)
print("duration", d["duration"])
