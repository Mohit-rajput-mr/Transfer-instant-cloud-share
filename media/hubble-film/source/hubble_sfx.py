# Hubble sound design → extra.wav. Orbit: deep, slow space drone + a faint hum (reaction wheels); the lab: room tone, a soft
# optical-bench hum; the cutaway: airy pads; the washer: a small metallic ring; Orbi studio: room tone; the lock: a low thud.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(12)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
space = np.clip(seg(0, at("blur"), 0.2, 0.4) + seg(at("fix"), at("orbi"), 0.4, 0.6), 0, 1)
bed(sum(np.sin(2 * np.pi * f * T + i) * (0.6 + 0.4 * np.sin(T * 0.13 * (i + 1))) for i, f in enumerate((55, 82.4, 110))) * 0.02 * space, 1, 0.03)
bed(filt(rng.standard_normal(N), 30, 300) * 0.04 * space, 1, 0.02)
bed(np.sin(2 * np.pi * 180 * T) * 0.004 * space, 1, 0.004)
lab = seg(at("edge"), at("fix"), 0.3, 0.4); bed(filt(rng.standard_normal(N), 80, 900) * 0.025 * lab, 1, 0.03); bed(np.sin(2 * np.pi * 120 * T) * 0.006 * lab, 1, 0.002)
pad = seg(at("mirror"), at("blur"), 0.5, 0.5) + seg(at("why"), at("washer"), 0.5, 0.5) * 0.7
bed(sum(np.sin(2 * np.pi * f * T) for f in (261.6, 329.6, 392.0)) * 0.01 * pad, 1, 0.02)
def ring(t0, f0, g):
    k = np.clip(T - t0, 0, None); e = np.exp(-k * 3.5) * (T >= t0)
    bed(sum(np.sin(2 * np.pi * f0 * m * k) / (j + 1) for j, m in enumerate((1, 2.76, 5.4))) * e * g, 1, 0.006)
ring(fr("hook", 0.1), 1900, 0.05); ring(fr("gap", 0.75), 2100, 0.06)
k = np.clip(T - fr("orbi2", 0.8), 0, None); bed(np.sin(2 * np.pi * 55 * k) * np.exp(-k * 6) * (k > 0) * 0.25, 1, 0.0)
orbi = seg(at("orbi"), DUR, 0.3, 1.0); bed(filt(rng.standard_normal(N), 60, 400) * 0.03 * orbi, 1, 0.03)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
