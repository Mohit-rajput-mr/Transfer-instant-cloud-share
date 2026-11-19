# Space film sound design (synced to story.js via vo/lines.json) → extra.wav, mixed by kit/synth.py.
# Inside: cabin fans + pump hum, hatch latches · the door opens: decompression roar, then the vacuum: no outside sound,
# only what you'd hear through your own body (heartbeat, exhale, fizz, tinnitus) · blackout = silence · repress roar,
# hatch clunk, alarm · 1966: chamber pumps, hose pop + hiss, klaxon, repress · suit fan + helmet breathing · Orbi UI.
import json, wave
import numpy as np

SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(12)
at = lambda k: L[k]["at"]; end = lambda k: L[k]["at"] + L[k]["dur"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))


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


def clunk(g=1.0):
    n = int(0.6 * SR); tt = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) for f, d in [(140, 0.18), (420, 0.08), (1130, 0.04)])
    return (s * 0.5 + filt(rng.standard_normal(n), 200, 4000) * env(n, 0.001, 0.02)) * g


def beat(g=1.0):  # lub-dub, felt through the body
    n = int(0.45 * SR); tt = np.arange(n) / SR
    def thud(f, d): return np.sin(2 * np.pi * f * tt) * np.minimum(1, tt / 0.004) * np.exp(-tt / d)
    s = thud(48, 0.06); s2 = np.zeros(n); k = int(0.16 * SR); s2[k:] = thud(56, 0.05)[: n - k] * 0.7
    return (s + s2) * g


def tone(f, sec, g, a=0.05, r=0.3):
    n = int(sec * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * np.minimum(1, tt / a) * np.minimum(1, (sec - tt) / r) * g


# ---- the cabin (inside the module): fans, pumps, electronics; ducks to nothing in vacuum
cabin = filt(rng.standard_normal(N), 80, 2500) * 0.05 + np.sin(2 * np.pi * 120 * T) * 0.012 + np.sin(2 * np.pi * 60 * T) * 0.01
cabin *= 1 + 0.15 * np.sin(2 * np.pi * 0.3 * T)
open_t = fr("airlock", 0.82)
inside_k = seg(at("airlock") - 0.3, open_t + 0.4, 0.3, 0.5) + seg(fr("ninety", 0.75), end("ninety") + 0.3, 0.6, 0.4) + seg(at("orbi"), DUR + 1, 0.6, 0.3) * 0.6
out += np.stack([cabin * inside_k, np.roll(cabin, 333) * inside_k])
# hook (outside): a deep, quiet space drone (score), the ticking of the cooling hull
place(tone(46, end("hook") - 0.2, 0.05, 2, 2), 0.2); place(noise(end("hook"), 30, 200) * 0.03, 0.2)
# airlock: latch clicks, hatch unlock, decompression ROAR then sudden quiet
for i in range(4): place(clunk(0.5), fr("airlock", 0.7) + i * 0.12, pan=0.3)
n = int(2.6 * SR); tt = np.arange(n) / SR
roar = filt(rng.standard_normal(n), 60, 7000) * np.minimum(1, tt / 0.05) * np.exp(-tt / 0.55) * 1.6
place(roar, open_t); place(clunk(1.0), open_t)
# vacuum: you hear only your body: heartbeat (fast, then slowing), breath, fizz, ringing
vac0, vac1 = open_t + 1.0, fr("ninety", 0.7)
bt = vac0
while bt < vac1:
    k = (bt - vac0) / max(1, (end("brain") - vac0)); rate = 1.6 - 0.8 * min(1, max(0, k))
    if not (fr("brain", 0.85) < bt < at("cold") + 1.0): place(beat(0.55 if bt < end("brain") else 0.3), bt)
    bt += 1 / rate
place(noise(1.4, 200, 3000) * env(int(1.4 * SR), 0.2, 0.6) * 0.5, fr("lungs", 0.68))                       # breathe out
place(filt((rng.random(int(8 * SR)) < 0.01) * rng.standard_normal(int(8 * SR)), 2000, 9000) * 0.35, at("fizz"))      # fizz in the veins
place(filt((rng.random(int(9 * SR)) < 0.02) * rng.standard_normal(int(9 * SR)), 3000, 12000) * 0.3, fr("boil", 0.5)) # saliva fizz
place(noise(4, 80, 600) * env(int(4 * SR), 1.5, 2.0) * 0.12, fr("swell", 0.05))                                     # skin stretch / creak
n = int((end("brain") - fr("brain", 0.4)) * SR); tt = np.arange(n) / SR; place(np.sin(2 * np.pi * 7400 * tt) * 0.03 * (tt / tt[-1]) ** 2, fr("brain", 0.4))  # tinnitus
out[:, int(fr("brain", 0.93) * SR): int((at("cold") + 0.6) * SR)] *= 0.08                                       # blackout = silence
place(tone(38, end("cold") - at("cold"), 0.06, 1, 1), at("cold"))                                                # the cold: a low drone
place(noise(end("sun") - at("sun"), 3000, 12000) * 0.02, at("sun")); place(tone(220, end("sun") - at("sun"), 0.02, 1, 1), at("sun"))
# ninety: air rushes back in, hatch clunks shut, an alarm counts down
place(noise(3.0, 60, 6000) * env(int(3 * SR), 0.6, 1.0) * 0.8, fr("ninety", 0.6)); place(clunk(1.0), fr("ninety", 0.88))
for i in range(5): place(tone(880, 0.18, 0.06, 0.01, 0.05), fr("ninety", 0.05) + i * 0.6)
# 1966: chamber pumps thump, the hose pops + hiss, klaxon, repress roar; projector flutter (archive)
n = int((end("leblanc") - at("leblanc")) * SR); tt = np.arange(n) / SR
place(np.sin(2 * np.pi * 50 * tt) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 1.2 * tt))) * 0.03 + filt(rng.standard_normal(n), 800, 5000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * tt))) * 0.02, at("leblanc"))
place(clunk(0.8), fr("leblanc", 0.3)); place(noise(3, 1500, 9000) * env(int(3 * SR), 0.01, 1.2) * 0.5, fr("leblanc", 0.3))
for i in range(8): place(tone(520 if i % 2 else 650, 0.32, 0.05, 0.02, 0.05), fr("leblanc", 0.4) + i * 0.36)
place(noise(3.5, 60, 5000) * env(int(3.5 * SR), 0.5, 1.4) * 0.6, fr("leblanc", 0.72))
# suit: fan hum + breathing inside the helmet
n = int((end("suit") - at("suit")) * SR); tt = np.arange(n) / SR
place(filt(rng.standard_normal(n), 200, 1500) * 0.03 + noise(end("suit") - at("suit"), 300, 2500) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.25 * tt)) ** 4 * 0.12, at("suit"))
# Orbi: taps, the code tiles, passcode dots, lock, hash travelling, timer chips, burn
place(tone(1320, 0.12, 0.08, 0.002, 0.08), fr("orbi2", 0.3));
for i in range(4): place(tone(990 + i * 110, 0.08, 0.07, 0.002, 0.05), fr("orbi2", 0.45) + i * 0.09)
for i in range(12): place(tone(1800, 0.03, 0.04, 0.001, 0.02), fr("orbi2", 0.72) + i * 0.065)
place(clunk(0.3), fr("orbi2", 0.74)); place(noise(0.7, 500, 6000) * env(int(0.7 * SR), 0.2, 0.25) * 0.2, fr("orbi2", 0.76))
for i in range(5): place(tone(660 + i * 80, 0.06, 0.06, 0.002, 0.04), fr("orbi3", 0.48) + i * 0.12)
tB = fr("orbi3", 0.8) + 0.6; n = int(2.2 * SR); place(filt((rng.random(n) < 0.02) * rng.standard_normal(n), 1500, 9000) * env(n, 0.2, 0.9) * 0.5, tB)

out = np.nan_to_num(out); peak = np.abs(out).max(); out *= 0.92 / max(peak, 1e-6)
pcm = (np.clip(out.T, -1, 1) * 32767).astype("<i2")
with wave.open("extra.wav", "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("extra.wav", DUR, "s, peak", round(peak, 2))
