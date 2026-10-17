# Voiceover: Kokoro (open model, run locally), voice "am_michael" (male). python3 vo.py /path/to/kokoro-model-dir
import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
M = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/tts"
k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
LINES = [
    ("hook", "Do you know why people are using Orbi Transfer?"),
    ("why",  "No login. No app. Open the site, send a file, and it shows up on the phone next to you. Instantly."),
    ("how",  "So how does it work?"),
    ("area", "Your phone works out its rough area. A cell about forty kilometres wide. Never your exact spot."),
    ("near", "Everyone in your cell, and the cells around it, shares one live sky. Send something, and it appears on their screens in real time."),
    ("lock", "But before it leaves your phone, it's locked. Only scrambled bytes travel. The passcode never does."),
    ("burn", "Thirty minutes later, it burns up. No account. No trace."),
    ("end",  "Orbi Transfer dot com. Try it on two phones."),
]
out = []
for key, text in LINES:
    s, sr = k.create(text.replace("Orbi", "Orbee"), voice="am_michael", speed=1.22, lang="en-us")
    sf.write(f"vo/{key}.wav", s, sr)
    out.append({"key": key, "text": text, "dur": round(len(s) / sr, 3)})
    print(key, round(len(s) / sr, 2))
json.dump({"sr": sr, "lines": out}, open("vo/lines.json", "w"), indent=1)
print("total", round(sum(x["dur"] for x in out), 1))
