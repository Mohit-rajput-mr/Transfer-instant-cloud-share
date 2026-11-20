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

# Launch film sound design: soft office room tone, keyboard taps at the desks, UI pings as the problem cards pile up,
# a low "error" thud for each bounce, a hush for the hidden problems; then the beam (rising glassy shimmer), the lock click,
# anonymous mode (deep pad), the download beam ticks, workspace (light clicks), offline (hotspot chirp).
room = filt(rng.standard_normal(N), 60, 900) * 0.025 + np.sin(2 * np.pi * 50 * T) * 0.004
out += np.stack([room, np.roll(room, 321)])
def ping(f=1320, g=0.06): return tone(f, 0.22, g, 0.003, 0.18) + tone(f * 1.5, 0.22, g * 0.4, 0.003, 0.15)
def thud(g=0.5): n = int(0.5 * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * (70 - 30 * tt) * tt) * np.exp(-tt / 0.12) * g
def keys(sec, g=0.08):
    n = int(sec * SR); s = np.zeros(n); t0 = 0.0
    while t0 < sec - 0.05: i = int(t0 * SR); k = filt(rng.standard_normal(int(0.03 * SR)), 1500, 7000) * env(int(0.03 * SR), 0.001, 0.008); s[i:i + len(k)] += k[: n - i]; t0 += 0.07 + rng.random() * 0.12
    return s * g
place(keys(end("hook") - 0.2, 0.25), 0.2, pan=-0.3)
for i in range(6): place(ping(990 + i * 70), at("p1") + 0.1 + i * (L["p1"]["dur"] - 0.6) / 6, pan=(i % 3 - 1) * 0.4)
for i in range(3): place(thud(0.6), at("p2") + 0.1 + i * (L["p2"]["dur"] - 0.6) / 3)
place(tone(55, end("p4") - at("p3"), 0.05, 1.0, 1.0), at("p3"))
for i in range(3): place(ping(660, 0.05), fr("p3", 0.18) + i * (L["p3"]["dur"] * 0.82) / 3.2)
for i in range(6): place(ping(1480 + i * 90, 0.05), fr("q", 0.12) + i * (L["q"]["dur"] * 0.88) / 6.5)
# the beam: glassy rising shimmer while the ball flies
n = int(1.6 * SR); tt = np.arange(n) / SR; place(sum(np.sin(2 * np.pi * (600 + 900 * tt / tt[-1]) * k * tt) / k for k in (1, 2, 3)) * 0.05 * np.sin(np.pi * tt / tt[-1]), fr("s1", 0.55))
place(tone(2093, 0.3, 0.05, 0.003, 0.25), fr("s2", 0.2))
# anonymous: deep pad under a1–a3, beam ticks while downloading
place(tone(41.2, end("a3") - at("a1"), 0.07, 1.5, 1.5) + tone(61.7, end("a3") - at("a1"), 0.04, 1.5, 1.5), at("a1"))
t0 = fr("a3", 0.45); t1 = fr("a3", 0.85)
k = t0
while k < t1: place(tone(1760, 0.05, 0.03, 0.002, 0.04), k, pan=0.3); k += 0.12
place(ping(1046, 0.07), t1); place(ping(1568, 0.06), t1 + 0.12)
# workspace: soft taps; offline: hotspot chirp
for i in range(4): place(keys(0.6, 0.12), at("w1") + 0.4 + i * 1.6, pan=-0.2)
place(tone(2600, 0.08, 0.04, 0.002, 0.05), fr("off", 0.1)); place(tone(3100, 0.08, 0.04, 0.002, 0.05), fr("off", 0.1) + 0.1)
out = np.nan_to_num(out); peak = np.abs(out).max(); out *= 0.92 / max(peak, 1e-6)
pcm = (np.clip(out.T, -1, 1) * 32767).astype("<i2")
with wave.open("extra.wav", "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("extra.wav", DUR, "s, peak", round(peak, 2))
