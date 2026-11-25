# Voiceover with feeling (emotion 0.75-1.2 per line: higher = livelier; above ~1.4 the voice strains): Chatterbox (open model, run locally, CPU) cloned from the house voice (Kokoro bm_george,
# ref_george.wav), with an emotion level per line. Every take is checked by a speech recogniser (faster-whisper):
# the best-matching of up to 3 takes is kept, so no garbled line gets through.
#   cd <film>/source && /tmp/cb/bin/python kit/vo.py [key …]            (needs: pip install chatterbox-tts faster-whisper jiwer soundfile "setuptools<81")
import json, re, sys
import numpy as np, soundfile as sf, librosa, torch, jiwer
from chatterbox.tts import ChatterboxTTS
from faster_whisper import WhisperModel

# the lines live in the film's script.json: [{"key", "text", "emo" (0.75-1.2), "gap" (s after)}]. "Orbi" is spoken "Orbee".
LINES = [(l["key"], l["text"], l["emo"], l["gap"]) for l in json.load(open("script.json"))]

torch.set_num_threads(4)
tts = ChatterboxTTS.from_pretrained(device="cpu")
asr = WhisperModel("small.en", device="cpu", compute_type="int8")
# spoken numbers vs Whisper's digits: compare both as digits
NUMS = [("nineteen seventy-seven", "1977"), ("nineteen seventy seven", "1977"), ("twenty twenty-three", "2023"), ("twenty twenty three", "2023"), ("twenty twenty-four", "2024"), ("twenty twenty four", "2024"), ("three point seven", "3.7"), ("twenty-two", "22"), ("twenty two", "22"), ("eighteenth", "18th"), ("eleven seventy-three", "1173"), ("eleven seventy three", "1173"), ("eighteen thirty-eight", "1838"), ("eighteen thirty eight", "1838"), ("nineteen ninety", "1990"), ("two thousand and one", "2001"), ("five and a half", "5.5"), ("four and a half", "4.5"), ("eight hundred and seventy", "870"), ("thirty-eight", "38"), ("forty-five", "45"), ("forty five", "45"), ("fifty-six", "56"), ("fifty six", "56"), ("twenty-five", "25"), ("twenty five", "25"), ("ninety-three", "93"), ("two point four", "2.4"), ("eighteen eighty-six", "1886"), ("eighteen eighty six", "1886"), ("nineteen hundred", "1900"), ("two fifty-six", "256"), ("two fifty six", "256"), ("three inches", "3 inches"), ("six", "6"), ("twenty-seven thousand, five hundred and seventy-two", "27572"), ("twenty seven thousand five hundred and seventy two", "27572"), ("two hundred and twenty-seven", "227"), ("twelve hundred and eighty", "1280"), ("sixty thousand", "60000"), ("ninety-two", "92"), ("sixty-one", "61"), ("twenty-gigabyte", "20 gigabyte"), ("eight", "8"), ("seven thousand three hundred", "7300"), ("eighteen thousand and thirty-eight", "18038"), ("eighteen thousand and thirty eight", "18038"), ("two and a half million", "2.5 million"), ("twelve millionths", "12 millionths"), ("three hundred", "300"), ("fifteen", "15"), ("eighteen", "18"), ("nine", "9"), ("eight hundred and twenty-eight", "828"), ("eight hundred and twenty eight", "828"), ("a hundred and sixty-three", "163"), ("a hundred and sixty three", "163"), ("six hundred and six", "606"), ("a hundred and ninety-two", "192"), ("a hundred and ninety two", "192"), ("twenty-seven", "27"), ("twenty seven", "27"), ("four thousand", "4000"), ("one and a half", "1.5"), ("two hundred", "200"), ("six hundred and sixty", "660"), ("five hundred and eight", "508"), ("eighty-seven", "87"), ("eighty seven", "87"), ("ninety-two", "92"), ("ninety two", "92"), ("forty-one", "41"), ("forty one", "41"), ("two thousand and four", "2004"), ("twenty fifteen", "2015"), ("one-oh-one", "101"), ("one oh one", "101"), ("nineteen sixty six", "1966"), ("thirty thousand", "30000"), ("fifteen", "15"), ("ninety", "90"), ("fifty", "50"), ("seven", "7"), ("nine", "9"), ("five", "5"), ("eighteen seventy six", "1876"), ("a hundred and fifty", "150"), ("a hundred", "100"), ("three thousand", "3000"), ("twenty five", "25"), ("two thirds", "2/3"), ("eighteen sixties", "1860s"), ("nineteen seventy eight", "1978"), ("nineteen thirties", "1930s"), ("three hundred and ten thousand", "310000"), ("twenty thousand", "20000"), ("thirty eight", "38"), ("three hundred", "300"),
        ("fifteen hundred", "1500"), ("eighteen", "18"), ("two thousand", "2000"), ("twenty four", "24"), ("one two three", "123"), ("thirty", "30"),
        ("thirteen", "13"), ("twelve", "12"), ("forty", "40"), ("twenty", "20"), ("ten", "10"), ("four", "4"), ("three", "3"), ("two", "2"), ("one", "1"), ("thirty", "30"), ("twenty", "20"), ("ten", "10"), ("four", "4"), ("three", "3")]
def norm(s):
    s = s.lower().replace("meters", "metres").replace("meter", "metre").replace(".com", " dot com").replace("orbytransfer", "orbi transfer").replace("orbitransfer", "orbi transfer").replace("orbee", "orbi").replace("orby", "orbi")
    s = re.sub(r"(\d),(\d)", r"\1\2", s).replace("%", " percent")
    for w, d in NUMS: s = re.sub(rf"\b{w}\b", d, s)
    return re.sub(r"[^a-z0-9 ]", " ", s).split()


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
import os
prev = json.load(open("vo/lines.json")) if only and os.path.exists("vo/lines.json") and len(json.load(open("vo/lines.json"))["lines"]) == len(LINES) else None
for key, text, ex, gap in LINES:
    if only and key not in only:
        if prev: d = next(l for l in prev["lines"] if l["key"] == key)["dur"]
        else: d = sf.info(f"vo/{key}.wav").duration   # no lines.json yet: reuse the take on disk
    else:
        spoken = text.replace("Orbi", "Orbee")
        best = None
        for take in range(3):
            torch.manual_seed(take * 7 + len(key))
            w = tts.generate(spoken, audio_prompt_path="kit/ref_george.wav", exaggeration=ex, cfg_weight=max(0.25, 0.5 - 0.2 * ex), temperature=0.8)
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
