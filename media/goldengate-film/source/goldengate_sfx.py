# Golden Gate film sound design → extra.wav: dawn foghorns (the two-tone diaphones of the bay), gulls, Pacific surf and
# swell, the hum of traffic on the deck (tyres on the expansion joints), wind singing in the cables and suspenders, steel
# groan under load, a deep thud into the anchorage, the cable room (wires ringing, the spinning wheel), a calm overlook for Orbi.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(23)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def place(sig, t0, g=1.0, pan=0.0):
    i0 = int(t0 * SR)
    if i0 >= N: return
    s = sig[: N - i0]; out[0, i0:i0 + len(s)] += s * g * (1 - pan * 0.6); out[1, i0:i0 + len(s)] += s * g * (1 + pan * 0.6)
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
def noise(lo, hi): return filt(rng.standard_normal(N), lo, hi)
outside = (T < at("cable")) | (T >= at("move"))
swell = 0.55 + 0.45 * np.sin(T * 2 * np.pi / 9.0) ** 2
bed(noise(80, 1200) * swell * 0.07 * outside, 1, 0.017)                       # surf
bed(noise(1500, 7000) * swell ** 3 * 0.02 * outside, 1, 0.009)                # wash
bed(noise(40, 400) * 0.05 * outside, 1, 0.02)                                 # wind body
def horn(t0, f, dur=2.2):
    n = int(dur * SR); tt = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * f * k * tt) / k for k in (1, 2, 3, 4)); env = np.clip(tt / 0.15, 0, 1) * np.clip((dur - tt) / 0.5, 0, 1)
    place(filt(s, 60, 900) * env, t0, 0.07, -0.3)
for t0 in [0.6, 9.0, 34.0]: horn(t0, 180); horn(t0 + 2.4, 140)                # the two-tone foghorn
def gull(t0, f0):
    n = int(0.5 * SR); tt = np.arange(n) / SR; f = f0 * (1 + 0.35 * np.exp(-tt * 9)) * (1 - 0.25 * tt / 0.5); s = np.sin(np.cumsum(2 * np.pi * f / SR)) + 0.4 * np.sin(2 * np.cumsum(2 * np.pi * f / SR))
    place(s * (1 + 0.5 * np.sin(2 * np.pi * 38 * tt)) * np.sin(np.pi * tt / 0.5) ** 0.6 * np.exp(-tt * 1.5), t0, 0.025, rng.uniform(-0.8, 0.8))
for t0 in rng.uniform(0.5, at("cable"), 9): gull(t0, rng.uniform(1500, 2000))
traffic = noise(60, 900) * (0.7 + 0.3 * np.sin(T * 0.6))
bed(traffic * 0.05 * seg(at("hang"), at("cable"), 0.5, 0.5), 1, 0.01)
for t0 in np.arange(at("hang"), at("cable"), 0.37): place(filt(rng.standard_normal(int(0.08 * SR)), 50, 400) * np.exp(-np.arange(int(0.08 * SR)) / SR * 40), t0 + rng.uniform(0, 0.1), 0.05, rng.uniform(-0.5, 0.5))  # tyres on joints
sing = sum(np.sin(2 * np.pi * f * T + i) for i, f in enumerate([311, 467, 622]))
bed(sing * 0.004 * (0.5 + 0.5 * np.sin(T * 0.7)) * outside, 1, 0.006)       # wind singing in the cables
def groan(sec, f0):
    n = int(sec * SR); tt = np.arange(n) / SR; f = f0 * (1 + 0.2 * np.sin(np.pi * tt / sec)); s = np.sign(np.sin(np.cumsum(2 * np.pi * f / SR))) * (1 + 0.5 * rng.standard_normal(n))
    return filt(s, 40, 600) * np.sin(np.pi * tt / sec) ** 1.5
for t0 in [fr("load", 0.2), fr("load", 0.6), fr("towers", 0.3), fr("move", 0.2), fr("move", 0.7), fr("range", 0.3)]: place(groan(2.2, 50), t0, 0.07, 0)
n = int(3 * SR); tt = np.arange(n) / SR; place(np.sin(2 * np.pi * 32 * tt) * np.exp(-tt * 1.4), fr("anchor", 0.3), 0.35)                        # anchorage thud
room = noise(60, 500) * 0.04 * seg(at("cable"), at("move"), 0.3, 0.3); bed(room, 1, 0.008)
for t0 in rng.uniform(at("cable"), at("move"), 60):                                                                                 # wires ringing
    n = int(1.2 * SR); tt = np.arange(n) / SR; f = rng.uniform(2200, 6000); place(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 5) * 0.4, t0, 0.04, rng.uniform(-0.8, 0.8))
bed(np.sin(2 * np.pi * 70 * T) * (0.5 + 0.5 * np.sign(np.sin(T * 7))) * 0.03 * seg(at("spin"), at("move"), 0.3, 0.3), 1)            # the spinning wheel
bed(noise(80, 900) * 0.02 * seg(at("orbi"), DUR, 0.5, 1.0), 1, 0.02)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
