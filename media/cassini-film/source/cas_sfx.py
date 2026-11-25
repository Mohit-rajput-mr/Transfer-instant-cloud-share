# Cassini sound design → extra.wav. Saturn: a deep, slow drone with a faint ringing shimmer (the rings); Enceladus: a hiss of jets;
# the dives: a whoosh each pass; the plunge: rising rumble that cuts to silence; the signal: a lone ping fading; Orbi: room tone,
# a crisp "destroy" pop.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(19)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
space = seg(0, at("orbi"), 0.2, 0.8) * (1 - seg(fr("plunge", 0.85), at("signal") + 0.5, 0.1, 0.3))
bed(sum(np.sin(2 * np.pi * f * T + i) * (0.6 + 0.4 * np.sin(T * 0.11 * (i + 1))) for i, f in enumerate((43.65, 65.4, 87.3))) * 0.022 * space, 1, 0.03)
bed(sum(np.sin(2 * np.pi * f * T) for f in (1046.5, 1318.5, 1568.0)) * 0.002 * space * (0.5 + 0.5 * np.sin(T * 0.7)), 1, 0.02)
jet = seg(at("ocean"), at("dives"), 0.5, 0.4); bed(filt(rng.standard_normal(N), 2000, 8000) * 0.02 * jet, 1, 0.006)
def whoosh(t0, g):
    k = np.clip(T - t0, 0, None); e = np.exp(-((k - 0.3) / 0.25) ** 2) * (T >= t0); bed(filt(rng.standard_normal(N), 300, 2500) * e * g, 1, 0.01)
for i in range(22): whoosh(at("dives") + (at("plunge") - at("dives")) * i / 22, 0.02)
rum = seg(at("plunge"), fr("plunge", 0.9), 0.5, 0.05) * np.clip((T - at("plunge")) / max(0.1, L["plunge"]["dur"]), 0, 1); bed(filt(rng.standard_normal(N), 30, 300) * 0.16 * rum, 1, 0.02)
k = np.clip(T - fr("signal", 0.8), 0, None); bed(np.sin(2 * np.pi * 1568 * k) * np.exp(-k * 1.2) * (k > 0) * 0.04, 1, 0.01)
orbi = seg(at("orbi"), DUR, 0.3, 1.0); bed(filt(rng.standard_normal(N), 60, 400) * 0.03 * orbi, 1, 0.03)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
