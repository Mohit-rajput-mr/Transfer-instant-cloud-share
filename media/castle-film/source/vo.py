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
    ("hook",    "Do you know how a castle kept invaders out? It wasn't one wall. It was layer after layer.", 1.10, 0.40),
    ("moat",    "First, a moat. A wide ditch, often full of water, so attackers couldn't roll siege towers right up to the walls.", 1.05, 0.30),
    ("bridge",  "The only way across was a drawbridge, pulled up by chains when danger came.", 1.05, 0.30),
    ("gate",    "Behind it, an iron grid called a portcullis dropped down, and the gatehouse often had a second one, to trap attackers in between.", 1.05, 0.30),
    ("walls",   "Thick stone walls, towers that stuck out so archers could shoot along the wall, and narrow arrow slits that were hard to hit from outside.", 1.05, 0.30),
    ("word",    "And the guards only opened up for people who knew the watchword, the secret password of the day.", 1.05, 0.40),
    ("orbi",    "Orbi Spaces work like a private castle for your files. A Space needs a passcode to join, its files never show up in public, and only members can open them.", 1.05, 0.35),
    ("end",     "Orbi Transfer dot com. Now you know!",                                                                                  1.05, 0.00),
]

torch.set_num_threads(4)
tts = ChatterboxTTS.from_pretrained(device="cpu")
asr = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace("orbee", "orbi").replace("orby", "orbi").replace("thirty", "30").replace("123456","one two three four five six").replace("wi-fi","wifi").replace("air drop","airdrop").replace("42","forty two").replace("40","forty").replace("color","colour").replace("1783","seventeen eighty three").replace("100","a hundred").replace("vapor","vapour")).split()


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
