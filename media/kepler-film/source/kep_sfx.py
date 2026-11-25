# Kepler sound design → extra.wav. Deep space: a soft, high, patient drone; the transit: a gentle tone that dips with the light;
# the wheels: a whirring hum per wheel, a grinding wind-down as each fails; sunlight: a warm shimmering pad; Orbi: room tone.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(20)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
space = np.clip(seg(0, at("wheels"), 0.2, 0.4) + seg(at("idea"), at("orbi"), 0.4, 0.6), 0, 1)
bed(sum(np.sin(2 * np.pi * f * T + i) * (0.6 + 0.4 * np.sin(T * 0.13 * (i + 1))) for i, f in enumerate((55, 82.4, 110))) * 0.018 * space, 1, 0.03)
tr = seg(at("dip"), at("wheels"), 0.3, 0.4); k = np.clip((T - at("dip")) / max(0.1, (fr("dip", 0.8) - at("dip"))), 0, 1); dip = 1 - 0.5 * (np.abs(k - 0.5) < 0.12)
bed(np.sin(2 * np.pi * 440 * T) * 0.02 * tr * dip, 1, 0.01)
wh = seg(at("wheels"), at("idea"), 0.3, 0.4)
for i, f0 in enumerate((180, 205, 230, 255)):
    tdead = (at("fail") - 1.5) if i == 1 else fr("fail", 0.1) if i == 3 else 1e9; fall = np.clip(1 - (T - tdead) / 1.2, 0, 1)
    ph = 2 * np.pi * np.cumsum(f0 * fall) / SR; bed(np.sin(ph) * 0.008 * wh * fall, 1, 0.003 * (i + 1))
sun = seg(at("idea"), at("orbi"), 0.6, 0.6); bed(sum(np.sin(2 * np.pi * f * T) for f in (261.6, 329.6, 392.0, 523.3)) * 0.008 * sun * (0.8 + 0.2 * np.sin(T * 3)), 1, 0.02)
orbi = seg(at("orbi"), DUR, 0.3, 1.0); bed(filt(rng.standard_normal(N), 60, 400) * 0.03 * orbi, 1, 0.03)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
