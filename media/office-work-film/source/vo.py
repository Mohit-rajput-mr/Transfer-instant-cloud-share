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
    ('hook', 'Do you know why people are using Orbi Transfer?', 1.0, 0.45),
    ('scene', 'Monday morning. A small studio, one big client, and a deadline at five.', 0.9, 0.3),
    ('mess', "Usually the files are scattered across a dozen chats, and nobody knows who's doing what.", 0.8, 0.35),
    ('space', 'So you open a Space. One private room, with its own name and a passcode.', 0.9, 0.3),
    ('join', "Everyone types the passcode once, picks a name, and they're in. No accounts. No email invites.", 1.0, 0.3),
    ('invisible', 'From now on, files sent here only reach your team. The rest of the office sees nothing.', 0.9, 0.45),
    ('task', 'Then you add a task. New logo for the client. For Maya.', 0.9, 0.3),
    ('route', 'You set its route: in progress, in review, approved, delivered. Every step is a light.', 0.9, 0.3),
    ('wire', 'Maya sends her drafts and wires them to the task, so the files hang right off the job they belong to.', 0.9, 0.3),
    ('move', 'As the work moves, the light moves. Orange, then blue, then green. Everyone sees it change, live.', 1.1, 0.3),
    ('log', 'And every move is written down. Who did it, and when.', 0.8, 0.35),
    ('cancel', 'Client changed their mind? One step turns it red. Cancelled. No confusion.', 1.0, 0.4),
    ('lock', "And every file is still locked on the sender's phone. Only members can open it.", 0.8, 0.3),
    ('burn', 'Files burn after thirty minutes, tasks after up to eight hours with Pro. A clean board, every day.', 0.9, 0.4),
    ('end', 'Orbi Transfer dot com. Try it with your team tomorrow.', 0.8, 0.0),
]

torch.set_num_threads(4)
tts = ChatterboxTTS.from_pretrained(device="cpu")
asr = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace(".com", " dot com").replace("orbytransfer", "orbi transfer").replace("orbitransfer", "orbi transfer").replace("orbee", "orbi").replace("orby", "orbi").replace("thirty", "30").replace("eight", "8").replace("nine", "9").replace("five", "5").replace("twenty four", "24").replace("fifteen hundred", "1500").replace("two thousand", "2000")).split()


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
