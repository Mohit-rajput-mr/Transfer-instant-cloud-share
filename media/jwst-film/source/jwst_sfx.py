# Webb sound design → extra.wav. Space: deep, quiet drones (no sound in vacuum, so soft score-like tones, not "noise");
# the launch: low rumble under the fairing diagram; deployment: soft mechanical clicks/latches and motor whirs per step;
# the 344 counter: ticks; alignment: tiny glassy chimes per segment; the Nearby map: soft pings as phones light up.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(37)
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
space = seg(0, at("orbi"), 0.5, 0.5)
drone = sum(np.sin(2 * np.pi * f * T + p) * a for f, p, a in ((55, 0, 1), (82.4, 1, 0.6), (110, 2, 0.35), (164.8, 0.5, 0.2))) * (0.7 + 0.3 * np.sin(T * 0.21))
bed(drone * 0.035 * space, 1, 0.02); bed(filt(rng.standard_normal(N), 2000, 6000) * 0.002 * space, 1, 0.01)
bed(filt(rng.standard_normal(N), 20, 200) * 0.2 * seg(fr("launch", 0.15), at("unfold"), 0.6, 0.6), 1, 0.02)
def latch(t0, g=0.12):
    n = int(0.25 * SR); tt = np.arange(n) / SR; place((np.sin(2 * np.pi * 900 * tt) * np.exp(-tt * 60) + filt(rng.standard_normal(n), 1500, 6000) * np.exp(-tt * 90)) , t0, g, rng.uniform(-0.5, 0.5))
def whir(t0, d=1.2, g=0.03):
    n = int(d * SR); tt = np.arange(n) / SR; f = 180 + 90 * np.sin(np.pi * tt / d); place(np.sin(np.cumsum(2 * np.pi * f / SR)) * np.sin(np.pi * tt / d) * (0.6 + 0.4 * np.sin(tt * 90)), t0, g)
for k in np.linspace(fr("unfold", 0.05), fr("unfold", 0.98), 9): whir(k, 0.9); latch(k + 0.85)
for i in range(30): latch(fr("risk", 0.05) + i * (L["risk"]["dur"] * 0.7 / 30), 0.05)
for i in range(18):
    n = int(0.6 * SR); tt = np.arange(n) / SR; f = 1200 * 2 ** ((i % 6) / 12); place(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 7), fr("align", 0.02) + i * 0.12, 0.03, (i % 3 - 1) * 0.5)
for i in range(10):
    n = int(0.35 * SR); tt = np.arange(n) / SR; place(np.sin(2 * np.pi * 1760 * tt) * np.exp(-tt * 14), fr("orbi2", 0.1) + 0.2 + i * 0.07, 0.04, rng.uniform(-0.6, 0.6))
bed(filt(rng.standard_normal(N), 60, 400) * 0.03 * seg(at("orbi"), DUR, 0.4, 1.0), 1, 0.03)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
