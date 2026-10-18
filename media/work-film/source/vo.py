# Voiceover with feeling (emotion 0.75-1.2 per line: higher = livelier; above ~1.4 the voice strains): Chatterbox (open model, run locally, CPU) cloned from the house voice (Kokoro bm_george,
# ref_george.wav), with an emotion level per line. Every take is checked by a speech recogniser (faster-whisper):
# the best-matching of up to 3 takes is kept, so no garbled line gets through.
#   python vo.py            (needs: pip install chatterbox-tts faster-whisper jiwer soundfile "setuptools<81")
import json, re, sys
import numpy as np, soundfile as sf, librosa, torch, jiwer
from chatterbox.tts import ChatterboxTTS
from faster_whisper import WhisperModel

# (key, subtitle text, emotion 0..1, pause after in s). "Orbi" is spoken "Orbee".
LINES = [
    ("hook",   "Monday, nine a.m. Where's the deck?",                                                                                 1.10, 0.40),
    ("mess",   "It's in a chat. No, an email. The ticket's in Jira, the comments are in WhatsApp, and the file wants a login.",        1.00, 0.30),
    ("intern", "And the new guy? Still waiting for his invite.",                                                                       1.05, 0.45),
    ("open",   "So try this. Everyone opens Orbi Transfer slash work. No app, no account, no invite.",                                0.95, 0.30),
    ("drop",   "Drop the deck in, and it lands on every screen in the office, in about a second.",                                    1.00, 0.30),
    ("wifi",   "Same office wifi? Then it's under Nearby, so your team's stuff is right there.",                                       0.90, 0.30),
    ("notes",  "Need a quick word? Post a note. Everyone gets their own colour, and it's gone in thirty minutes. No group chat to scroll.", 1.00, 0.30),
    ("task",   "Now the work. Type a task, add at Leo, and it's his.",                                                                1.00, 0.30),
    ("route",  "It moves step by step. Doing, review, done. And everyone sees the bar fill up.",                                       0.95, 0.30),
    ("under",  "Under the hood, every open screen keeps one live line to the room. A change rings through to everyone at once. Nothing to refresh.", 0.90, 0.30),
    ("private", "Want it just for your team? Go private, and only your people get in.",                                                0.90, 0.40),
    ("done",   "And when the last task is done?",                                                                                   1.10, 0.25),
    ("dance",  "The whole office loses it!",                                                                                          1.25, 6.50),
    ("end",    "Orbi Work. Files, notes and tasks, instantly. Orbi Transfer dot com slash work.",                                     1.00, 0.00),
]

torch.set_num_threads(4)
tts = ChatterboxTTS.from_pretrained(device="cpu")
asr = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace("orbee", "orbi").replace("orby", "orbi").replace("thirty", "30").replace("wi-fi","wifi").replace("air drop","airdrop")).split()


def trim(y, sr):
    yt, idx = librosa.effects.trim(y, top_db=38)
    pad = int(0.06 * sr)
    return y[max(0, idx[0] - pad): idx[1] + pad]


def wer(ref, y, sr):
    segs, _ = asr.transcribe(librosa.resample(y, orig_sr=sr, target_sr=16000), language="en")
    hyp = " ".join(s.text for s in segs)
    return jiwer.wer(" ".join(norm(ref)), " ".join(norm(hyp)) or "x"), hyp


only = set(sys.argv[1:])
out, at = [], 0.35
prev = json.load(open("vo/lines.json")) if only else None
for key, text, ex, gap in LINES:
    if only and key not in only:
        ln = next(l for l in prev["lines"] if l["key"] == key)
        d = ln["dur"]
    else:
        spoken = text.replace("Orbi", "Orbee")
        best = None
        for take in range(3):
            torch.manual_seed(take * 7 + len(key) + int(__import__("os").environ.get("SEED_OFF", "0")))
            w = tts.generate(spoken, audio_prompt_path="ref_george.wav", exaggeration=ex, cfg_weight=max(0.25, 0.5 - 0.2 * ex), temperature=0.8)
            y = trim(w.squeeze(0).numpy(), tts.sr)
            e, hyp = wer(text, y, tts.sr)
            print(f"{key} take {take}: wer {e:.2f} · {hyp.strip()}", flush=True)
            if best is None or e < best[0]:
                best = (e, y)
            if e <= 0.05:
                break
        y = best[1] / max(1e-6, np.abs(best[1]).max()) * 0.92
        sf.write(f"vo/{key}.wav", y, tts.sr, subtype="PCM_16")
        d = len(y) / tts.sr
    out.append({"key": key, "text": text, "dur": round(d, 3), "at": round(at, 2)})
    at += d + gap
    print(key, round(d, 2), flush=True)
json.dump({"sr": tts.sr, "lines": out, "duration": round(at + 1.8, 2)}, open("vo/lines.json", "w"), indent=1)
print("duration", round(at + 1.8, 1))
