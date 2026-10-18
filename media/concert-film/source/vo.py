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
    ("hook",   "Do you know why people are using Orbi Transfer?",                                              1.00, 0.45),
    ("scene",  "Picture this. The lights drop, the whole crowd screams, and you catch the encore. Perfectly.",  1.00, 0.30),
    ("want",   "And now your friends are all yelling the same thing: send it to me!",                          1.20, 0.35),
    ("old",    "But chat apps crush it into a blurry mess, and email just says: file too big.",                0.80, 0.30),
    ("send",   "So you drop the clip into Orbi Transfer, set a code, and that's it. Sent.",                    1.00, 0.35),
    ("pop",    "Every friend around you gets it in seconds. Full quality!",                                     1.20, 0.60),
    ("how",    "Wait. How does that actually work?",                                                            1.00, 0.55),
    ("pack",   "Think of your clip as a song. Your phone locks it in a guitar case, and the code is the key. It never leaves your hand.", 0.75, 0.30),
    ("pieces", "Then the song breaks into notes, and they all fly out at once, like a whole band playing together. That's why it's so fast.", 0.90, 0.35),
    ("vault",  "The notes wait backstage, behind a locked door. No code? Nobody gets in.",                      0.80, 0.35),
    ("ring",   "Then Orbi sends a light wave across your part of the city, like a stadium wave. It knows the area. Never your seat.", 0.90, 0.35),
    ("land",   "Your friend types the code, the notes fly back, snap together, and the whole song plays!",     1.20, 0.40),
    ("burn",   "And thirty minutes later? The stage goes dark. Everything's gone. No account. No trace.",       0.90, 0.40),
    ("end",    "Orbi Transfer dot com. Try it before the next encore.",                                          0.80, 0.00),
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
