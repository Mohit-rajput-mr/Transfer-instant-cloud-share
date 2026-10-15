# Voiceover: Kokoro (open model, run locally), voice "af_heart", a touch faster for short-form video.
import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
M = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/tts"
k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
LINES = [
    ("hook",  "POV: you need this file on your phone. Right now."),
    ("pain",  "Email it to yourself? Find a cable? Nope."),
    ("meet",  "Open Orbi Transfer."),
    ("send",  "Drop it in. Hit send."),
    ("land",  "It lands on your phone. One tap. Saved."),
    ("free",  "No app. No login. Free."),
    ("team",  "Works with your whole team, too."),
    ("end",   "Orbi Transfer dot com. Link in bio."),
]
out = []
for key, text in LINES:
    # spoken as "Or-bee" (like "orbit" without the t); on screen it stays "Orbi"
    s, sr = k.create(text.replace("Orbi", "Orbee"), voice="af_heart", speed=1.1, lang="en-us")
    sf.write(f"vo/{key}.wav", s, sr)
    out.append({"key": key, "text": text, "dur": round(len(s) / sr, 3)})
    print(key, round(len(s) / sr, 2))
json.dump({"sr": sr, "lines": out}, open("vo/lines.json", "w"), indent=1)
print("total", round(sum(x["dur"] for x in out), 1))
