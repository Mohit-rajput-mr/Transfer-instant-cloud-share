# Discovery sound design → extra.wav. The glide: wind rushing past a silent orbiter (no engine), rising on the steep dive,
# a double sonic boom is NOT used (not claimed); re-entry: deep plasma roar + crackle; the tile macro: a hot hiss; the crush:
# a soft crumbling; the hangar: big room tone; touchdown: tyre squeal + thump; Orbi: quiet.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(31)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def place(sig, t0, g=1.0, pan=0.0):
    i0 = int(t0 * SR)
    if i0 >= N or i0 < 0: return
    s = sig[: N - i0]; out[0, i0:i0 + len(s)] += s * g * (1 - pan * 0.6); out[1, i0:i0 + len(s)] += s * g * (1 + pan * 0.6)
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
def noise(lo, hi): return filt(rng.standard_normal(N), lo, hi)
glide = np.clip(seg(0, at("real"), 0.1, 0.3) + seg(at("glide"), at("orig"), 0.3, 0.3), 0, 1)
dive = seg(at("steep"), fr("steep", 0.8), 0.5, 0.2)
hangar = np.clip(seg(at("real"), at("heat"), 0.3, 0.3) + seg(at("tiles"), at("crush"), 0.2, 0.2) + seg(at("rcc"), at("glide"), 0.3, 0.3) + seg(at("orig"), DUR, 0.3, 1.0), 0, 1)
heat = seg(at("heat"), at("alu"), 0.6, 0.3); macro = np.clip(seg(at("alu"), at("tiles"), 0.2, 0.2) + seg(at("crush"), at("rcc"), 0.2, 0.2) * 0.4, 0, 1)
bed(noise(150, 2500) * (0.7 + 0.3 * np.sin(T * 1.3)) * 0.08 * glide * (1 + dive), 1, 0.015)                # air rushing past
bed(noise(40, 300) * 0.04 * glide, 1, 0.03)
bed(filt(rng.standard_normal(N), 25, 600) * (0.8 + 0.2 * np.sin(T * 9)) * 0.22 * heat, 1, 0.01); bed(filt(rng.standard_normal(N), 1500, 8000) * (rng.random(N) > 0.996) * 4 * 0.04 * heat, 1, 0.006)
bed(noise(2000, 9000) * 0.03 * macro, 1, 0.006)
for k in range(40):                                                                                         # crumbling
    n = int(0.05 * SR); tt = np.arange(n) / SR; place(filt(rng.standard_normal(n), 1200, 6000) * np.exp(-tt * 70), fr("crush", 0.25) + rng.uniform(0, 1.6), 0.05, rng.uniform(-0.4, 0.4))
td = fr("steep", 0.95)
n = int(0.7 * SR); tt = np.arange(n) / SR; place(np.sin(2 * np.pi * (900 + 300 * np.exp(-tt * 6)) * tt) * np.exp(-tt * 6) * 0.3 + filt(rng.standard_normal(n), 800, 5000) * np.exp(-tt * 5) * 0.5, td, 0.18)
place(np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 8), td, 0.3)
bed(noise(80, 900) * 0.05 * seg(td, at("orig"), 0.05, 0.3), 1, 0.02)                                       # rollout rumble
bed(noise(50, 400) * 0.035 * hangar, 1, 0.04); bed(noise(2500, 7000) * 0.003 * hangar, 1, 0.01)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
