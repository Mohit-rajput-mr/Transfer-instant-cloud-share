import json, wave
import numpy as np

SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(101)
at = lambda k: L[k]["at"]; end = lambda k: L[k]["at"] + L[k]["dur"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
PER = 7.0


def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))


def place(sig, t0, g=1.0, pan=0.0):
    i0 = int(t0 * SR)
    if i0 >= N or i0 + len(sig) < 0: return
    j0 = max(0, i0); s = sig[j0 - i0:][: N - j0]
    out[0, j0:j0 + len(s)] += s * g * (1 - pan * 0.6); out[1, j0:j0 + len(s)] += s * g * (1 + pan * 0.6)


def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def env(n, a, d): tt = np.arange(n) / SR; return np.minimum(1, tt / max(a, 1e-4)) * np.exp(-tt / d)
def noise(sec, lo, hi): return filt(rng.standard_normal(int(sec * SR)), lo, hi)
def tone(f, sec, g, a=0.05, r=0.3):
    n = int(sec * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * np.minimum(1, tt / a) * np.minimum(1, (sec - tt) / r) * g


def creak(sec=1.2, f0=95, g=1.0):  # stressed steel / cable: a slow, rough, gliding tone
    n = int(sec * SR); tt = np.arange(n) / SR; f = f0 * (1 + 0.25 * np.sin(np.pi * tt / sec))
    ph = 2 * np.pi * np.cumsum(f) / SR; s = np.sign(np.sin(ph)) * 0.3 + np.sin(ph * 2.01) * 0.4
    s *= (0.5 + 0.5 * (rng.random(n) < 0.3)); return filt(s, 60, 900) * np.sin(np.pi * tt / sec) ** 2 * g


def clink(f=2100, g=1.0):
    n = int(0.5 * SR); tt = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * k * tt) * np.exp(-tt / (0.12 / k)) for k in (1, 2.76, 5.4)) * g * 0.3


# Rocket film sound design: engine roar (rumble + crackle) when it fires, LOX boil, a flame breathing oxygen,
# turbopump whine, gas-generator hiss, the green pop, the nine-engine launch thunder.
def roar(sec, g=1.0, crackle=1.0):
    n = int(sec * SR); tt = np.arange(n) / SR
    rum = filt(rng.standard_normal(n), 25, 220) * 1.4 + filt(rng.standard_normal(n), 200, 2500) * 0.5
    cr = filt((rng.random(n) < 0.004) * rng.standard_normal(n) * 3, 400, 6000) * crackle
    return (rum + cr) * g
fire_on = seg(fr("hook", 0.12), at("tanks"), 0.15, 0.4) + seg(fr("spark", 0.55), at("pumps") * 0 + end("nozzle"), 0.2, 0.4) * 0.6 + seg(at("push"), fr("push", 0.62), 0.2, 0.6)
r = roar(DUR, 0.11); out += np.stack([r * fire_on, np.roll(r, 700) * fire_on])
place(noise(1.2, 100, 6000) * env(int(1.2 * SR), 0.005, 0.25) * 0.8, fr("hook", 0.12))                     # ignition bang
# tanks: LOX boiling + creaking cold metal
n = int((end("tanks") - at("tanks")) * SR); place(filt((rng.random(n) < 0.03) * rng.standard_normal(n), 300, 3000) * 0.5 + noise(n / SR, 80, 500) * 0.04, at("tanks"))
# why: a flame breathing (soft roar), dying to nothing, then roaring back
fl = filt(rng.standard_normal(N), 80, 1200) * 0.06 * (0.8 + 0.2 * np.sin(2 * np.pi * 3 * T))
out += np.stack([fl, fl]) * (seg(at("why"), fr("why", 0.45) + 0.6, 0.3, 0.6) + seg(fr("why", 0.72), at("pumps"), 0.2, 0.3) * 1.8)
# pumps: turbine whine rising, liquid rush
n = int((end("gg") - at("pumps")) * SR); tt = np.arange(n) / SR; f = 600 + 1800 * np.minimum(1, tt / 2.5)
place(np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.03 + np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR) * 0.012 + filt(rng.standard_normal(n), 300, 3000) * 0.05, at("pumps"))
# gg: small combustor hiss + smoky chuff
n = int((end("gg") - at("gg")) * SR); place(filt(rng.standard_normal(n), 800, 7000) * 0.06 + filt(rng.standard_normal(n), 60, 400) * 0.08, at("gg"))
# cool: chamber roar inside + fluid trickle
n = int((end("cool") - at("cool")) * SR); place(roar(n / SR, 0.06, 0.4) + filt((rng.random(n) < 0.02) * rng.standard_normal(n), 1500, 6000) * 0.2, at("cool"))
# spark: hiss, the green pop, then the main engine catches
place(noise(0.6, 2000, 9000) * env(int(0.6 * SR), 0.05, 0.2) * 0.3, fr("spark", 0.15)); place(noise(0.8, 80, 4000) * env(int(0.8 * SR), 0.003, 0.15) * 1.0, fr("spark", 0.22))
# nozzle: rising whoosh as the gas speeds up
n = int((end("nozzle") - fr("nozzle", 0.3)) * SR); tt = np.arange(n) / SR; place(filt(rng.standard_normal(n), 500, 8000) * 0.08 * (tt / tt[-1]), fr("nozzle", 0.3))
# push: in the vacuum the roar drops away to the body's hum
place(tone(48, end("push") - fr("push", 0.62), 0.06, 0.5, 1.0), fr("push", 0.62))
# nine: launch thunder (crackling, huge low end), then it climbs away
t0 = fr("nine", 0.15); n = int((DUR - t0) * SR); tt = np.arange(n) / SR
lau = roar(n / SR, 0.35, 2.5) * np.minimum(1, tt / 0.8) * (1 / (1 + np.maximum(0, tt - 6) * 0.25))
place(lau, t0); place(noise(4, 20, 120) * env(int(4 * SR), 0.3, 1.5) * 1.2, t0 + 0.4)

out = np.nan_to_num(out); peak = np.abs(out).max(); out *= 0.92 / max(peak, 1e-6)
pcm = (np.clip(out.T, -1, 1) * 32767).astype("<i2")
with wave.open("extra.wav", "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("extra.wav", DUR, "s, peak", round(peak, 2))
