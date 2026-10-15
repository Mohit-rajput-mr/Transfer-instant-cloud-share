# Voiceover: Kokoro (open model, run locally), voice "af_heart". One wav per line; durations -> vo/lines.json
import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
M = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/tts"
k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
LINES = [
    ("hook",   "Sending a file shouldn't need an account, an app, or a cable."),
    ("meet",   "Meet Orbi Transfer. Open it in any browser, and you're ready."),
    ("pick",   "Pick your files, give them a name, and hit send."),
    ("orbit",  "They float into orbit, and show up on every nearby screen. Instantly."),
    ("tap",    "On your phone, just tap, and it's yours. No password, unless you want one."),
    ("batch",  "Sending a whole batch? It lands as one tidy container, with a single download all."),
    ("space",  "Working with a team? Open a private space. Only the people in your office see what you share."),
    ("cloud",  "Close your laptop. Your file stays safe in the cloud, end-to-end encrypted, until its timer runs out."),
    ("burn",   "Then it's gone. No traces."),
    ("facts",  "Free. No login. Up to five gigabytes, on any device."),
    ("end",    "Orbi Transfer. Send it into orbit."),
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
