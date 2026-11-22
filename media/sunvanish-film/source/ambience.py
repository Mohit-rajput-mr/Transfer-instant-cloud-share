# Surroundings sound for "What if the Sun vanished?" (no voice, no music track): surf, wind, gulls and a crowd by day;
# a sub hit and silence when the sky goes out; cold wind, frost crackle and ice creaks; a muffled vent under the ice;
# snow hiss; deep space drones; a chime on the end card. Writes score.wav (48 kHz stereo), timed to vo/lines.json.
import json, wave
import numpy as np

SR = 48000
D = json.load(open("vo/lines.json")); DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(7)
out = np.zeros((2, N))
T0, MOON = 19.6, 20.9


def filt(x, lo=None, hi=None, order=2):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= np.sqrt(1 + (f / hi) ** (2 * order))
    if lo: X /= np.sqrt(1 + (lo / np.maximum(f, 0.1)) ** (2 * order))
    return np.fft.irfft(X, len(x))


def env(a, b, fi=0.5, fo=0.5):
    """1 between a and b with linear fades (seconds), over the whole timeline"""
    return np.clip((T - a) / max(fi, 1e-3), 0, 1) * np.clip((b - T) / max(fo, 1e-3), 0, 1)


def place(sig, t0, g=1.0, pan=0.0):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if i >= N or j <= 0: return
    s = sig[: j - i]; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    out[0, i:j] += s * g * l * 1.4; out[1, i:j] += s * g * r * 1.4


def add(sig, g=1.0, width=0.0):
    out[0] += sig * g; out[1] += (np.roll(sig, int(width * SR)) if width else sig) * g


noise = lambda: rng.standard_normal(N)
day = env(0, T0, 0.8, 0.02)
night = 1 - day

# --- surf: two decorrelated layers of filtered noise with slow swells; calmer at night, gone once the sea freezes ---
sea_k = np.clip(1 - (T - 51.8) / 4.4, 0, 1) * (T < 57.6) + 0.0
sea_k = np.where(T < 57.6, sea_k, 0)
for ch, ph in ((0, 0.0), (1, 1.7)):
    n = filt(noise(), 120, 1600)
    swell = 0.55 + 0.45 * np.sin(T * 2 * np.pi / 7.5 + ph) ** 2 * (0.6 + 0.4 * np.sin(T * 0.31 + ph))
    wash = filt(noise(), 1800, 7000) * (0.5 + 0.5 * np.sin(T * 2 * np.pi / 7.5 + ph + 0.8)) ** 4
    out[ch] += (n * swell * 0.11 + wash * 0.03) * sea_k * (0.65 + 0.35 * day) * ((T < 35.3) | ((T >= 45.8) & (T < 57.6)))

# --- wind: soft by day, colder (brighter, gustier) as it freezes, a thin hiss in the far future ---
gust = 0.6 + 0.4 * np.sin(T * 0.45) * np.sin(T * 0.17 + 1)
w_lo = filt(noise(), 80, 500); w_hi = filt(noise(), 900, 4500)
shore = (T < 35.3) | ((T >= 45.8) & (T < 57.6)) | ((T >= 69.6) & (T < 76.6))
cold = np.clip((T - 45.8) / 6, 0, 1) * (T >= 45.8)
add(w_lo * gust * (0.05 + 0.04 * night + 0.05 * cold) * shore, 1, 0.011)
add(w_hi * gust * (0.006 + 0.02 * cold + 0.01 * ((T >= 69.6) & (T < 76.6))) * shore, 1, 0.017)

# --- gulls by day: a falling, rough cry ---
def gull(dur=0.55, f0=1700):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + 0.35 * np.exp(-t * 9)) * (1 - 0.25 * t / dur)
    ph = np.cumsum(2 * np.pi * f / SR)
    s = np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.15 * np.sin(3.01 * ph)
    s *= (1 + 0.5 * np.sin(2 * np.pi * 38 * t)) * np.sin(np.pi * t / dur) ** 0.6
    return s * np.exp(-t * 1.5)
for t0, f0, pan in [(1.3, 1750, -0.5), (1.9, 1600, -0.45), (6.2, 1900, 0.6), (10.4, 1650, 0.2), (11.0, 1700, 0.25), (15.8, 1800, -0.7)]:
    place(gull(f0=f0), t0, 0.035, pan)

# --- people: a murmur by day, one shared gasp at the blackout, then silence ---
mur = filt(noise(), 250, 1400) * (0.6 + 0.4 * np.abs(np.sin(T * 3.1)) * np.abs(np.sin(T * 1.7 + 2)))
add(mur * 0.025 * env(0, T0, 1.0, 0.05), 1, 0.009)
gasp = filt(rng.standard_normal(int(1.4 * SR)), 400, 2600) * np.sin(np.pi * np.clip(np.arange(int(1.4 * SR)) / SR / 1.4, 0, 1)) ** 2
place(gasp, T0 + 0.25, 0.09, 0.0)

# --- the clock: soft ticks that speed up through the eight minutes ---
tick = np.sin(2 * np.pi * 2600 * np.arange(int(0.03 * SR)) / SR) * np.exp(-np.arange(int(0.03 * SR)) / SR * 220)
tt = 4.2
while tt < T0 - 0.15:
    place(tick, tt, 0.05 + 0.04 * (tt - 4) / 15.6, 0.15)
    tt += 0.5 - 0.32 * (tt - 4) / 15.6

# --- tension under the day: a low pad that rises toward the blackout ---
def pad(f, k):
    return (np.sin(2 * np.pi * f * T) + 0.5 * np.sin(2 * np.pi * f * 1.5 * T + 0.3) + 0.3 * np.sin(2 * np.pi * (f * 2.003) * T)) * k
add(pad(55, 0.045 * np.clip((T - 8) / 11.6, 0, 1) * (T < T0)), 1)

# --- the blackout: a deep sub hit; the Moon going dark: a softer low note ---
def hit(f=38, dur=3.5, k=1.0):
    t = np.arange(int(dur * SR)) / SR
    return (np.sin(2 * np.pi * f * t * (1 + 0.6 * np.exp(-t * 6))) * np.exp(-t * 1.3) + filt(rng.standard_normal(len(t)), 30, 300) * np.exp(-t * 4) * 0.5) * k
place(hit(36, 4.0), T0, 0.55)
place(hit(62, 2.4) * 0.5, MOON, 0.3)

# --- night / space drones: detuned low fifths with a slow shimmer; a high glint for Jupiter ---
drone = (np.sin(2 * np.pi * 41.2 * T) + np.sin(2 * np.pi * 41.5 * T + 1) + 0.6 * np.sin(2 * np.pi * 61.7 * T) + 0.25 * np.sin(2 * np.pi * 123.7 * T + 2))
shim = filt(noise(), 3000, 9000) * (0.5 + 0.5 * np.sin(T * 0.9))
add(drone * 0.035 * env(T0 + 0.5, 45.8, 3, 1.2), 1, 0.006)
add(drone * 0.05 * env(35.3, 45.8, 0.4, 1.0), 1, 0.004)
add(shim * 0.004 * env(35.3, 45.8, 1, 1) + shim * 0.003 * env(76.6, 87.4, 2, 1), 1, 0.013)
glint = np.sin(2 * np.pi * 1760 * T) * 0.5 + np.sin(2 * np.pi * 2637 * T) * 0.3
add(glint * 0.012 * env(29.3, 34.8, 1.5, 1.5) * (0.6 + 0.4 * np.sin(T * 6)), 1, 0.003)
# Earth leaving the curve: a long rising whoosh
wh = filt(noise(), 200, 3000) * env(41.6, 45.0, 1.0, 2.0) * np.clip((T - 41.6) / 1.4, 0, 1)
add(wh * 0.06, 1, 0.02)

# --- the freeze: frost crackle, then ice creaks and groans ---
for i in range(240):
    t0 = 46.0 + rng.random() * 5.6; n = int(0.006 * SR)
    place(filt(rng.standard_normal(n * 3), 2500, 12000)[:n] * np.exp(-np.arange(n) / n * 4), t0, 0.06 * rng.random(), rng.uniform(-0.8, 0.8))
def creak(dur, f0):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + 0.5 * np.sin(np.pi * t / dur))
    s = np.sign(np.sin(np.cumsum(2 * np.pi * f / SR))) * 0.5
    s = filt(s * (1 + 0.6 * rng.standard_normal(len(t))), 60, 900)
    return s * np.sin(np.pi * t / dur) ** 1.5
for t0, d, f0, pan in [(52.2, 1.1, 70, -0.4), (53.6, 0.8, 95, 0.5), (54.9, 1.5, 55, 0.0), (56.0, 0.9, 120, -0.6), (56.8, 0.6, 80, 0.4)]:
    place(creak(d, f0), t0, 0.16, pan)
place(hit(48, 2.0) * 0.6, 55.0, 0.25)

# --- under the ice: a muffled world, the vent's roar and bubbles ---
deep = (T >= 57.6) & (T < 69.6)
rum = filt(noise(), 20, 160)
add(rum * 0.22 * env(57.6, 69.6, 0.3, 0.4), 1, 0.008)
vent = filt(noise(), 150, 900) * (0.6 + 0.4 * np.sin(T * 7) ** 2)
add(vent * 0.05 * env(60.0, 69.6, 3, 0.4) * (0.6 + 0.6 * np.clip((T - 63) / 5, 0, 1)), 1, 0.01)
for i in range(70):
    t0 = 60 + rng.random() * 9.4; d = 0.05 + rng.random() * 0.08; t = np.arange(int(d * SR)) / SR
    f = 300 + rng.random() * 500; place(np.sin(2 * np.pi * f * t * (1 + t * 8)) * np.sin(np.pi * t / d), t0, 0.04, rng.uniform(-0.5, 0.5))
add(np.sin(2 * np.pi * 32.7 * T) * 0.05 * env(57.6, 69.6, 1.0, 0.4), 1)

# --- the far future: snow hiss and a very cold, thin drone ---
add(filt(noise(), 4000, 12000) * 0.012 * env(69.6, 76.6, 1.2, 0.4), 1, 0.02)
add((np.sin(2 * np.pi * 220 * T) + np.sin(2 * np.pi * 220.7 * T) + 0.5 * np.sin(2 * np.pi * 329.6 * T)) * 0.012 * env(69.8, 76.6, 2, 0.6), 1, 0.005)

# --- the end: Earth drifting (a warm, resolving pad), then a chime on the card ---
fin = pad(49, 1.0) + 0.6 * np.sin(2 * np.pi * 98 * T) + 0.4 * np.sin(2 * np.pi * 146.8 * T + 1)
add(fin * 0.03 * env(76.8, 89.5, 3.0, 2.0), 1, 0.006)
place(hit(30, 3.0) * 0.6, 83.0, 0.25)
def chime(f, dur=3.0):
    t = np.arange(int(dur * SR)) / SR
    return sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.2 + k)) / k for k in (1, 2.01, 3.02))
place(chime(880), 87.3, 0.07, -0.1); place(chime(1318.5), 87.45, 0.05, 0.1)

# --- master: gentle fade in/out, soft limiting, normalise ---
mix = out * np.clip(T / 0.5, 0, 1) * np.clip((DUR - T) / 1.2, 0, 1)
mix = np.tanh(mix * 1.6) / 1.6
mix *= 0.89 / max(1e-6, np.abs(mix).max())
with wave.open("score.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("score.wav", DUR, "s", "rms", round(float(np.sqrt((mix ** 2).mean())), 3))
