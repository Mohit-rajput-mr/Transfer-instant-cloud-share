# Tighten the voice: speed every line up (pitch kept, ffmpeg atempo) and re-time lines.json with the same pauses.
import json, re, subprocess, sys, wave
TEMPO = float(sys.argv[1]) if len(sys.argv) > 1 else 1.06
gaps = {m.group(1): float(m.group(2)) for m in re.finditer(r'\("(\w+)",\s+".*?",\s+[0-9.]+,\s*([0-9.]+)\)', open("vo.py").read())}
d = json.load(open("vo/lines.json")); at = 0.35
for ln in d["lines"]:
    f = f"vo/{ln['key']}.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f, "-af", f"atempo={TEMPO}", "-c:a", "pcm_s16le", f + ".t.wav"], check=True)
    subprocess.run(["mv", f + ".t.wav", f], check=True)
    w = wave.open(f); ln["dur"] = round(w.getnframes() / w.getframerate(), 3); ln["at"] = round(at, 2)
    at += ln["dur"] + gaps[ln["key"]]
    ln["text"] = ln["text"].replace("thirty minutes", "30 minutes").replace("Orbi Transfer dot com", "orbitransfer.com")
d["duration"] = round(at + 1.8, 2)
json.dump(d, open("vo/lines.json", "w"), indent=1)
print("duration", d["duration"])
