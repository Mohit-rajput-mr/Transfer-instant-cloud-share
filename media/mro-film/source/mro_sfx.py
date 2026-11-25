# MRO sound design → extra.wav. The photo room: a soft hum and a camera-shutter click on each reveal; Mars orbit: a deep drone
# with a slow radio sweep; the shot: a rising whoosh and a shutter; the diagram: wind; Orbi: room tone with taps.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(17)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
photo = np.clip(seg(0, fr("what", 0.55), 0.2, 0.3) + seg(at("first"), at("orbi"), 0.3, 0.4), 0, 1)
bed(filt(rng.standard_normal(N), 60, 500) * 0.025 * photo, 1, 0.03); bed(np.sin(2 * np.pi * 98 * T) * 0.006 * photo, 1, 0.002)
space = seg(at("this"), at("first"), 0.3, 0.4)
bed(sum(np.sin(2 * np.pi * f * T + i) * (0.6 + 0.4 * np.sin(T * 0.13 * (i + 1))) for i, f in enumerate((49, 73.4, 98))) * 0.02 * space, 1, 0.03)
sweep = np.sin(2 * np.pi * (600 + 300 * np.sin(T * 0.4)) * T) * 0.003 * space; bed(sweep, 1, 0.006)
wind = seg(fr("what", 0.55), at("this"), 0.3, 0.3); bed(filt(rng.standard_normal(N), 400, 2500) * 0.03 * wind, 1, 0.02)
whoosh = seg(at("shot"), fr("shot", 0.7), 0.5, 0.3) * np.clip((T - at("shot")) / 3, 0, 1); bed(filt(rng.standard_normal(N), 200, 3000) * 0.05 * whoosh, 1, 0.02)
def shutter(t0, g):
    k = np.clip(T - t0, 0, None); e = (np.exp(-k * 60) + 0.6 * np.exp(-np.clip(k - 0.06, 0, None) * 60) * (k > 0.06)) * (T >= t0)
    bed(filt(rng.standard_normal(N), 1500, 9000) * e * g, 1, 0.002)
for t0 in (fr("hook", 0.05), fr("shot", 0.85), fr("first", 0.1)): shutter(t0, 0.35)
orbi = seg(at("orbi"), DUR, 0.3, 1.0); bed(filt(rng.standard_normal(N), 60, 400) * 0.03 * orbi, 1, 0.03)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
