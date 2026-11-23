# Statue of Liberty sound design → extra.wav (mixed by kit/synth.py under the voice). Harbour at dawn: waves on the sea wall,
# gulls, a ferry horn; the storm: rain, wind gusts, thunder; inside the statue: iron creak and hollow resonance; the flex demo:
# copper stress groan and a crack; the repoussé workshop: forge roar and wooden mallet blows on copper; time-lapse whoosh;
# rain drops on the patina; a calm pier for Orbi.
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
outdoor = ((T < at("skin")) | ((T >= at("hollow")) & (T < at("flex"))) | ((T >= at("sway")) & (T < at("hammer"))) | ((T >= at("brown")) & (T < at("protect"))) | (T >= at("orbi")))
storm = np.clip(seg(at("hollow"), at("flex"), 1.5, 0.3) + seg(at("sway"), at("hammer"), 0.3, 0.4), 0, 1)
bed(noise(80, 900) * (0.5 + 0.5 * np.abs(np.sin(T * 0.9))) * 0.05 * outdoor * (1 - storm * 0.5), 1, 0.02)       # waves on the sea wall
def gull(t0):
    n = int(0.5 * SR); tt = np.arange(n) / SR; f = 1500 + 700 * np.sin(tt * 14) * np.exp(-tt * 3); place(np.sin(np.cumsum(2 * np.pi * f / SR)) * np.sin(np.pi * tt / 0.5) ** 2 * (1 + 0.5 * np.sin(tt * 120)), t0, 0.015, rng.uniform(-0.9, 0.9))
for t0 in rng.uniform(0, at("skin"), 5): gull(t0)
for t0 in rng.uniform(at("brown"), at("protect"), 4): gull(t0)
horn = np.sin(2 * np.pi * 110 * T) + 0.5 * np.sin(2 * np.pi * 220 * T); bed(horn * 0.03 * seg(fr("statue", 0.2), fr("statue", 0.6), 0.3, 0.8), 1, 0.03)
bed(noise(2000, 9000) * 0.05 * storm, 1, 0.009)                                                          # rain
bed(noise(150, 1200) * (0.5 + 0.5 * np.sin(T * 1.1) * np.sin(T * 0.37)) * 0.09 * storm, 1, 0.017)          # wind gusts
def thunder(t0, g=0.12):
    n = int(4 * SR); tt = np.arange(n) / SR; place(filt(rng.standard_normal(n), 20, 220) * np.exp(-tt * 0.9) * (1 - np.exp(-tt * 20)), t0, g, rng.uniform(-0.3, 0.3))
thunder(fr("hollow", 0.4)); thunder(fr("sway", 0.3) + 0.15, 0.16)
inside = seg(at("frame"), at("flex"), 0.3, 0.3)
bed(noise(40, 160) * 0.06 * inside, 1, 0.03)                                                              # hollow resonance
def creak(t0, g=0.04):
    n = int(0.9 * SR); tt = np.arange(n) / SR; f = 90 + 50 * np.sin(tt * 4); place(np.sin(np.cumsum(2 * np.pi * f / SR)) * np.sin(np.pi * tt / 0.9) * filt(rng.standard_normal(n), 150, 1200) * 2, t0, g, rng.uniform(-0.5, 0.5))
for t0 in np.linspace(at("frame"), at("flex"), 6): creak(t0)
for t0 in np.linspace(at("sway"), at("hammer"), 5): creak(t0, 0.05)
groan = filt(rng.standard_normal(N), 60, 400) * (0.5 + 0.5 * np.sin(T * 3.2)); bed(groan * 0.05 * seg(at("flex"), fr("flex", 0.85)), 1, 0.01)
crack = filt(rng.standard_normal(int(0.4 * SR)), 1500, 9000) * np.exp(-np.arange(int(0.4 * SR)) / SR * 14); place(crack, fr("flex", 0.6), 0.12, -0.4)
bed(noise(80, 700) * 0.05 * seg(at("hammer"), at("brown")), 1, 0.01)                                      # forge roar
def mallet(t0):
    n = int(0.35 * SR); tt = np.arange(n) / SR; s = (np.sin(2 * np.pi * 180 * tt) * np.exp(-tt * 40) + sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) * 0.4 for f, d in ((880, 14), (1730, 20), (2610, 26)))); place(s, t0, 0.06, 0.2)
k = at("hammer")
while k < at("brown") - 0.2: mallet(k + 0.42 * 0.7); k += 0.42
bed(filt(rng.standard_normal(N), 300, 3000) * (0.5 + 0.5 * np.sin(T * 4)) * 0.03 * seg(at("green"), at("protect")), 1, 0.01)   # time-lapse
def drip(t0):
    n = int(0.08 * SR); tt = np.arange(n) / SR; place(np.sin(2 * np.pi * (1400 - 6000 * tt) * tt) * np.exp(-tt * 60), t0, 0.04, rng.uniform(-0.6, 0.6))
for t0 in rng.uniform(at("protect"), at("orbi"), 40): drip(t0)
bed(noise(80, 900) * 0.02 * seg(at("orbi"), DUR, 0.5, 1.0), 1, 0.02)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
