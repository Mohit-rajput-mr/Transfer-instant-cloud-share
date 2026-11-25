# Voyager sound design → extra.wav. Deep space: a very low, slow drone and faint hiss; the signal: soft radio pings as the
# pulses leave the dish; the nonsense: crackling static; the board: an electronics hum and a failing-chip buzz; the pieces:
# small clicks as each lands; Earth: a wide pad; the answer: a clean rising chime; Orbi: room tone.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(13)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
space = np.clip(seg(0, at("chip") + L["chip"]["dur"] * 0.32, 0.2, 0.4) + seg(at("cant"), at("pieces"), 0.3, 0.3) + seg(at("send"), at("orbi"), 0.4, 0.6), 0, 1)
bed(sum(np.sin(2 * np.pi * f * T + i) * (0.6 + 0.4 * np.sin(T * 0.11 * (i + 1))) for i, f in enumerate((41.2, 61.7, 82.4))) * 0.022 * space, 1, 0.03)
bed(filt(rng.standard_normal(N), 200, 3000) * 0.012 * space, 1, 0.02)
def ping(t0, f0, g, decay=5.0):
    k = np.clip(T - t0, 0, None); e = np.exp(-k * decay) * (T >= t0)
    bed(np.sin(2 * np.pi * f0 * k) * e * g + np.sin(2 * np.pi * f0 * 1.5 * k) * e * g * 0.3, 1, 0.008)
for t0 in np.arange(0.6, at("far"), 1.4): ping(t0, 1320, 0.025)
for t0 in np.arange(at("back") + L["back"]["dur"] * 0.25, at("orbi"), 1.0): ping(t0, 1568, 0.03)
# static: crackle bursts during the nonsense and the pull-back
st = seg(fr("gib", 0.3), at("chip") + L["chip"]["dur"] * 0.3, 0.2, 0.3) + seg(at("cant"), at("pieces"), 0.2, 1.0) * 0.6
crack = filt(rng.standard_normal(N), 900, 7000) * (rng.random(N) > 0.985) * 3.0 + filt(rng.standard_normal(N), 400, 5000) * 0.25
bed(crack * 0.05 * st, 1, 0.003)
board = seg(at("chip") + L["chip"]["dur"] * 0.32, at("cant"), 0.3, 0.3) + seg(at("pieces"), at("send"), 0.3, 0.4)
bed((np.sin(2 * np.pi * 100 * T) + 0.4 * np.sin(2 * np.pi * 200 * T)) * 0.006 * board, 1, 0.002); bed(filt(rng.standard_normal(N), 80, 900) * 0.02 * board, 1, 0.03)
bz = seg(fr("chip", 0.4), at("cant"), 0.2, 0.3) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 7 * T)))
bed(np.sign(np.sin(2 * np.pi * 220 * T)) * 0.006 * bz, 1, 0.0)
for i in range(3): ping(fr("pieces", 0.5) + (0.35 * 0.85 * L["pieces"]["dur"]) * (i + 1) / 3, 880 * (1 + i * 0.25), 0.05, 12)
pad = seg(at("send"), at("back"), 0.6, 0.6)
bed(sum(np.sin(2 * np.pi * f * T) for f in (196.0, 246.9, 293.7)) * 0.01 * pad, 1, 0.02)
for j, f in enumerate((523.3, 659.3, 784.0, 1046.5)): ping(fr("back", 0.25) + j * 0.12, f, 0.05, 2.5)
orbi = seg(at("orbi"), DUR, 0.3, 1.0); bed(filt(rng.standard_normal(N), 60, 400) * 0.03 * orbi, 1, 0.03)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
