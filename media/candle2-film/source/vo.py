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
    ("hook",    "Zoom into one candle on a stock chart, and you'll find a war inside.",                                                 1.10, 0.40),
    ("book",    "Every price is a shelf. Above the price, sell orders wait: people who'll sell, but only at their price. Below it, buy orders wait.", 0.95, 0.35),
    ("eat",     "The price only moves when someone stops waiting. A buyer who wants in right now eats the cheapest sell orders on the shelf.", 1.00, 0.30),
    ("step",    "Clear a whole shelf, and the price steps up to the next one. Shelf by shelf, the candle fills green.",                1.05, 0.40),
    ("drain",   "Now sellers rush in. They eat the buy orders below, and the green starts to drain.",                                  1.05, 0.30),
    ("red",     "Eat all the way past the open, and the candle closes red.",                                                           1.10, 0.35),
    ("wick",    "And the wick? It's the highest shelf the buyers reached, before the sellers dragged it back.",                       1.00, 0.45),
    ("liq",     "Now the smart part. Big players can't just buy a million shares. There aren't enough sellers on the shelves.",       1.05, 0.30),
    ("where",   "So where do they find sellers? Right here. Just under the obvious low, where everyone's stop loss sits. Every stop is a sell order, waiting to fire.", 1.00, 0.35),
    ("sweep",   "They push the price down through that line. The stops fire, a flood of sellers hits the shelves, and the big player buys every share.", 1.10, 0.30),
    ("rip",     "Order filled. The selling dries up, and the price rips back up. That's a liquidity sweep.",                           1.15, 0.40),
    ("flip",    "It works upside down too. Above the obvious high, the stops of short sellers are buy orders, waiting to be swept.",   0.95, 0.35),
    ("spot",    "How to spot one: a fast wick through an obvious level, then a strong close right back inside.",                       1.00, 0.35),
    ("tip",     "This isn't financial advice. Trade small, and never park your stop exactly where the crowd does.",                    1.00, 0.40),
    ("end",     "Like this? Send it to a friend on Orbi Transfer. Now you know!",                                                       1.05, 0.00),
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
