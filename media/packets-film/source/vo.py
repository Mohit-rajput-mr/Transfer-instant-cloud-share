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
    ('hook', 'Every photo you send gets torn into thousands of pieces. You just never see it.', 1.1, 0.45),
    ('q', 'So what happens when you send one to your mum, on the other side of the world?', 1.0, 0.4),
    ('bits', 'First, your phone turns the photo into ones and zeros. A three megabyte photo? Twenty four million of them.', 0.9, 0.3),
    ('packets', 'Then it chops them into tiny envelopes, called packets. That one photo becomes about two thousand envelopes!', 1.0, 0.3),
    ('label', 'Each one gets a label. From, to, and its number in the line.', 0.8, 0.3),
    ('wifi', 'Your phone throws them through the air as radio waves, and your router pushes them down a cable.', 0.9, 0.3),
    ('hops', 'Now the wild part. Each envelope hops from router to router, often a dozen or more, and every router just picks the next best step.', 1.1, 0.3),
    ('routes', 'So pieces of the same photo take different roads. Some cross the ocean floor, in a cable about as thick as a garden hose.', 1.0, 0.3),
    ('speed', 'Inside, they fly through glass at two thirds the speed of light.', 1.0, 0.35),
    ('arrive', "They land all jumbled up. Your mum's phone sorts them by number, and asks again for any that got lost.", 0.9, 0.3),
    ('whole', 'Then it glues all two thousand back together. In the blink of an eye.', 1.1, 0.5),
    ('problem', "But on the way, your envelopes pass through a lot of machines you don't own.", 0.8, 0.4),
    ('lock', "That's why Orbi Transfer locks your file on your own phone, before a single piece leaves. Only your code opens it.", 0.9, 0.3),
    ('parts', 'Big files go in big parts, several at once. Signal drops? Only the missing parts go again.', 0.9, 0.3),
    ('near', "No account, no phone number. It finds people near you by rough area, and thirty minutes later, it's gone.", 0.9, 0.4),
    ('end', 'Orbi Transfer dot com. Now you know where your photos go.', 0.8, 0.0),
]

torch.set_num_threads(4)
tts = ChatterboxTTS.from_pretrained(device="cpu")
asr = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace(".com", " dot com").replace("orbytransfer", "orbi transfer").replace("orbitransfer", "orbi transfer").replace("orbee", "orbi").replace("orby", "orbi").replace("thirty", "30").replace("twenty four", "24").replace("fifteen hundred", "1500").replace("two thousand", "2000")).split()


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
