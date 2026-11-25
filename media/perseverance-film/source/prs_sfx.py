# Perseverance sound design → extra.wav. Mars: thin wind (Mars air is thin: a soft, high, breathy wind) and the rover's faint
# motor whine; entry: a roaring rush; space: a low drone with the radio pulse pinging; the map: soft scanning beeps; the
# parachute: cloth flutter; Orbi: room tone, knocks (three soft knocks), the bell, a chime when let in.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(15)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
mars = seg(0, at("late"), 0.2, 0.4); gust = 0.6 + 0.4 * np.sin(T * 0.5) * np.sin(T * 0.17 + 2)
bed(filt(rng.standard_normal(N), 400, 2500) * 0.03 * mars * gust, 1, 0.02)
bed(np.sin(2 * np.pi * 320 * T + 2 * np.sin(T * 3)) * 0.003 * seg(at("this"), at("fast"), 0.3, 0.3), 1, 0.002)
ent = seg(at("fast"), at("late"), 0.2, 0.5) * np.clip((T - at("fast")) / 1.5, 0, 1); bed(filt(rng.standard_normal(N), 30, 600) * 0.14 * ent, 1, 0.03)
spc = seg(at("late"), at("eyes"), 0.3, 0.3); bed(sum(np.sin(2 * np.pi * f * T) for f in (55, 82.4)) * 0.015 * spc, 1, 0.03)
def ping(t0, f0, g, decay=5.0):
    k = np.clip(T - t0, 0, None); e = np.exp(-k * decay) * (T >= t0)
    bed(np.sin(2 * np.pi * f0 * k) * e * g + np.sin(2 * np.pi * f0 * 1.5 * k) * e * g * 0.25, 1, 0.008)
for t0 in np.arange(at("late"), at("eyes"), 1.2): ping(t0, 1320, 0.025)
for t0 in np.arange(at("eyes") + 0.5, at("chute"), 0.45): ping(t0, 2200, 0.012, 14)
cl = seg(at("chute"), at("orbi"), 0.3, 0.6); bed(filt(rng.standard_normal(N), 60, 500) * 0.05 * cl * (0.7 + 0.3 * np.sin(T * 9)), 1, 0.02)
orbi = seg(at("orbi"), DUR, 0.3, 1.0); bed(filt(rng.standard_normal(N), 60, 400) * 0.03 * orbi, 1, 0.03)
def knock(t0, g):
    k = np.clip(T - t0, 0, None); e = np.exp(-k * 35) * (T >= t0); bed((np.sin(2 * np.pi * 140 * k) + 0.5 * np.sin(2 * np.pi * 230 * k)) * e * g, 1, 0.0)
for i in range(3): knock(fr("orbi2", 0.15) + i * 0.18, 0.25)
ping(fr("orbi2", 0.3), 880, 0.05, 3); ping(fr("orbi2", 0.3) + 0.15, 1108.7, 0.05, 3)
for j, f in enumerate((523.3, 659.3, 784.0)): ping(fr("orbi2", 0.9) + j * 0.1, f, 0.05, 3)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
