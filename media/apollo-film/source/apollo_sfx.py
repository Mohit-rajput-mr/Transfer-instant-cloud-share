# Apollo 11 sound design → extra.wav (mixed by kit/synth.py under the voice). Space: a low hum and the cabin fans;
# re-entry: a rising plasma roar with crackle (sparks), buffeting, radio static that cuts out in the blackout;
# the heat-shield macro: sizzling char and pops; parachutes: mortar thumps, canopy snaps and wind;
# splashdown: the hit, spray and waves; the museum: room tone; Orbi: a quiet gallery.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(19)
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
def thump(t0, g=0.2, f0=60):
    n = int(0.8 * SR); tt = np.arange(n) / SR; place(np.sin(2 * np.pi * f0 * tt * (1 + np.exp(-tt * 20))) * np.exp(-tt * 7) + filt(rng.standard_normal(n), 80, 900) * np.exp(-tt * 18) * 0.6, t0, g)
# --- where we are
hookA = seg(0, fr("hook", 0.5), 0.2, 0.1)
fire = np.clip(seg(fr("hook", 0.5), at("real"), 0.05, 0.2) + seg(at("speed"), at("shield"), 2.5, 0.2) + seg(fr("silver", 0.3), fr("silver", 0.85), 0.5, 0.5) * 0.7 + seg(at("blackout"), at("chutes"), 0.2, 0.3), 0, 1)
museum = np.clip(seg(at("real"), at("speed"), 0.2, 0.2) + seg(at("orbi"), DUR, 0.3, 1.0), 0, 1)
shield = seg(at("shield"), at("silver"), 0.2, 0.2); burn = seg(at("burn"), at("silver"), 0.3, 0.2)
ocean = seg(at("chutes"), at("orbi"), 0.3, 0.5)
bed(noise(30, 120) * 0.05 * (hookA + seg(at("silver"), fr("silver", 0.3), 0.2, 0.3)), 1, 0.03)          # deep space hum
bed(noise(400, 2500) * 0.006 * (hookA + seg(at("g"), at("chutes"))), 1, 0.01)                             # cabin fans
roar = noise(25, 420) * (0.75 + 0.25 * np.sin(T * 7) * np.sin(T * 2.3)); bed(roar * 0.22 * fire, 1, 0.02)  # plasma roar
bed(noise(1200, 7000) * 0.03 * fire * (0.5 + 0.5 * (rng.random(N) > 0.997)), 1, 0.007)                    # crackle
for t0 in np.arange(at("speed"), at("shield"), 0.37) + rng.uniform(0, 0.2, len(np.arange(at("speed"), at("shield"), 0.37))): thump(t0, 0.05, 40)   # buffeting
for t0 in np.arange(at("g"), at("chutes"), 0.29): thump(t0, 0.06, 35)
# radio: squelch + chatter-like static that dies when the plasma closes in
st = noise(800, 3500) * (0.4 + 0.6 * (np.sin(T * 23) > 0.2)); bed(st * 0.02 * seg(at("blackout"), fr("blackout", 0.15), 0.05, 0.05), 1, 0.005)
bed(st * 0.012 * seg(fr("blackout", 0.15), at("g"), 0.05, 0.3) * (0.5 + 0.5 * np.sin(T * 0.7)), 1, 0.005)
for t0 in np.arange(fr("blackout", 0.1), fr("blackout", 0.6), 0.55):                                       # radio pulses that die
    n = int(0.18 * SR); tt = np.arange(n) / SR; place(np.sin(2 * np.pi * 1000 * tt) * np.exp(-tt * 25), t0, 0.04, 0.3)
# heat shield macro: sizzle + pops
bed(noise(2500, 9000) * 0.03 * shield * (0.3 + 0.7 * burn), 1, 0.006); bed(noise(60, 300) * 0.06 * burn, 1, 0.02)
for t0 in rng.uniform(at("burn"), at("silver"), 30):
    n = int(0.05 * SR); tt = np.arange(n) / SR; place(filt(rng.standard_normal(n), 1500, 8000) * np.exp(-tt * 80), t0, 0.08, rng.uniform(-0.6, 0.6))
# parachutes: mortars, canopy snaps, wind
dro = at("chutes"); mn = fr("chutes", 0.45)
thump(dro + 0.05, 0.25, 70); thump(dro + 0.25, 0.22, 70)
for k in range(3): thump(mn + k * 0.12, 0.2, 55)
def snap(t0, g=0.2):
    n = int(0.6 * SR); tt = np.arange(n) / SR; place(filt(rng.standard_normal(n), 100, 2500) * np.exp(-tt * 9) * (1 - np.exp(-tt * 200)), t0, g, rng.uniform(-0.3, 0.3))
snap(fr("chutes", 0.12)); snap(fr("chutes", 0.15), 0.15); snap(fr("chutes", 0.7), 0.25); snap(fr("chutes", 0.75), 0.2); snap(fr("chutes", 0.8), 0.2)
bed(noise(100, 1500) * (0.6 + 0.4 * np.sin(T * 1.7)) * 0.06 * seg(at("chutes"), fr("splash", 0.55), 0.3, 0.1), 1, 0.015)
# splashdown
hit = fr("splash", 0.55); thump(hit, 0.45, 45); n = int(2.5 * SR); tt = np.arange(n) / SR
place(filt(rng.standard_normal(n), 300, 6000) * np.exp(-tt * 2.2) * (1 - np.exp(-tt * 60)), hit + 0.02, 0.25)
bed(noise(80, 900) * (0.5 + 0.5 * np.abs(np.sin(T * 0.8))) * 0.06 * seg(hit, at("orbi"), 0.5, 0.5), 1, 0.02)     # waves
bed(noise(80, 900) * 0.025 * seg(at("splash"), hit, 0.3, 0.1), 1, 0.02)
for k in range(3):                                                                                            # bags inflating
    n = int(1.2 * SR); tt = np.arange(n) / SR; place(filt(rng.standard_normal(n), 800, 5000) * np.sin(np.pi * tt / 1.2) ** 2, fr("flip", 0.15) + k * 0.15, 0.04)
# museum room tone
bed(noise(60, 400) * 0.03 * museum, 1, 0.03); bed(noise(2000, 6000) * 0.003 * museum, 1, 0.01)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
