# Wright Flyer sound design → extra.wav. Kitty Hawk: steady strong wind + gusts, sand hiss, dune grass rustle; the engine
# (4 cylinders, 4-stroke, ~1,025 rpm → ~34 firings/s) with chain rattle and the prop thrum (2 blades × 2 props × 5.85 rps);
# fabric flutter + wire hum in flight; the workshop: fan hum + room tone; the gust: a roar, a thump, wood cracking; museum tone.
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
    if i0 >= N or i0 < 0: return
    s = sig[: N - i0]; out[0, i0:i0 + len(s)] += s * g * (1 - pan * 0.6); out[1, i0:i0 + len(s)] += s * g * (1 + pan * 0.6)
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
def noise(lo, hi): return filt(rng.standard_normal(N), lo, hi)
outside = np.clip(seg(0, at("tunnel"), 0.1, 0.2) + seg(at("warp"), at("orbi"), 0.2, 0.4), 0, 1)
tunnel = seg(at("tunnel"), at("lift"), 0.2, 0.2); lift = seg(at("lift"), at("warp"), 0.2, 0.2); museum = seg(at("orbi"), DUR, 0.3, 1.0)
gustE = seg(fr("gust", 0.2), fr("gust", 0.75), 0.4, 0.6)
wind = noise(60, 900) * (0.65 + 0.35 * np.sin(T * 0.7) * np.sin(T * 0.23 + 1)); bed(wind * 0.11 * outside * (1 + 1.8 * gustE), 1, 0.02)
bed(noise(2500, 9000) * 0.02 * outside * (1 + gustE), 1, 0.007)                                              # sand hiss
bed(noise(1200, 5000) * (0.5 + 0.5 * np.sin(T * 7)) * 0.01 * outside, 1, 0.009)                              # grass rustle
# engine: running in the props shots and from the day line through the flights
eng = np.clip(seg(at("props"), at("tunnel"), 0.6, 0.3) + seg(at("day"), at("gust"), 0.3, 0.6) + seg(0, fr("hook", 0.55), 0.1, 0.2), 0, 1)
fire = 34.0; ph = 2 * np.pi * fire * T; pulses = np.maximum(0, np.sin(ph)) ** 6
engine = filt(pulses + 0.4 * filt(rng.standard_normal(N), 80, 800) * pulses, 25, 900); bed(engine * 0.16 * eng, 1, 0.004)
thrum = np.sin(2 * np.pi * 23.4 * T) ** 8; bed(filt(thrum + 0.3 * rng.standard_normal(N) * thrum, 30, 400) * 0.08 * eng, 1, 0.01)   # props
chain = filt(rng.standard_normal(N), 2000, 7000) * (np.sin(2 * np.pi * 47 * T) > 0.6); bed(chain * 0.012 * eng, 1, 0.006)
flying = np.clip(seg(0, fr("hook", 0.55), 0.1, 0.2) + seg(fr("rail", 0.72), fr("twelve", 0.92), 0.3, 0.2), 0, 1)
bed(noise(300, 2000) * (0.6 + 0.4 * np.sin(T * 31)) * 0.04 * flying, 1, 0.01)                               # fabric flutter
bed(np.sin(2 * np.pi * 640 * T + np.sin(T * 3)) * 0.004 * flying, 1, 0.003)                                  # wire hum
# rail run: the dolly wheels on the metal strip, rising
run = seg(at("rail"), fr("rail", 0.72), 0.2, 0.1); bed(filt(rng.standard_normal(N), 400, 3000) * (0.4 + 0.6 * (np.sin(T * 60) > 0)) * 0.03 * run, 1, 0.005)
def thump(t0, g=0.2, f0=60):
    n = int(0.8 * SR); tt = np.arange(n) / SR; place(np.sin(2 * np.pi * f0 * tt * (1 + np.exp(-tt * 20))) * np.exp(-tt * 7) + filt(rng.standard_normal(n), 80, 900) * np.exp(-tt * 18) * 0.6, t0, g)
thump(fr("twelve", 0.92), 0.25, 55)                                                                           # landing on the sand
def crack(t0, g=0.15):
    n = int(0.25 * SR); tt = np.arange(n) / SR; place(filt(rng.standard_normal(n), 900, 7000) * np.exp(-tt * 25) * (1 + 3 * (rng.random(n) > 0.995)), t0, g, rng.uniform(-0.4, 0.4))
g0 = fr("gust", 0.3); thump(g0 + 0.5, 0.3, 45); thump(g0 + 1.4, 0.35, 40)
for k in range(7): crack(g0 + 0.4 + k * 0.17 + rng.uniform(0, 0.08), 0.12)
# the workshop + tunnel fan; the lift diagram's soft airflow
bed(noise(60, 300) * 0.04 * tunnel, 1, 0.02); bed((np.sin(2 * np.pi * 95 * T) * 0.6 + filt(rng.standard_normal(N), 200, 1500) * 0.5) * 0.05 * tunnel, 1, 0.01)
bed(noise(400, 3000) * (0.6 + 0.4 * np.sin(T * 2.2)) * 0.03 * lift, 1, 0.012)
bed(noise(60, 400) * 0.03 * museum, 1, 0.03); bed(noise(2000, 6000) * 0.003 * museum, 1, 0.01)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
