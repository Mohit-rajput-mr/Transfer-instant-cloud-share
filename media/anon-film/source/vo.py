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
    ("hook",    "Do you know why people are using Orbi Transfer? Let's start with the people who never want to be found.",              1.10, 0.40),
    ("pros",    "Ethical hackers and privacy experts test security for a living. And they're careful to leave no trace of who they are.", 0.90, 0.30),
    ("tools",   "A fresh identity for every job. No real name. Location switched off. Nothing that links back to them.",                 0.95, 0.35),
    ("slip",    "But even the pros get caught. Not by clever code. By one tiny slip.",                                                 1.15, 0.30),
    ("slips",   "Logging into their real account. A photo that still holds the exact spot it was taken. Or sending straight to someone's device, which hands over their IP address.", 1.00, 0.40),
    ("leak",    "Now think about you. A contract, a medical report, a secret plan. One slip, and it leaks.",                            1.05, 0.40),
    ("why",     "That's why so many anonymous users pick Orbi Transfer. No login. No profile to create.",                              1.05, 0.30),
    ("none",    "And in Anonymous mode, Orbi keeps no profile of you at all. No name, no device, no GPS. Just a throwaway ID that's gone when you leave.", 0.95, 0.35),
    ("direct",  "It never connects you straight to the other person, so they never see your IP address. Everything goes through the encrypted cloud.", 0.95, 0.30),
    ("pieces",  "Your file is locked on your own phone, then split into chunks that fly off separately. And every chunk is still locked.", 1.00, 0.30),
    ("vault",   "The servers only ever hold scrambled chunks. They can't read them, and there's no name or profile to tie them to.",     0.95, 0.30),
    ("code",    "Your passcode never leaves your phone. The server keeps only a scrambled fingerprint of it. Guess wrong twelve times, and the file locks.", 1.00, 0.30),
    ("join",    "Only the right passcode pulls the chunks back together, on the receiver's phone, and nowhere else.",                  1.05, 0.40),
    ("next",    "And coming next: every chunk scattered across different locations. Thousands of locations, so no single place ever holds your file.", 1.10, 0.40),
    ("burn",    "Thirty minutes later, every chunk burns. No account. No profile. No trail.",                                           1.00, 0.40),
    ("end",     "Orbi Transfer dot com. Go anonymous.",                                                                                1.05, 0.00),
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
    elif __import__("os").environ.get("RESUME") and __import__("os").path.exists(f"vo/{key}.wav"):
        d = sf.info(f"vo/{key}.wav").duration  # kept from an interrupted run
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
