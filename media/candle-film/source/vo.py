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
    ("hook",    "Every candle on a stock chart is telling you a story. Here's how to read it.",                                        1.05, 0.40),
    ("time",    "One candle is one slice of time. Five minutes, an hour, a day. Whatever you pick.",                                   0.95, 0.30),
    ("open",    "When the slice starts, the first price is the open. When it ends, the last price is the close.",                     0.95, 0.30),
    ("green",   "Close higher than the open? The candle is green. Buyers won that round.",                                             1.10, 0.30),
    ("red",     "Close lower than the open? It's red. Sellers won.",                                                                   1.10, 0.35),
    ("wicks",   "And these thin lines are the wicks. The top is the highest price it touched. The bottom is the lowest.",             0.95, 0.30),
    ("fight",   "So what moves the price? A tug of war. When buyers are hungrier, they pay more and push it up. When sellers rush out, they take less and drag it down.", 1.05, 0.35),
    ("reject",  "A long wick on top means buyers pushed hard, but sellers slammed it back down.",                                     1.00, 0.40),
    ("stop",    "Now, the stop loss. You tell your broker: if the price drops to here, sell automatically, so a small loss never becomes a big one.", 0.95, 0.35),
    ("crowd",   "The catch? Thousands of people put their stops in the same obvious place, just under the last low.",                 1.00, 0.30),
    ("hunt",    "Big players can see that pile of stops. They push the price down just enough to hit them.",                         1.05, 0.30),
    ("cascade", "Each stop becomes a sell order. Those sales push the price lower, and trigger even more stops. A chain reaction!",   1.15, 0.30),
    ("snap",    "Then the big player buys all those shares cheap, and the price snaps right back up. All that's left is a long wick at the bottom.", 1.05, 0.40),
    ("legal",   "Some tricks, like placing fake orders to scare the market, are illegal. But stop hunting near obvious levels happens every day.", 0.95, 0.35),
    ("tip",     "So read the wicks, size your trades small, and don't put your stop exactly where everyone else does.",               1.00, 0.40),
    ("end",     "Like this? Send it to a friend on Orbi Transfer. No login. Now you know!",                                            1.05, 0.00),
]

torch.set_num_threads(4)
tts = ChatterboxTTS.from_pretrained(device="cpu")
asr = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace("orbee", "orbi").replace("orby", "orbi").replace("thirty", "30").replace("123456","one two three four five six").replace("wi-fi","wifi").replace("air drop","airdrop")).split()


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
