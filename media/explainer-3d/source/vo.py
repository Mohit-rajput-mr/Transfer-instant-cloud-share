# Voiceover: Kokoro (open model, run locally), voice "bm_george". python3 vo.py /path/to/kokoro-model-dir
import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
M = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/tts"
k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
LINES = [
    ("hook",  "Do you know why people are using Orbi Transfer?"),
    ("cafe",  "You're at a café. Your friend is sitting right across from you."),
    ("photo", "You want to send them a photo."),
    ("old",   "Normally, you'd need their number, an app, or an account."),
    ("send",  "With Orbi Transfer, you just open the site, and hit send."),
    ("pop",   "And it pops up on their phone. Instantly."),
    ("how",   "So how does that work?"),
    ("area",  "First, your phone works out its rough area. A cell about forty kilometres wide."),
    ("spot",  "Never your exact spot."),
    ("sky",   "Everyone in that cell, and the cells around it, shares one live sky."),
    ("live",  "So the moment you send something, it appears on their screens."),
    ("lock",  "But before it leaves your phone, it gets locked."),
    ("bytes", "Only scrambled bytes travel. The passcode never does."),
    ("burn",  "And thirty minutes later, it burns up. No account. No trace."),
    ("end",   "Orbi Transfer dot com. Try it on two phones."),
]
out, at = [], 0.35
for key, text in LINES:
    s, sr = k.create(text.replace("Orbi", "Orbee"), voice="bm_george", speed=1.08, lang="en-gb")
    sf.write(f"vo/{key}.wav", s, sr)
    d = round(len(s) / sr, 3)
    out.append({"key": key, "text": text, "dur": d, "at": round(at, 2)})
    at += d + (0.55 if key in ("hook", "pop", "how", "spot", "live", "bytes") else 0.3)
    print(key, d)
json.dump({"sr": sr, "lines": out, "duration": round(at + 1.6, 2)}, open("vo/lines.json", "w"), indent=1)
print("duration", round(at + 1.6, 1))
