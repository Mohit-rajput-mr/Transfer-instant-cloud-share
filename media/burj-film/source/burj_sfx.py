# Burj Khalifa film sound design (synced via vo/lines.json) → extra.wav, mixed by kit/synth.py under the voice.
# Desert wind + distant city hum, the Dubai Fountain lake, gusting high-altitude wind and sand hiss at the top,
# the wind tunnel (fan drone, rhythmic whoosh of swirls for the plain tower, a jittery hiss for the Burj, a steel
# groan as the plain tower rocks), the building's slow creak when it sways, an x-ray hum, the concrete pump (diesel
# throb + rhythmic slugs climbing), the underground rumble at the piles, spire wind whistle, Orbi room tone.
import json, wave
import numpy as np

SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(7)
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
def bed(x, g, width=0.012): out[0] += x * g; out[1] += np.roll(x, int(width * SR)) * g
def noise(lo, hi): return filt(rng.standard_normal(N), lo, hi)

city = (T < at("vortex")) | ((T >= at("flower")) & (T < at("confuse"))) | ((T >= at("sway")) & (T < at("piles"))) | ((T >= at("spire")) & (T < at("orbi")))
lab = ((T >= at("vortex")) & (T < at("flower"))) | ((T >= at("confuse")) & (T < at("sway")))
# outdoors: warm desert wind and the far city
gust = 0.6 + 0.4 * np.sin(T * 0.37) * np.sin(T * 0.11 + 1)
bed(noise(60, 700) * gust * 0.05 * city, 1, 0.015)
bed(noise(40, 260) * 0.03 * city, 1, 0.02)
bed(noise(1500, 6000) * 0.006 * city, 1, 0.011)                     # traffic hiss far below
# the fountain lake on the approach (hook)
bed(noise(400, 4000) * (0.5 + 0.5 * np.abs(np.sin(T * 2.1))) * 0.02 * seg(0, at("tower") - 0.5, 0.5, 1), 1, 0.007)
# up top: howling wind and sand hiss
howl = noise(250, 1400) * (0.6 + 0.4 * np.sin(T * 1.3) * np.sin(T * 0.4))
bed(howl * 0.09 * seg(at("enemy"), at("vortex"), 0.3, 0.3) + howl * 0.05 * seg(at("spire"), at("orbi"), 0.4, 0.4), 1, 0.017)
bed(noise(3000, 10000) * 0.03 * seg(at("enemy"), at("vortex"), 0.2, 0.3), 1, 0.009)
# the wind tunnel: fan drone, the swirls' rhythmic whoosh (period = D/(0.2U) = 3.67 s → a swirl each 1.83 s)
fan = np.sin(2 * np.pi * 58 * T) * 0.5 + np.sin(2 * np.pi * 116.4 * T) * 0.25 + noise(80, 900) * 0.6
bed(fan * 0.05 * lab, 1, 0.006)
P = 4.4 / (0.2 * 6.0) / 2
def whoosh(sec=1.2, lo=200, hi=2200):
    n = int(sec * SR); tt = np.arange(n) / SR
    return filt(rng.standard_normal(n), lo, hi) * np.sin(np.pi * tt / sec) ** 2
for a, b in [(at("vortex"), at("flower")), (at("confuse"), at("sway"))]:
    t0, side = a + 0.3, 1
    while t0 < b - 0.5: place(whoosh(), t0, 0.12, 0.7 * side); side = -side; t0 += P
# the Burj's wake: an irregular hiss with no rhythm
jit = noise(500, 5000) * (0.4 + 0.6 * np.abs(filt(rng.standard_normal(N), None, 8)))
bed(jit * 0.03 * seg(at("confuse"), at("sway"), 0.3, 0.3), 1, 0.013)
# steel groan as the plain tower rocks, the real tower's slow creak when it sways
def creak(sec=1.6, f0=70):
    n = int(sec * SR); tt = np.arange(n) / SR; f = f0 * (1 + 0.3 * np.sin(np.pi * tt / sec))
    s = np.sign(np.sin(np.cumsum(2 * np.pi * f / SR))) * (1 + 0.5 * rng.standard_normal(n))
    return filt(s, 40, 700) * np.sin(np.pi * tt / sec) ** 1.5
for t0 in np.arange(at("rock") + 0.6, at("flower") - 1, P * 2): place(creak(1.4, 60 + rng.random() * 30), t0, 0.06, rng.uniform(-0.5, 0.5))
for t0 in np.arange(at("sway") + 0.5, at("core") - 1, 4.8): place(creak(2.2, 45), t0, 0.07, 0)
# x-ray hum (core) + concrete pump: a diesel throb and slugs thumping up the pipe
bed((np.sin(2 * np.pi * 110 * T) + 0.5 * np.sin(2 * np.pi * 165 * T)) * 0.012 * seg(at("core"), at("piles"), 0.5, 0.4), 1)
diesel = np.sign(np.sin(2 * np.pi * 24 * T)) * 0.4 + noise(30, 200)
bed(filt(diesel, 20, 300) * 0.09 * seg(at("pump"), at("piles"), 0.3, 0.3), 1, 0.004)
for t0 in np.arange(at("pump") + 0.2, at("piles") - 0.2, 0.55):
    n = int(0.25 * SR); tt = np.arange(n) / SR; place(np.sin(2 * np.pi * 52 * tt) * np.exp(-tt * 18), t0, 0.18, 0)
# underground: deep rumble, gravel trickles
bed(noise(20, 120) * 0.25 * seg(at("piles"), at("spire"), 0.4, 0.4), 1, 0.003)
for t0 in rng.uniform(at("piles"), at("spire") - 0.5, 25): place(filt(rng.standard_normal(int(0.3 * SR)), 800, 6000) * np.exp(-np.arange(int(0.3 * SR)) / SR * 14), t0, 0.04, rng.uniform(-0.8, 0.8))
# spire: a thin whistle in the wind
bed(np.sin(2 * np.pi * (880 + 40 * np.sin(T * 0.7)) * T) * 0.006 * seg(at("spire"), at("orbi"), 0.5, 0.5), 1)
# Orbi: quiet terrace, wind soft, a soft "signal lost" drop
bed(noise(80, 900) * 0.02 * seg(at("orbi"), DUR, 0.5, 1.0), 1, 0.02)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s, peak", round(float(np.abs(mix).max()), 2))
