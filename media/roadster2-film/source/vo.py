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
    ("hook",    "Do you know how Tesla's new Roadster works? It can hang almost upside down on a curved wall. No glue. No magnets. Just four fans.",     1.10, 0.40),
    ("demo",    "At the reveal, it drove up this giant curved ramp, until the road was nearly over its head. And it stayed there.",     1.00, 0.35),
    ("grip",    "Normally, gravity presses the tires into the road. That press is what gives them grip. Upside down, gravity pulls the car away.", 1.00, 0.35),
    ("fans",    "So look at the back. Under the light bar, four round fans are built right into the diffuser.",                         1.05, 0.35),
    ("tunnel",  "They suck air out from under the car, through channels in the floor, and blow it out the back.",                       1.00, 0.30),
    ("skirts",  "Skirts drop down along the sides to seal the gap, so fresh air can't rush back in underneath.",                         1.00, 0.35),
    ("low",     "Now the air under the car is thinner than the air around it. And the air outside presses on every inch of the car.",   1.05, 0.35),
    ("math",    "Do the math. The floor is about four square meters. Drop the pressure under it by just one tenth, and the air pushes with over four tonnes.", 1.05, 0.35),
    ("num",     "Tesla's screen showed about forty-seven hundred kilos of downforce. Far more than the car weighs. So it sticks, even upside down.", 1.10, 0.35),
    ("slow",    "And unlike a wing, fans work at any speed. Even standing still.",                                                      1.00, 0.35),
    ("history", "Race cars tried this in the seventies. The Chaparral and the Brabham fan car were so good, they got banned.",          1.05, 0.40),
    ("claims",  "Tesla claims zero to sixty in under one second, and production in twenty twenty-eight. Tesla's own numbers, not tested yet.", 1.00, 0.40),
    ("end",     "Share it with your car crew in a private Orbi Space. Now you know!",                                                     1.05, 0.00),
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
