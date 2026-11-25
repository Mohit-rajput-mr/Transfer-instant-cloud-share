# OSIRIS-REx sound design → extra.wav. Space near Bennu: a low drone; the touch: a soft contact thump, a hiss of gas, pebbles
# rattling and flowing (granular), the sink: a deep groan; the thrusters: a muffled roar; the lab: room hum, a ratchet on the
# stuck fasteners, a click when they finally turn; Orbi: room tone.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(18)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
space = np.clip(seg(0, at("touch"), 0.2, 0.4) + seg(at("home"), at("stuck"), 0.3, 0.4), 0, 1)
bed(sum(np.sin(2 * np.pi * f * T + i) * (0.6 + 0.4 * np.sin(T * 0.13 * (i + 1))) for i, f in enumerate((46.2, 69.3, 92.5))) * 0.02 * space, 1, 0.03)
tc = fr("touch", 0.35)
def thump(t0, g, f0=60):
    k = np.clip(T - t0, 0, None); e = np.exp(-k * 9) * (T >= t0); bed(np.sin(2 * np.pi * f0 * k) * e * g, 1, 0.0)
thump(tc, 0.35)
gas = seg(tc, tc + 1.6, 0.05, 0.6); bed(filt(rng.standard_normal(N), 2500, 9000) * 0.04 * gas, 1, 0.004)
grain = seg(tc, fr("thrust", 0.4), 0.2, 0.3) + seg(fr("thrust", 0.4), at("home"), 0.1, 1.0) * 1.6
bed(filt(rng.standard_normal(N), 1500, 7000) * (rng.random(N) > 0.96) * 1.5 * 0.05 * grain, 1, 0.003)
groan = seg(at("sink"), at("thrust"), 0.5, 0.5); bed(np.sin(2 * np.pi * (45 + 8 * np.sin(T * 0.7)) * T) * 0.03 * groan, 1, 0.01)
roar = seg(fr("thrust", 0.4), at("home"), 0.1, 0.8); bed(filt(rng.standard_normal(N), 40, 400) * 0.12 * roar, 1, 0.02)
lab = seg(at("stuck"), at("orbi"), 0.3, 0.4); bed(filt(rng.standard_normal(N), 80, 900) * 0.02 * lab, 1, 0.03); bed(np.sin(2 * np.pi * 100 * T) * 0.006 * lab, 1, 0.002)
for i in range(6): thump(fr("stuck", 0.6) + i * 0.12, 0.05, 900)
for i in range(3): thump(fr("tools", 0.4) + i * 0.25, 0.08, 700)
orbi = seg(at("orbi"), DUR, 0.3, 1.0); bed(filt(rng.standard_normal(N), 60, 400) * 0.03 * orbi, 1, 0.03)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
