# Juno sound design → extra.wav. Jupiter: a deep, slowly swirling drone; Juno spins (a slow rhythmic swish); the solar arms: a thin
# electric shimmer; the vault: radiation crackle (Geiger-like ticks) dulled by thick walls; the public: warm pads; Orbi: room tone.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(21)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
space = np.clip(seg(0, at("vault"), 0.2, 0.4) + seg(at("cam"), at("orbi"), 0.4, 0.6), 0, 1)
bed(sum(np.sin(2 * np.pi * f * T + i + 0.5 * np.sin(T * 0.2 * (i + 1))) for i, f in enumerate((41.2, 61.7, 82.4))) * 0.022 * space, 1, 0.03)
swish = seg(at("this"), at("vault"), 0.4, 0.4) * (0.5 + 0.5 * np.sin(2 * np.pi * T / 30 * 2)); bed(filt(rng.standard_normal(N), 300, 1500) * 0.012 * swish, 1, 0.02)
sh = seg(at("solar"), at("vault"), 0.4, 0.4); bed(sum(np.sin(2 * np.pi * f * T) for f in (1760, 2217, 2637)) * 0.002 * sh, 1, 0.01)
v = seg(at("vault"), at("cam"), 0.3, 0.3); ticks = (rng.random(N) > 0.997) * 1.0; bed(filt(ticks, 800, 6000) * 0.3 * v, 1, 0.0)
pad = seg(at("cam"), at("orbi"), 0.6, 0.6); bed(sum(np.sin(2 * np.pi * f * T) for f in (220.0, 277.2, 329.6)) * 0.01 * pad, 1, 0.02)
orbi = seg(at("orbi"), DUR, 0.3, 1.0); bed(filt(rng.standard_normal(N), 60, 400) * 0.03 * orbi, 1, 0.03)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
