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
    ("hook",    "Ever wondered how your phone reads a QR code in a split second?",                                                   1.00, 0.45),
    ("origin",  "It started in 1994, at a Japanese car parts maker. Barcodes couldn't hold enough, so they built a square one that holds far more, and reads fast.", 0.85, 0.35),
    ("finders", "First, the camera hunts for these three big squares. They tell it where the code is, how big it is, and which way is up.", 0.90, 0.35),
    ("grid",    "Everything else is a grid of tiny squares. Dark means one. Light means zero.",                                      0.85, 0.35),
    ("zigzag",  "Your phone reads them in a zigzag, starting at the bottom right, two columns at a time, snaking up and down.",       0.90, 0.35),
    ("mask",    "But big blank patches confuse cameras. So the code is mixed with one of eight masks, a pattern that breaks them up.", 0.85, 0.35),
    ("damage",  "And the clever part? Spill coffee on it, and it still works!",                                                     1.20, 0.45),
    ("repair",  "Extra repair data is woven in. At the highest level, about thirty percent of it can be damaged, and the math rebuilds the rest.", 0.90, 0.35),
    ("big",     "The smallest code is twenty-one squares wide. The biggest is a hundred and seventy-seven, enough for over seven thousand digits.", 0.95, 0.35),
    ("end",     "So next time you scan one, remember: it's a tiny map of ones and zeros that fixes itself.",                         1.00, 0.50),
    ("orbi",    "And that's why Orbi Transfer puts a QR code on every file you send.",                                              1.00, 0.35),
    ("scan",    "Your friend points the camera and lands right on your file. Add a code, and only people who know it can open it.", 0.95, 0.40),
    ("outro",   "Orbi Transfer dot com. Now you know!",                                                                             1.05, 0.00),
]

torch.set_num_threads(4)
tts = ChatterboxTTS.from_pretrained(device="cpu")
asr = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace("orbee", "orbi").replace("orby", "orbi").replace("thirty", "30")).split()


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
            torch.manual_seed(take * 7 + len(key))
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
