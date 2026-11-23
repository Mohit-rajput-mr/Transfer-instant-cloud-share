# Leaning Tower of Pisa sound design → extra.wav (mixed by kit/synth.py under the voice). Piazza at sunset: crowd murmur,
# swifts, a distant bell; the section: deep earth rumble, soil creak and squeeze; centuries-lapse whoosh with stone strain;
# lead ingots clanking down; steel cables tensioning; drill rigs (diesel + auger grind); the slow settling groan; café calm for Orbi.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(11)
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
outside = (T < at("rivets")) | ((T >= at("wind")))
bed(noise(60, 500) * 0.04 * outside, 1, 0.02)                                         # city rumble
bed(noise(1500, 6000) * 0.006 * outside, 1, 0.011)                                   # far traffic hiss
outside = (T < at("soil")) | ((T >= at("stable")) & (T < at("orbi")))
bed(noise(150, 1800) * (0.6 + 0.4 * np.sin(T * 0.7)) * 0.05 * outside, 1, 0.015)                        # crowd murmur
bed(noise(40, 300) * 0.05 * seg(at("soil"), at("curve")), 1, 0.02)                                       # earth rumble (section)
def swift(t0):
    n = int(0.25 * SR); tt = np.arange(n) / SR; f = 5200 + 900 * np.sin(tt * 90); place(np.sin(np.cumsum(2 * np.pi * f / SR)) * np.sin(np.pi * tt / 0.25) ** 2, t0, 0.012, rng.uniform(-0.9, 0.9))
for t0 in rng.uniform(0, at("soil"), 10): swift(t0)
for t0 in rng.uniform(at("stable"), at("orbi"), 8): swift(t0)
def bell(t0, f=196.0, g=0.05):
    n = int(5 * SR); tt = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * f * k * tt) * np.exp(-tt * (0.6 + 0.4 * k)) / k for k in (1, 2.0, 2.4, 3.0, 4.2)); place(s, t0, g, 0.3)
bell(fr("hook", 0.1)); bell(fr("stable", 0.2), 220, 0.04)
def creak(t0, g=0.05):
    n = int(1.2 * SR); tt = np.arange(n) / SR; f = 70 + 40 * np.sin(tt * 3) + 15 * rng.standard_normal(n).cumsum() / np.sqrt(n); place(np.sin(np.cumsum(2 * np.pi * f / SR)) * np.sin(np.pi * tt / 1.2) * filt(rng.standard_normal(n), 100, 900) * 2, t0, g, rng.uniform(-0.4, 0.4))
for t0 in np.linspace(at("sink"), at("pause"), 5): creak(t0)
whoosh = filt(rng.standard_normal(N), 300, 3000) * (0.5 + 0.5 * np.sin(T * 4))
bed(whoosh * 0.03 * (seg(at("pause"), at("curve")) + seg(at("grow"), at("weights"))), 1, 0.01)            # centuries passing
for t0 in np.linspace(at("grow"), at("weights") - 0.5, 6): creak(t0, 0.06)
def clank(t0, g=0.05):
    n = int(0.5 * SR); tt = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, d in ((420, 12), (1130, 18), (2650, 30))); place(s + filt(rng.standard_normal(n), 800, 6000) * np.exp(-tt * 60), t0, g, rng.uniform(-0.5, 0.5))
for t0 in np.sort(rng.uniform(at("weights") + 0.3, at("cables"), 16)): clank(t0, 0.035)
def tension(t0):
    n = int(1.4 * SR); tt = np.arange(n) / SR; place(np.sin(np.cumsum(2 * np.pi * (300 + 500 * tt) / SR)) * np.exp(-tt * 1.5) * 0.6, t0, 0.04, -0.3)
tension(fr("cables", 0.2)); tension(fr("cables", 0.5))
diesel = np.sin(2 * np.pi * 38 * T) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * T)) + filt(rng.standard_normal(N), 60, 400) * 0.8
grind = filt(rng.standard_normal(N), 400, 2500) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * T))
bed(diesel * 0.04 * seg(at("dig"), at("back")), 1, 0.01); bed(grind * 0.03 * seg(at("dig") + 0.5, at("settle") + 1.5), 1, 0.008)
bed(filt(rng.standard_normal(N), 30, 200) * 0.08 * seg(at("settle"), fr("back", 0.9), 0.8, 0.8), 1, 0.02)  # the slow settling groan
for t0 in np.linspace(at("settle"), at("back"), 4): creak(t0, 0.07)
bed(noise(200, 2500) * 0.02 * seg(at("orbi"), DUR, 0.5, 1.0), 1, 0.02)                                    # café
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
