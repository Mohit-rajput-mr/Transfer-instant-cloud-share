# Voiceover: Kokoro (open model, run locally), voice "af_heart". One wav per line; durations -> vo/lines.json
import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
M = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/tts"
k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
LINES = [
    ("hook",   "Nine A.M. The studio is busy. Design, video, sales, everyone working on the same project."),
    ("pain",   "But files still travel the slow way. Emails, chats, cables."),
    ("meet",   "Meet Orbi Transfer."),
    ("send",   "Maya finishes the cut. She drops it in, and hits Send."),
    ("fly",    "It flies straight across the room, encrypted, from her screen to the team."),
    ("recv",   "Leo sees it land on his phone. One tap, and it's saved. No account. No app."),
    ("nearby", "Everyone on the office Wi-Fi can tap Nearby, and see what's shared right here."),
    ("space",  "Working with a bigger team? Make your own private space, and invite everyone with one link."),
    ("facts",  "Free. No sign up. Works on every device."),
    ("end",    "Orbi Transfer. Your whole office, in orbit."),
]
out = []
for key, text in LINES:
    # spoken as "Or-bee" (like "orbit" without the t); on screen it stays "Orbi"
    s, sr = k.create(text.replace("Orbi", "Orbee"), voice="af_heart", speed=1.0, lang="en-us")
    sf.write(f"vo/{key}.wav", s, sr)
    out.append({"key": key, "text": text, "dur": round(len(s) / sr, 3)})
    print(key, round(len(s) / sr, 2))
json.dump({"sr": sr, "lines": out}, open("vo/lines.json", "w"), indent=1)
print("total", round(sum(x["dur"] for x in out), 1))
