# The merge film's voice: the hook line, then one word per tier, each said with more weight (pitched deeper later, mix.py).
import re, soundfile as sf, librosa, numpy as np, torch, jiwer
from chatterbox.tts import ChatterboxTTS
from faster_whisper import WhisperModel
W = [("hook", "Will this file merge into its final form?", 1.0), ("t1", "Photo!", 1.2), ("t2", "Song!", 1.2), ("t3", "Video!", 1.2),
     ("t4", "Folder!", 1.2), ("t5", "Twenty gigs!", 1.2), ("t6", "Locked vault!", 1.1), ("t7", "Private Space!", 1.1),
     ("t8", "Orbee. Final form.", 1.0), ("end", "Every file, one orbit. Orbee Transfer dot com.", 1.0)]
torch.set_num_threads(4)
tts = ChatterboxTTS.from_pretrained(device="cpu"); asr = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace("orbee", "orbi").replace("orby", "orbi").replace("20", "twenty").replace("gig", "gig")).split()
for key, text, ex in W:
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
