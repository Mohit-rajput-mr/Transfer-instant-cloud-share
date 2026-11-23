# Eiffel Tower film sound design → extra.wav (mixed by kit/synth.py under the voice). Paris at dawn: birds, distant traffic,
# the Seine lapping, café murmur under the tower; summer cicada-hot air vs. a cold winter wind; iron ticking + groaning as it
# expands; the thermal camera's electronic hum; the forge (fire roar), the red rivet's sizzle, hammer blows with ringing iron,
# the hiss of cooling; wind through the lattice; a calm balcony for Orbi.
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
bed(noise(300, 3000) * (0.5 + 0.5 * np.abs(np.sin(T * 1.7))) * 0.02 * seg(0, at("iron"), 0.4, 0.6), 1, 0.007)  # the Seine
def bird(t0, f0):
    n = int(0.18 * SR); tt = np.arange(n) / SR; f = f0 * (1 + 0.4 * np.sin(tt * 60)); place(np.sin(np.cumsum(2 * np.pi * f / SR)) * np.sin(np.pi * tt / 0.18) ** 2, t0, 0.02, rng.uniform(-0.8, 0.8))
for t0 in rng.uniform(0.3, at("summer"), 16): bird(t0, rng.uniform(2800, 4200))
murmur = noise(250, 1800) * (0.6 + 0.4 * np.abs(np.sin(T * 3.1)) * np.abs(np.sin(T * 1.3)))
bed(murmur * 0.02 * seg(at("tower"), at("summer"), 0.5, 0.5), 1, 0.009)
bed(noise(3000, 9000) * (0.5 + 0.5 * np.sin(T * 40) ** 2) * 0.012 * seg(at("summer"), at("winter"), 0.4, 0.4), 1, 0.006)   # summer heat buzz
bed(noise(200, 1500) * (0.6 + 0.4 * np.sin(T * 0.8)) * 0.07 * seg(at("winter"), at("sun"), 0.4, 0.4), 1, 0.017)            # winter wind
def tick():
    n = int(0.05 * SR); tt = np.arange(n) / SR; return filt(rng.standard_normal(n), 2000, 9000) * np.exp(-tt * 120) + np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 80) * 0.3
for t0 in rng.uniform(at("summer"), at("loop"), 40): place(tick(), t0, 0.05, rng.uniform(-0.8, 0.8))      # iron ticking as it warms
def groan(sec, f0):
    n = int(sec * SR); tt = np.arange(n) / SR; f = f0 * (1 + 0.2 * np.sin(np.pi * tt / sec)); s = np.sign(np.sin(np.cumsum(2 * np.pi * f / SR))) * (1 + 0.5 * rng.standard_normal(n))
    return filt(s, 40, 600) * np.sin(np.pi * tt / sec) ** 1.5
for t0 in [fr("summer", 0.5), fr("lean", 0.3), fr("loop", 0.2), fr("loop", 0.6)]: place(groan(2.0, 55), t0, 0.06, 0)
bed((np.sin(2 * np.pi * 220 * T) + 0.5 * np.sin(2 * np.pi * 330 * T)) * 0.006 * seg(at("sun"), at("loop"), 0.4, 0.4), 1)    # thermal camera hum
forge = noise(60, 900) * (0.7 + 0.3 * np.abs(filt(rng.standard_normal(N), None, 6)))
bed(forge * 0.12 * seg(at("rivets"), at("wind"), 0.3, 0.3), 1, 0.008)
bed(noise(3000, 12000) * 0.03 * seg(at("hot"), fr("hot", 0.4), 0.2, 0.3), 1, 0.005)                                      # sizzle
def clang():
    n = int(1.2 * SR); tt = np.arange(n) / SR; s = filt(rng.standard_normal(n), 800, 8000) * np.exp(-tt * 60)
    for f in (820, 1340, 2210, 3170): s += np.sin(2 * np.pi * f * tt) * np.exp(-tt * (6 + f / 600)) * 0.25
    return s + np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 25) * 0.8
for i in range(6): place(clang(), fr("hot", 0.47) + i * 0.16, 0.18, 0)
bed(noise(2000, 9000) * 0.03 * seg(at("cool"), at("wind"), 0.3, 0.3) * np.clip(1 - (T - at("cool")) / 6, 0, 1), 1, 0.006)   # cooling hiss
for t0 in rng.uniform(at("cool"), at("wind"), 10): place(tick(), t0, 0.04, rng.uniform(-0.5, 0.5))
howl = noise(250, 1400) * (0.6 + 0.4 * np.sin(T * 1.3) * np.sin(T * 0.4))
bed(howl * 0.09 * seg(at("wind"), at("orbi"), 0.3, 0.3), 1, 0.017)
bed(np.sin(2 * np.pi * (660 + 30 * np.sin(T)) * T) * 0.006 * seg(at("wind"), at("orbi"), 0.3, 0.3), 1)                 # wind whistle in the lattice
bed(noise(80, 900) * 0.02 * seg(at("orbi"), DUR, 0.5, 1.0), 1, 0.02)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
