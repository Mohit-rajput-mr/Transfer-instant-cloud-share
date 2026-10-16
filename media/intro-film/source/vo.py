# Voiceover: Kokoro (open model, run locally), voice "af_heart". One wav per line; durations -> vo/lines.json
import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
M = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/tts"
k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
LINES = [
    ("hook",    "Sending a file shouldn't need an email, a cable, or someone's phone number."),
    ("meet",    "Meet Orbi Transfer. Drop anything in, and it floats into orbit, ready for whoever needs it."),
    ("office",  "At work, Maya drops the new cut and hits Send. It flies across the office, straight to Leo's phone."),
    ("paris",   "In Paris, Emma asks for the trip photos. Sofia sends them right from the table. They land in seconds."),
    ("void",    "Everything floats in the public void. Or tap Nearby, to see only what's shared on your Wi-Fi."),
    ("spaces",  "Make a private space for your team, your family, or your friends, and invite everyone with one link."),
    ("bubbles", "Bubble text puts quick notes right in the void. Add more anytime, and zoom across the board to find anyone."),
    ("big",     "Send up to twenty gigabytes. If your connection drops, it picks up right where it stopped."),
    ("styles",  "Make it yours. Every style, and every file type, gets its own look."),
    ("end",     "Free. No sign up. Encrypted. Orbi Transfer."),
]
out = []
for key, text in LINES:
    # spoken as "Or-bee" (like "orbit" without the t); on screen it stays "Orbi"
    s, sr = k.create(text.replace("Orbi", "Orbee"), voice="af_heart", speed=1.05, lang="en-us")
    sf.write(f"vo/{key}.wav", s, sr)
    out.append({"key": key, "text": text, "dur": round(len(s) / sr, 3)})
    print(key, round(len(s) / sr, 2))
json.dump({"sr": sr, "lines": out}, open("vo/lines.json", "w"), indent=1)
print("total", round(sum(x["dur"] for x in out), 1))
