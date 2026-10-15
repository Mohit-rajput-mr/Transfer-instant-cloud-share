# Voiceover: Kokoro (open model, run locally), voice "af_heart". One wav per line; durations -> vo/lines.json
import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
M = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/tts"
k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
LINES = [
    ("hook",   "Your studio. Your family. Your Sunday league. Every circle shares files somewhere different."),
    ("meet",   "With Orbi Transfer, each one gets a space of its own."),
    ("create", "Create one in seconds. Give it a name, keep it open, or lock it with a passcode."),
    ("invite", "Invite your people with one link. They pick a name, and they're in. No emails. No phone numbers."),
    ("drop",   "Now everyone shares in one place. Drop a file once, and it lands on every screen in the space, live."),
    ("find",   "Open spaces can be found by name. Search, pick a name, and join the team."),
    ("league", "Mateo's match photos? The whole league has them, instantly."),
    ("family", "And private spaces stay private. Only the family sees the family."),
    ("galaxy", "One space for every circle you're part of."),
    ("facts",  "Free. No login. Private by design."),
    ("end",    "Orbi Transfer. Make your own space."),
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
