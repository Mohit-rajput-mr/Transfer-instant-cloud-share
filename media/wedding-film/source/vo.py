# Voiceover: Kokoro (open model, run locally), voice "bm_george". python3 vo.py /path/to/kokoro-model-dir
import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
M = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/tts"
k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
LINES = [
    ("hook",   "Do you know why people are using Orbi Transfer?"),
    ("scene",  "Picture a wedding. You just caught the perfect shot of the first dance."),
    ("want",   "And suddenly, every single guest wants a copy."),
    ("old",    "That usually means a group chat, forty phone numbers, and a lot of waiting."),
    ("send",   "Instead, you open Orbi Transfer, add a passcode, and tap send. Once."),
    ("pop",    "It shows up on every phone in the room. You just shout the passcode. Cake!"),
    ("how",    "So what actually happens to that photo?"),
    ("pack",   "First, your phone seals it inside a locked box. The passcode is the key, and the key never leaves your phone."),
    ("pieces", "Then the box is cut into small pieces, and several fly out at the same time. That is why it is quick."),
    ("vault",  "The pieces wait in a vault online. Still locked. Without the passcode, nobody can open them."),
    ("ring",   "At that same moment, Orbi rings every phone in your part of the city. It knows the area, never your exact spot."),
    ("land",   "A guest taps it, types cake, and the pieces drop down, click back together, and unlock."),
    ("burn",   "Thirty minutes later, the vault burns every piece. No account. Nothing left behind."),
    ("end",    "Orbi Transfer dot com. Try it at the next party."),
]
out, at = [], 0.35
for key, text in LINES:
    s, sr = k.create(text.replace("Orbi", "Orbee"), voice="bm_george", speed=1.08, lang="en-gb")
    sf.write(f"vo/{key}.wav", s, sr)
    d = round(len(s) / sr, 3)
    out.append({"key": key, "text": text, "dur": d, "at": round(at, 2)})
    at += d + (0.55 if key in ("hook", "pop", "how", "pieces", "ring", "land") else 0.3)
    print(key, d)
json.dump({"sr": sr, "lines": out, "duration": round(at + 1.6, 2)}, open("vo/lines.json", "w"), indent=1)
print("duration", round(at + 1.6, 1))
