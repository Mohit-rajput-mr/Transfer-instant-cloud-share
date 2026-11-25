# Parker sound design → extra.wav. Near the Sun: a deep, rumbling roar (filtered noise, slow swells) with a hiss of solar wind;
# the speed shot: a rising whoosh; the hot shield: a crackling sizzle; the lab: room tone; Earth: a wide pad; the beacon: three
# clean pings; Orbi: room tone with a soft chime as each viewer appears.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(14)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
sun = np.clip(seg(0, at("close"), 0.2, 0.4) + seg(at("speed"), fr("speed", 0.45), 0.2, 0.3) + seg(at("hot"), at("shield"), 0.3, 0.3) + seg(at("cool"), at("wait"), 0.3, 0.5), 0, 1)
swell = 0.7 + 0.3 * np.sin(T * 0.7) * np.sin(T * 0.23 + 1)
bed(filt(rng.standard_normal(N), 25, 160) * 0.09 * sun * swell, 1, 0.03); bed(filt(rng.standard_normal(N), 2000, 9000) * 0.008 * sun, 1, 0.01)
ws = seg(at("speed"), fr("speed", 0.45), 0.1, 0.4); bed(filt(rng.standard_normal(N), 300, 2500) * 0.05 * ws * np.clip((T - at("speed")) / 2.5, 0, 1), 1, 0.02)
sz = seg(fr("hot", 0.3), at("shield"), 0.5, 0.3); crack = filt(rng.standard_normal(N), 1500, 8000) * (rng.random(N) > 0.97) * 2.0; bed(crack * 0.04 * sz, 1, 0.004)
lab = seg(at("shield"), at("cool"), 0.3, 0.3); bed(filt(rng.standard_normal(N), 80, 900) * 0.02 * lab, 1, 0.03); bed(np.sin(2 * np.pi * 110 * T) * 0.005 * lab, 1, 0.002)
pad = seg(fr("speed", 0.45), at("hot"), 0.4, 0.4) + seg(at("wait"), at("orbi"), 0.6, 0.6)
bed(sum(np.sin(2 * np.pi * f * T) for f in (196.0, 246.9, 293.7)) * 0.01 * pad, 1, 0.02)
def ping(t0, f0, g, decay=4.0):
    k = np.clip(T - t0, 0, None); e = np.exp(-k * decay) * (T >= t0)
    bed(np.sin(2 * np.pi * f0 * k) * e * g + np.sin(2 * np.pi * f0 * 2 * k) * e * g * 0.2, 1, 0.008)
for j in range(3): ping(fr("wait", 0.68) + j * 0.35, 1568, 0.06)
orbi = seg(at("orbi"), DUR, 0.3, 1.0); bed(filt(rng.standard_normal(N), 60, 400) * 0.03 * orbi, 1, 0.03)
for t0 in [fr("orbi", 0.5)] + [at("orbi2") + 1.1 * i for i in range(1, 4)]: ping(t0, 1318.5, 0.04, 6)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
