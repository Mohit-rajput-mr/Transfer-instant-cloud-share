# The merge film's voice: the hook line, then one word per tier, each said with more weight (pitched deeper later, mix.py).
import re, soundfile as sf, librosa, numpy as np, torch, jiwer
from chatterbox.tts import ChatterboxTTS
from faster_whisper import WhisperModel
W = [("hook", "Will this rock merge into its final form?", 1.0), ("t1", "A comet!", 1.1), ("t2", "The moon!", 1.1), ("t3", "Planet Earth!", 1.1),
     ("t4", "Saturn!", 1.2), ("t5", "The Sun!", 1.2), ("t6", "A giant star!", 1.1), ("t7", "Supernova!", 1.2),
     ("t8", "Black hole. Final form.", 1.0), ("end", "Follow for the next one!", 1.1)]
torch.set_num_threads(4)
tts = ChatterboxTTS.from_pretrained(device="cpu"); asr = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace("orbee", "orbi").replace("orby", "orbi").replace("trex", "t rex").replace("tea rex", "t rex").replace("gig", "gig")).split()
import sys
ONLY = set(sys.argv[1:])
for key, text, ex in W:
    if ONLY and key not in ONLY: continue
    best = None
    for take in range(3):
        torch.manual_seed(take * 11 + len(key))
        w = tts.generate(text, audio_prompt_path="ref_george.wav", exaggeration=ex, cfg_weight=0.3, temperature=0.8).squeeze(0).numpy()
        yt, idx = librosa.effects.trim(w, top_db=38); y = w[max(0, idx[0] - 1400): idx[1] + 1400]
        segs, _ = asr.transcribe(librosa.resample(y, orig_sr=tts.sr, target_sr=16000), language="en"); hyp = " ".join(s.text for s in segs)
        e = jiwer.wer(" ".join(norm(text)), " ".join(norm(hyp)) or "x"); print(key, take, round(e, 2), hyp, flush=True)
        if best is None or e < best[0]: best = (e, y)
        if e <= 0.05: break
    sf.write(f"vo/{key}.wav", best[1] / np.abs(best[1]).max() * 0.92, tts.sr, subtype="PCM_16")
print("done")
