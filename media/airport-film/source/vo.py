# Voiceover: Kokoro (open model, run locally), voice "bm_george". python3 vo.py /path/to/kokoro-model-dir
import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
M = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/tts"
k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
LINES = [
    ("hook",   "Do you know why people are using Orbi Transfer?"),
    ("scene",  "Imagine landing after a week away with your friends. And you've got every photo from the trip."),
    ("want",   "Before anyone leaves the airport, they all want them."),
    ("old",    "You could email them in batches, or watch a chat squeeze them into blurry little squares."),
    ("send",   "Instead, you drop the whole folder into Orbi Transfer, set a code, and send."),
    ("pop",    "Every phone at the gate gets it as one bundle. Full quality."),
    ("how",    "So how does a whole folder fly across an airport?"),
    ("pack",   "Think of it like luggage. Your phone packs the photos into a suitcase, and locks it with your code. The code stays with you."),
    ("pieces", "The suitcase is split into smaller bags, and several ride the belts at the same time. That's the speed."),
    ("vault",  "They wait in a sealed baggage hold. Without your code, nobody can open a single bag."),
    ("ring",   "Then Orbi pings the phones in your part of the city, like an arrivals board for people nearby. It knows the area, never your seat."),
    ("land",   "Your friend enters the code, the bags roll in, snap back together, and the whole folder unpacks."),
    ("burn",   "And after thirty minutes, anything left in the hold is shredded. No account. No trace."),
    ("end",    "Orbi Transfer dot com. Try it before your next trip ends."),
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
