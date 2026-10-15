# Voiceover: Kokoro (open model, run locally), voice "af_heart". One wav per line; durations -> vo/lines.json
import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
M = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/tts"
k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
LINES = [
    ("hook",    "Sharing a file with your team usually means handing out your email, or your personal WhatsApp."),
    ("meet",    "Not anymore. Meet Orbi Transfer."),
    ("create",  "Create your own space in seconds. Name it, and lock it with a passcode."),
    ("invite",  "Then share one invite link. No emails. No phone numbers. No accounts."),
    ("join",    "Your teammates just pick a name, and they're in."),
    ("room",    "Everything you drop inside stays inside. Only your team can see it, live, on every screen."),
    ("nearby",  "In the office? Tap Nearby, and see only what's shared on your Wi-Fi."),
    ("link",    "Sending something to a client? Share a link, or let them scan the code. It opens right on their phone."),
    ("control", "And you stay in control. Remove anyone with a tap, or leave whenever you like."),
    ("facts",   "Free. No login. Private by design."),
    ("end",     "Orbi Transfer. Your team, in orbit."),
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
