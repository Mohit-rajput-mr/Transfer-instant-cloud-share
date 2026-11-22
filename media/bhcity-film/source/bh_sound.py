# Sound for the black-hole city film (no voice, no score): a living waterfront at night, then the end of the world.
# Everything is synthesised with numpy and timed to the picture (story_frame.js): crowd babble and footsteps, a street
# guitarist (Karplus-Strong), harbour water, gasps → screams, sirens, car alarms, quake rumble, collapses, glass, the power
# cut, wind as things float, the tearing roar, then near silence in space. Writes score.wav (48 kHz stereo).
import json, wave
import numpy as np

SR = 48000
DUR = json.load(open("vo/lines.json"))["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)


def bp(x, lo=None, hi=None, order=2):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= np.sqrt(1 + (f / hi) ** (2 * order))
    if lo: X /= np.sqrt(1 + (lo / np.maximum(f, 0.1)) ** (2 * order))
    return np.fft.irfft(X, len(x))


def env(a, b, fi=0.5, fo=0.5):
    return np.clip((T - a) / max(fi, 1e-3), 0, 1) * np.clip((b - T) / max(fo, 1e-3), 0, 1)


def put(sig, t0, g=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    j = min(N, i + len(sig)); s = sig[: j - i] * g
    L[i:j] += s * np.cos((pan + 1) * np.pi / 4) * 1.41; R[i:j] += s * np.sin((pan + 1) * np.pi / 4) * 1.41


def bed(sig, g, width=0.01):
    L[:] += sig * g; R[:] += np.roll(sig, int(width * SR)) * g


def formant(x, fs, bws, gains):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); Hh = np.zeros_like(f)
    for fc, bw, g in zip(fs, bws, gains): Hh += g / (1 + ((f - fc) / bw) ** 2)
    return np.fft.irfft(X * Hh, len(x))


calm = env(0, 36.5, 0.5, 3.0)       # ordinary evening
panic = env(37.0, 72, 1.5, 3.0)      # after the Moon goes
power = np.where(T < 51.8, 1.0, np.where(T < 53.6, (np.sin(T * 47) > 0.2) * 0.8 * (1 - (T - 51.8) / 1.8), 0.0))
alive = T < 77.4                     # the world exists until the whiteout

# ---------- crowd babble: 40 voices of syllables (voiced pulses + breath through moving formants) ----------
babble = np.zeros(N)
for v in range(40):
    f0 = rng.uniform(95, 230); syl = rng.uniform(3.5, 6.0); ph = rng.uniform(0, 100)
    am = (0.5 + 0.5 * np.sin(2 * np.pi * syl * T + ph + 2 * np.sin(T * 0.7 + ph))) ** 3
    talk = (np.sin(T * rng.uniform(0.15, 0.4) + ph) > -0.2).astype(float)          # pauses between sentences
    pitch = f0 * (1 + 0.12 * np.sin(T * 1.3 + ph))
    pulses = np.sign(np.sin(np.cumsum(2 * np.pi * pitch / SR))) * 0.3 + rng.standard_normal(N) * 0.2
    babble += pulses * am * talk
babble = formant(babble, [650, 1150, 2450], [260, 380, 600], [1.0, 0.6, 0.3])
babble = bp(babble, 150, 3200)
bed(babble / np.abs(babble).max() * (0.07 * calm + 0.11 * env(22, 37, 4, 1) * calm), 1, 0.013)
# a few closer voices laughing / calling in the calm part
for t0 in [2.2, 5.8, 9.1, 13.4, 17.9, 21.0, 25.6, 29.8]:
    d = rng.uniform(0.5, 0.9); t = np.arange(int(d * SR)) / SR; f0 = rng.uniform(180, 300)
    s = np.sign(np.sin(np.cumsum(2 * np.pi * f0 * (1 + 0.2 * np.sin(t * 9)) / SR))) * (0.5 + 0.5 * np.sin(2 * np.pi * 6 * t)) ** 2
    put(formant(s, [700, 1200, 2600], [200, 300, 500], [1, 0.6, 0.3]) * np.sin(np.pi * t / d), t0, 0.05, rng.uniform(-0.7, 0.7))

# ---------- footsteps: dozens of walkers, then everyone running ----------
def step(k=1.0):
    n = int(0.06 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 90 * t) * np.exp(-t * 60) * 0.6 + bp(rng.standard_normal(n), 1500, 6000) * np.exp(-t * 90) * 0.4) * k
for w in range(26):
    ph = rng.uniform(0, 1); pan = rng.uniform(-0.9, 0.9); g = rng.uniform(0.008, 0.02)
    t0 = ph
    while t0 < 75:
        running = t0 > 40 + rng.uniform(0, 3)
        if t0 > 60.5 + rng.uniform(0, 6): break          # feet leave the ground
        put(step(1.4 if running else 1.0), t0, g * (1.6 if running else 1.0), pan)
        t0 += (0.3 if running else 0.55) * rng.uniform(0.92, 1.08)

# ---------- harbour water: lapping, then surging over the quay ----------
lap = bp(rng.standard_normal(N), 120, 1400) * (0.55 + 0.45 * np.sin(T * 1.1) ** 2)
bed(lap * (0.035 + 0.06 * env(22, 46, 6, 1) + 0.12 * env(46, 72, 1, 3)), 1, 0.017)
roar = bp(rng.standard_normal(N), 40, 900)
bed(roar * 0.10 * env(46, 70, 3, 2) * (0.7 + 0.3 * np.sin(T * 1.3)), 1, 0.009)
for t0 in np.arange(27, 70, 1.3):     # waves slamming the quay wall
    n = int(1.2 * SR); t = np.arange(n) / SR
    put(bp(rng.standard_normal(n), 80, 3000) * np.exp(-t * 3) * (1 - np.exp(-t * 40)), t0 + rng.uniform(0, 0.6), 0.05 + 0.08 * (t0 > 46), rng.uniform(-0.6, 0.6))

# ---------- street guitarist (Karplus-Strong), until people stop and stare ----------
def pluck(f, dur=1.8):
    n = int(dur * SR); p = int(SR / f); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]; buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return out
CH = [[110, 164.8, 220, 261.6, 329.6], [87.3, 130.8, 174.6, 220, 261.6], [130.8, 164.8, 196, 261.6, 329.6], [98, 123.5, 146.8, 196, 246.9]]
cache = {}
t0, k = 0.4, 0
while t0 < 35.5:
    for j, f in enumerate(CH[k % 4]):
        if f not in cache: cache[f] = pluck(f)
        put(bp(cache[f], 80, 2600), t0 + j * 0.018, 0.035, 0.55)
    t0 += 1.15; k += 1

# ---------- city: distant traffic hum and the buzz of the lights, gone with the power ----------
traffic = bp(rng.standard_normal(N), 40, 400)
bed(traffic * 0.05 * power * alive, 1, 0.02)
bed(np.sin(2 * np.pi * 100 * T) * 0.004 * power, 1)
for t0, f in [(7.5, 330), (19.0, 392), (31.2, 349)]:    # far car horns
    n = int(0.5 * SR); t = np.arange(n) / SR
    put(bp(np.sign(np.sin(2 * np.pi * f * t)) * np.sin(np.pi * t / 0.5), 200, 1500), t0, 0.012, rng.uniform(-0.8, 0.8))

# ---------- the approach: a low pressure that you feel more than hear ----------
drone = np.sin(2 * np.pi * 36 * T) + 0.6 * np.sin(2 * np.pi * 36.4 * T + 1) + 0.4 * np.sin(2 * np.pi * 54.2 * T)
bed(drone * (0.02 * env(9, 38, 6, 0.5) + 0.06 * env(38, 77.4, 0.5, 0.1)), 1, 0.004)

# ---------- the Moon is torn away: gasps, a rising whine, the disk igniting ----------
for i in range(30):
    n = int(rng.uniform(0.5, 0.9) * SR); t = np.arange(n) / SR
    put(bp(rng.standard_normal(n), 500, 2800) * np.sin(np.pi * t / t[-1]) ** 2, 34.6 + rng.uniform(0, 1.4), 0.025, rng.uniform(-0.9, 0.9))
whine = np.sin(np.cumsum(2 * np.pi * (180 + 900 * np.clip((T - 34) / 4.4, 0, 1) ** 2) / SR))
bed(whine * 0.015 * env(34, 38.5, 1.5, 0.05), 1)
def boom(f=32, dur=4.0):
    t = np.arange(int(dur * SR)) / SR
    return np.sin(2 * np.pi * f * t * (1 + 0.8 * np.exp(-t * 5))) * np.exp(-t * 1.1) + bp(rng.standard_normal(len(t)), 20, 400) * np.exp(-t * 2.5) * 0.7
put(boom(30, 5), 38.4, 0.5)

# ---------- screams: many voices, near and far, from the moment people understand ----------
def scream(dur, f0):
    t = np.arange(int(dur * SR)) / SR
    glide = f0 * (1 + 0.35 * np.sin(np.pi * t / dur)) * (1 + 0.025 * np.sin(2 * np.pi * 6.5 * t))
    src = np.sign(np.sin(np.cumsum(2 * np.pi * glide / SR))) * 0.6 + rng.standard_normal(len(t)) * 0.35
    s = formant(src, [900, 1350, 2800], [220, 300, 500], [1.0, 0.8, 0.35])
    return s * np.sin(np.pi * t / dur) ** 0.7 / (np.abs(s).max() + 1e-6)
for i in range(150):
    t0 = rng.uniform(37.5, 72); far = rng.uniform(0, 1)
    s = scream(rng.uniform(0.5, 1.6), rng.uniform(380, 980))
    s = bp(s, 300, 5000 - 3600 * far)
    put(s, t0, (0.05 - 0.035 * far) * (1.0 if t0 < 62 else 0.6), rng.uniform(-1, 1))
crowdscream = formant(rng.standard_normal(N), [850, 1300, 2700], [300, 400, 700], [1, 0.7, 0.3])
bed(crowdscream / np.abs(crowdscream).max() * 0.05 * env(38.6, 70, 2.5, 4) * (0.7 + 0.3 * np.sin(T * 0.8)), 1, 0.011)

# ---------- sirens and car alarms ----------
for s0, pan, f0 in [(44.0, -0.6, 720), (48.5, 0.5, 650)]:
    f = f0 + 480 * (0.5 + 0.5 * np.sin(2 * np.pi * T / 3.6 + s0))
    sir = np.sin(np.cumsum(2 * np.pi * f / SR)) + 0.3 * np.sin(np.cumsum(2 * np.pi * 2 * f / SR))
    sir = bp(sir, 300, 3000) * env(s0, 70, 3, 2)
    L[:] += sir * 0.02 * np.cos((pan + 1) * np.pi / 4) * 1.4; R[:] += sir * 0.02 * np.sin((pan + 1) * np.pi / 4) * 1.4
for a0, pan in [(49.5, 0.7), (51.0, -0.3), (53.2, 0.2)]:
    sel = (np.floor((T - a0) * 4) % 2 == 0)
    car = np.sign(np.sin(2 * np.pi * np.where(sel, 1250, 940) * T)) * env(a0, 68, 0.05, 1)
    car = bp(car, 400, 3500)
    L[:] += car * 0.008 * np.cos((pan + 1) * np.pi / 4); R[:] += car * 0.008 * np.sin((pan + 1) * np.pi / 4)

# ---------- quakes: rumble, cracks, glass, towers coming down ----------
rum = bp(rng.standard_normal(N), 15, 90)
qa = np.clip((T - 46) / 3, 0, 1) * (T < 77.4) * (0.6 + 0.4 * np.abs(np.sin(T * 1.7)))
bed(rum * 0.5 * qa, 1, 0.003)
def crack():
    n = int(0.25 * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 200, 9000) * np.exp(-t * 25) + np.sin(2 * np.pi * 60 * t) * np.exp(-t * 18) * 0.6
for t0 in rng.uniform(47, 76, 46): put(crack(), t0, rng.uniform(0.04, 0.12), rng.uniform(-0.9, 0.9))
def glass():
    n = int(1.4 * SR); t = np.arange(n) / SR
    s = bp(rng.standard_normal(n), 3000, 12000) * np.exp(-t * 6)
    for k in range(14): s += np.sin(2 * np.pi * rng.uniform(2500, 7500) * t) * np.exp(-t * rng.uniform(4, 12)) * rng.uniform(0.05, 0.2) * (t > rng.uniform(0, 0.4))
    return s
for t0 in [48.2, 50.1, 52.7, 55.3, 57.0, 59.4]: put(glass(), t0, 0.05, rng.uniform(-0.8, 0.8))
def collapse():
    n = int(5 * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 20, 700) * np.clip(t / 0.3, 0, 1) * np.exp(-t * 0.7) + np.sin(2 * np.pi * 28 * t) * np.exp(-t * 0.8) * 0.5
for t0 in [49.6, 51.2, 52.9, 54.4, 55.8, 57.1]: put(collapse(), t0, 0.16, rng.uniform(-0.7, 0.7))
# the power dies: a fat electrical arc and a clunk
n = int(0.9 * SR); t = np.arange(n) / SR
put(bp(np.sign(np.sin(2 * np.pi * 100 * t)) * rng.standard_normal(n), 100, 6000) * np.exp(-t * 4) * 0.5, 51.8, 0.08)
put(boom(55, 1.0), 53.6, 0.12)

# ---------- weightless: wind howl as everything lifts; spray hiss ----------
howl = bp(rng.standard_normal(N), 250, 1600)
howl = howl * (0.6 + 0.4 * np.sin(T * 0.9) * np.sin(T * 0.33))
bed(howl * 0.05 * env(59, 77.4, 3, 0.05) * (1 + np.clip((T - 64) / 8, 0, 1)), 1, 0.02)
bed(bp(rng.standard_normal(N), 4000, 12000) * 0.012 * env(58, 77.4, 2, 0.05), 1, 0.015)
whoosh = bp(rng.standard_normal(N), 200, 2500)
for t0 in rng.uniform(60, 72, 14):
    n = int(1.5 * SR); tt = np.arange(n) / SR
    put(bp(rng.standard_normal(n), 300, 2500) * np.sin(np.pi * tt / 1.5) ** 2, t0, 0.05, rng.uniform(-0.9, 0.9))

# ---------- Earth tears apart: the roar, lava hiss, and the white ----------
tear = bp(rng.standard_normal(N), 15, 300)
bed(tear * env(69.5, 77.4, 2.5, 0.05) * (0.3 + 0.7 * np.clip((T - 70) / 7, 0, 1)) * 0.9, 1, 0.005)
bed(bp(rng.standard_normal(N), 1500, 8000) * 0.03 * env(70, 77.4, 1.5, 0.05), 1, 0.01)
put(boom(24, 6), 70.0, 0.6)
# whiteout: everything cut at once; a single high ringing left in the ears
ring = np.sin(2 * np.pi * 3520 * T) * np.exp(-np.clip(T - 77.4, 0, None) * 0.6) * (T > 77.4)
bed(ring * 0.01, 1)

# ---------- toward the horizon: a falling tone (light stretched redder and slower), then silence ----------
fall = np.sin(np.cumsum(2 * np.pi * (220 * np.exp(-np.clip(T - 79, 0, None) * 0.35)) / SR))
bed(fall * 0.03 * env(79, 87.2, 2, 1.5), 1, 0.004)
bed(np.sin(2 * np.pi * 27.5 * T) * 0.06 * env(79, 88, 3, 2), 1)
def chime(f, dur=3.0):
    t = np.arange(int(dur * SR)) / SR
    return sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.2 + k)) / k for k in (1, 2.01, 3.02))
put(chime(880), 89.2, 0.05, -0.1); put(chime(1318.5), 89.35, 0.035, 0.1)

# ---------- master: a short room/air reverb, the end of the world gets loud, soft limiter ----------
def reverb(x, sec=1.3, mix=0.22):
    n = int(sec * SR); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 4.5); ir = bp(ir, 200, 6000); ir /= np.sqrt((ir ** 2).sum())
    M = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, M) * np.fft.rfft(ir, M), M)[: len(x)]
    return x * (1 - mix) + y * mix
L = reverb(L); R = reverb(R)
mix = np.vstack([L, R]) * np.clip(T / 0.4, 0, 1) * np.clip((DUR - T) / 1.0, 0, 1)
mix = np.tanh(mix * 2.2) / 2.2
mix *= 0.9 / np.abs(mix).max()
with wave.open("score.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("score.wav", round(DUR, 1), "s, rms", round(float(np.sqrt((mix ** 2).mean())), 3))
