# Taipei 101 film sound design (synced to story.js via vo/lines.json) → extra.wav, mixed by kit/synth.py.
# Altitude wind + city hum outside · inside the damper floor: deep room tone, cable creak, the ball's slow whoosh, plate clinks ·
# building groan + swinging lamp for the seasick shot · hydraulic hiss + oil squelch in the pistons · typhoon rain, howling wind,
# thunder on the flashes, muffled storm inside · visitors' murmur on the deck · Orbi: camera focus beep + shutter, file lands.
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


def thunder(sec=5.0, g=1.0):
    n = int(sec * SR); tt = np.arange(n) / SR
    crack = filt(rng.standard_normal(n), 300, 6000) * np.exp(-tt / 0.08)
    roll = filt(rng.standard_normal(n), 25, 260) * np.minimum(1, tt / 0.15) * np.exp(-tt / 1.6) * (1 + 0.5 * np.sin(2 * np.pi * 1.7 * tt))
    return (crack * 0.6 + roll * 2.2) * g


# ---- outside: altitude wind (gusty) wherever we're in the sky; city murmur far below
wind = filt(rng.standard_normal(N), 90, 1400) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * T) ** 2) * 0.09
outside = seg(0, fr("hook", 0.52), 0.3, 0.2) + seg(at("tower"), fr("storms", 0.05), 0.2, 0.3) + seg(fr("storms", 0.45), at("sick"), 0.3, 0.3) \
    + seg(at("trick"), at("tuned"), 0.3, 0.3) + seg(at("forty"), at("soudelor"), 0.3, 0.3)
out += np.stack([wind * outside, np.roll(wind, 900) * outside])
city = filt(rng.standard_normal(N), 150, 900) * 0.025; out += np.stack([city * outside, city * outside])
# ---- inside the damper floor: deep room tone + hum; the ball's slow whoosh on each swing
room = filt(rng.standard_normal(N), 40, 300) * 0.05 + np.sin(2 * np.pi * 55 * T) * 0.008
inside = seg(fr("hook", 0.52), end("hook"), 0.15, 0.3) + seg(at("sick"), at("trick"), 0.3, 0.3) + seg(at("tuned"), fr("pistons", 0.32), 0.3, 0.3) \
    + seg(fr("soudelor", 0.42), end("orbi3") + 1, 0.3, 0.5)
out += np.stack([room * inside, np.roll(room, 444) * inside])
sw = filt(rng.standard_normal(N), 120, 900) * (np.sin(2 * np.pi * T / PER * 2) ** 2) * 0.05
out += np.stack([sw * inside, sw * inside])
# ---- hook: the glass parts with a whoosh, then a deep metallic resonance as we arrive at the ball
place(noise(1.6, 300, 5000) * env(int(1.6 * SR), 0.6, 0.4) * 0.5, fr("hook", 0.15))
place(tone(41, 4.0, 0.12, 0.1, 2.0) + tone(82.5, 4.0, 0.05, 0.1, 2.0), fr("hook", 0.52))
place(creak(1.6, 80, 0.3), fr("hook", 0.7), pan=-0.3)
# ---- storms: space hush over the map; typhoon swirl; quake rumble; then wind + a building groan
place(noise(fr("storms", 0.45) - at("storms"), 300, 3000) * 0.015, at("storms"))
place(filt(rng.standard_normal(int(2.5 * SR)), 20, 120) * env(int(2.5 * SR), 0.2, 0.9) * 1.6, fr("storms", 0.24))
place(creak(2.6, 55, 0.5), fr("storms", 0.6))
# ---- sick: the building creaks, the lamp chain squeaks on each swing, water slops
for i in range(3): place(creak(1.8, 60 + i * 7, 0.35), at("sick") + 0.3 + i * PER / 2, pan=0.2)
for i in range(6): place(tone(1900, 0.18, 0.025, 0.02, 0.1) + tone(2350, 0.18, 0.015, 0.02, 0.08), at("sick") + 0.5 + i * PER / 4, pan=0.4)
place(noise(1.0, 200, 2500) * env(int(1.0 * SR), 0.15, 0.3) * 0.12, fr("sick", 0.12)); place(noise(1.0, 200, 2500) * env(int(1.0 * SR), 0.15, 0.3) * 0.1, fr("sick", 0.3))
# ---- ball: plates fan out (a run of clinks) and close; cables tension creak
t0 = fr("ball", 0.42)
for i in range(20): place(clink(1800 + (i % 5) * 140, 0.35), t0 + i * 0.045, pan=(i % 3 - 1) * 0.3)
for i in range(20): place(clink(1600 + (i % 4) * 120, 0.3), fr("ball", 0.68) + i * 0.04, pan=(i % 3 - 1) * 0.3)
place(creak(2.0, 110, 0.4), fr("ball", 0.8), pan=0.3)
# ---- trick: a gust slams in, the tower groans, the ball swings back with a deep heave
place(noise(2.0, 100, 3000) * env(int(2 * SR), 0.3, 0.8) * 0.45, fr("trick", 0.12), pan=-0.5)
place(creak(2.4, 50, 0.6), fr("trick", 0.3)); place(tone(38, 3.0, 0.1, 0.4, 1.2), fr("trick", 0.45))
# ---- pistons: each stroke = hydraulic hiss + squelch; in the cutaway, oil gurgles through the holes, then heat sizzle
for i in range(4): place(noise(0.9, 400, 5000) * env(int(0.9 * SR), 0.1, 0.25) * 0.18, at("pistons") + 0.3 + i * PER / 2 / 1.4, pan=0.3)
tc = fr("pistons", 0.32); n = int((end("pistons") - tc + 0.3) * SR); tt = np.arange(n) / SR
gurgle = filt((rng.random(n) < 0.004) * rng.standard_normal(n), 150, 900) * 2.5 * np.abs(np.cos(tt * 2.2)) * np.exp(-tt * 0.22)
place(gurgle, tc); place(filt(rng.standard_normal(n), 3000, 12000) * 0.02 * np.minimum(1, tt / (n / SR)), tc)
# ---- soudelor: rain + howl outside; thunder on the two flashes; inside: muffled storm, the ball heaves a full metre
tI = fr("soudelor", 0.42)
n = int((tI - at("soudelor") + 0.4) * SR); tt = np.arange(n) / SR
rain = filt(rng.standard_normal(n), 800, 12000) * 0.12 + filt(rng.standard_normal(n), 100, 900) * 0.12 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * tt))
howl = np.sin(2 * np.pi * np.cumsum(420 + 140 * np.sin(2 * np.pi * 0.23 * tt)) / SR) * 0.012
place(np.minimum(1, tt / 0.3) * (rain + howl), at("soudelor"))
place(thunder(5.0, 0.6), fr("soudelor", 0.2) + 0.05); place(thunder(4.0, 0.45), fr("soudelor", 0.33) + 0.2, pan=-0.3)
n = int((end("soudelor") - tI + 0.3) * SR); tt = np.arange(n) / SR
place(filt(rng.standard_normal(n), 60, 500) * 0.08 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * tt)), tI)
for i in range(3): place(creak(2.2, 48 + i * 5, 0.55), tI + 0.6 + i * PER / 1.5 / 2)
# ---- visit: visitors' murmur on the deck
n = int((at("orbi") - at("visit") + 0.5) * SR); tt = np.arange(n) / SR
mur = sum(filt(rng.standard_normal(n), 250, 1800) * (0.5 + 0.5 * np.sin(2 * np.pi * (1.3 + k * 0.7) * tt + k)) ** 2 for k in range(4)) * 0.012
place(mur * np.minimum(1, tt / 0.4), at("visit"))
# ---- Orbi: focus beep when the phone locks onto the QR, a soft shutter, the file lands; burn crackle
place(tone(1760, 0.09, 0.07, 0.003, 0.05), fr("orbi2", 0.47)); place(tone(2350, 0.09, 0.06, 0.003, 0.05), fr("orbi2", 0.47) + 0.1)
place(noise(0.12, 1500, 9000) * env(int(0.12 * SR), 0.002, 0.03) * 0.4, fr("orbi2", 0.52))
tB = fr("orbi3", 0.8) + 0.6; n = int(2.2 * SR); place(filt((rng.random(n) < 0.02) * rng.standard_normal(n), 1500, 9000) * env(n, 0.2, 0.9) * 0.5, tB)

out = np.nan_to_num(out); peak = np.abs(out).max(); out *= 0.92 / max(peak, 1e-6)
pcm = (np.clip(out.T, -1, 1) * 32767).astype("<i2")
with wave.open("extra.wav", "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("extra.wav", DUR, "s, peak", round(peak, 2))
