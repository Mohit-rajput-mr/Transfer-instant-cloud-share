# Engine sound design, synced to the picture: reads crank.json (the film's crank angle at 240 Hz, dumped from story.js)
# and vo/lines.json, writes extra.wav (48 kHz stereo) that kit/synth.py mixes under the voice.
# Layers: room tone · a running-engine bed whose firing rate follows the crank (and revs to a real 3,000 rpm in the
# speed shot) · per-firing thumps · cylinder 1 close-up: intake whoosh, compression whine, spark crack, combustion boom,
# piston slam, exhaust hiss, valve clicks · laser cut buzz · flywheel whirr · heat sizzle · 1876 projector + chuff ·
# Orbi: part whooshes, signal-drop glitch, lock click.
import json, wave
import numpy as np

SR = 48000
G240 = np.array(json.load(open("crank.json")))
L = {l["key"]: l for l in json.load(open("vo/lines.json"))["lines"]}
DUR = json.load(open("vo/lines.json"))["duration"]
N = int(DUR * SR); t = np.arange(N) / SR
rng = np.random.default_rng(5)
at = lambda k: L[k]["at"]; end = lambda k: L[k]["at"] + L[k]["dur"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
G = np.interp(t, np.arange(len(G240)) / 240, G240)
out = np.zeros((2, N))
OFF = [0, 540, 180, 360]


def lp(x, hz):  # one-pole low-pass (vectorised via cumulative filter in blocks is overkill; use FFT)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X /= 1 + (f / hz) ** 4; return np.fft.irfft(X, len(x))


def bp(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= (1 / (1 + (lo / np.maximum(f, 1)) ** 4)) / (1 + (f / hi) ** 4); return np.fft.irfft(X, len(x))


def place(sig, at_s, g=1.0, pan=0.0):
    i0 = int(at_s * SR)
    if i0 >= N or i0 + len(sig) < 0: return
    j0 = max(0, i0); s = sig[j0 - i0:][: N - j0]
    out[0, j0:j0 + len(s)] += s * g * (1 - pan * 0.6); out[1, j0:j0 + len(s)] += s * g * (1 + pan * 0.6)


def env(n, a, d):
    tt = np.arange(n) / SR; return np.minimum(1, tt / max(a, 1e-4)) * np.exp(-tt / d)


def thump(f0=70, d=0.18, nz=0.25):
    n = int(0.6 * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(f0 * (0.6 + 0.8 * np.exp(-tt * 30))) / SR) * env(n, 0.002, d)
    return s + lp(rng.standard_normal(n), 900) * env(n, 0.001, d * 0.4) * nz


def click(f=3800, d=0.012, g=1.0):
    n = int(0.08 * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) * 0.6 + np.sin(2 * np.pi * f * 1.47 * tt) * 0.4) * np.exp(-tt / d) * g + bp(rng.standard_normal(n), 2000, 9000) * np.exp(-tt / 0.004) * 0.4


def boom():
    n = int(2.2 * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(38 + 110 * np.exp(-tt * 9)) / SR) * env(n, 0.004, 0.55) * 1.0
    s += lp(rng.standard_normal(n), 1400) * env(n, 0.002, 0.22) * 0.8
    s += bp(rng.standard_normal(n), 300, 3000) * env(n, 0.01, 0.6) * 0.18  # roar tail
    return s


def crack():
    n = int(0.25 * SR); tt = np.arange(n) / SR
    z = bp(rng.standard_normal(n), 2500, 14000) * np.exp(-tt / 0.018)
    buzz = np.sign(np.sin(2 * np.pi * 180 * tt)) * np.exp(-tt / 0.05) * 0.15
    return z + buzz


def clank():
    n = int(0.9 * SR); tt = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) * g for f, d, g in [(180, 0.25, 0.6), (530, 0.18, 0.4), (1240, 0.1, 0.25), (2950, 0.05, 0.15)])
    th = thump(55, 0.3, 0.4) * 0.8; s[: len(th)] += th; return s


def whoosh(length=0.8, lo=300, hi=3000):
    n = int(length * SR); tt = np.arange(n) / SR
    return bp(rng.standard_normal(n), lo, hi) * np.sin(np.pi * tt / length) ** 2


# ---------- room tone (engine section) ----------
room = lp(rng.standard_normal(N), 260) * 0.05 + bp(rng.standard_normal(N), 800, 4000) * 0.006
roomEnv = np.clip(t / 1.0, 0, 1) * np.clip((at("orbi") + 3.5 - t) / 1.0, 0, 1)
out += room * roomEnv

# ---------- running-engine bed: firing pulses at the visual rate (2 per crank turn), or the real revs in the speed shot ----------
rpm_vis = np.gradient(G, 1 / SR) / 6.0
a, b = fr("speed", 0.1), fr("speed", 0.35)
ramp = np.clip((t - a) / (b - a), 0, 1); ramp = ramp * ramp * (3 - 2 * ramp)
rpm_audio = rpm_vis.copy()
sp = (t >= a) & (t < at("otto"))
rev = 300 + 2700 * ramp
cool = np.clip((t - at("heat")) / (end("heat") - at("heat")), 0, 1)
rev = rev * (1 - cool) + 900 * cool
rpm_audio[sp] = np.maximum(rpm_vis[sp], rev[sp])
f_fire = np.clip(rpm_audio, 0, 4000) / 60 * 2
ph = np.cumsum(f_fire) / SR
frac = ph % 1
pulse = np.exp(-frac * 7) * (0.55 + 0.45 * lp(rng.standard_normal(N), 700))
bed = lp(pulse, 520) * 1.6 + np.sin(2 * np.pi * np.cumsum(f_fire / 2) / SR) * 0.25 * np.clip(f_fire / 40, 0, 1)
bedEnv = np.where(t < at("block"), 0.55, 0.16)
bedEnv = np.where((t >= at("intake")) & (t < at("turns")), 0.0, bedEnv)  # close-up: only cylinder 1's own sounds
bedEnv = np.where((t >= at("turns")) & (t < at("speed")), 0.22, bedEnv)
bedEnv = np.where(sp, 0.25 + 0.55 * ramp * (1 - cool * 0.5), bedEnv)
bedEnv = np.where(t >= at("otto"), 0.0, bedEnv)
bedEnv = np.where((t >= end("otto")) & (t < at("orbi") + 3.2), 0.3, bedEnv)
bedEnv = lp(bedEnv, 3)
out += bed * bedEnv * 0.55

# ---------- discrete events from the crank ----------
step = 1 / 240
gi = G240
def crossings(level, period=720, off=0):
    c = (gi - off) % period; idx = np.where((c[1:] < c[:-1]) if level == 0 else ((c[:-1] < level) & (c[1:] >= level)))[0]
    return (idx + 1) * step

close = lambda s: at("block") <= s < at("four")
for i, off in enumerate(OFF):
    for s in crossings(0, 720, off):
        if s >= at("otto"): continue
        rate = rpm_vis[min(N - 1, int(s * SR))]
        if rate > 300: continue  # merged into the bed
        if at("intake") <= s < at("turns"): continue  # handled by the close-up layer
        g = 0.55 if s < at("block") else 0.22 if close(s) else 0.3
        place(thump(62 + i * 4, 0.16), s, g, [-0.4, -0.15, 0.15, 0.4][i])
    if i == 0:
        for lvl in (540, 360):  # intake + exhaust valves seat: metallic tick
            for s in crossings(lvl):
                if close(s) and rpm_vis[min(N - 1, int(s * SR))] < 200: place(click(4200 if lvl == 540 else 3500, 0.014), s, 0.35 if at("intake") <= s < at("turns") else 0.15, -0.3 if lvl == 540 else 0.3)

# ---------- cylinder 1 close-up: the four strokes ----------
c1 = G % 720
win = (t >= at("intake") - 0.3) & (t < at("turns") + 1.0)
ki = np.clip((c1 - 360) / 180, 0, 1) * ((c1 >= 360) & (c1 < 540))
out += bp(rng.standard_normal(N), 250, 1800) * np.sin(np.pi * ki) ** 1.2 * win * 0.33 * np.array([[1.2], [0.8]])  # intake: air sucked in (left)
kc = np.clip((c1 - 540) / 180, 0, 1) * (c1 >= 540)
whine = np.sin(2 * np.pi * np.cumsum(110 + 180 * kc) / SR) * kc ** 1.5 * win * 0.09
out += whine
ke = np.clip((c1 - 180) / 180, 0, 1) * ((c1 >= 180) & (c1 < 360))
out += (bp(rng.standard_normal(N), 900, 5000) * 0.6 + lp(rng.standard_normal(N), 300)) * np.sin(np.pi * ke) ** 1.2 * win * 0.3 * np.array([[0.8], [1.2]])  # exhaust hiss (right)
place(crack(), fr("power", 0.2), 0.9)
place(boom(), fr("power", 0.36), 0.95)
place(clank(), fr("power", 0.76), 0.9)

# ---------- laser cuts ----------
def laser(a0, a1, g=0.35):
    n = int((a1 - a0) * SR); tt = np.arange(n) / SR; k = tt / max(tt[-1], 1e-3)
    s = np.sign(np.sin(2 * np.pi * 120 * tt)) * 0.25 + bp(rng.standard_normal(n), 2000 + 5000 * k[-1], 12000) * 0.6
    s *= np.sin(np.pi * k) ** 0.5
    place(s, a0, g); place(whoosh(0.5, 200, 2500), a1 - 0.1, g * 0.8)
laser(fr("hook", 0.74), end("hook") + 0.3)
laser(at("four"), fr("four", 0.12), 0.25)

# ---------- flywheel whirr, heat sizzle ----------
fa, fb = at("fly"), at("speed")
m = (t >= fa) & (t < fb)
whirr = bp(rng.standard_normal(N), 150, 1200) * (0.6 + 0.4 * np.sin(np.deg2rad(G) * 2)) * m * np.clip((t - fa) / 0.8, 0, 1) * np.clip((fb - t) / 0.8, 0, 1)
out += whirr * 0.18
ha, hb = fr("heat", 0.3), end("heat") + 0.4
hk = np.clip((t - ha) / 2, 0, 1) * np.clip((hb - t) / 1.0, 0, 1)
out += bp(rng.standard_normal(N), 3000, 10000) * hk * 0.05
for s in np.sort(rng.uniform(ha, hb, 70)): place(click(rng.uniform(1500, 5000), 0.006), s, rng.uniform(0.05, 0.16), rng.uniform(-0.8, 0.8))

# ---------- 1876: old projector flutter + a slow single-cylinder chuff ----------
oa, ob = at("otto"), end("otto") + 0.1
om = np.clip((t - oa) / 0.4, 0, 1) * np.clip((ob - t) / 0.4, 0, 1)
out += bp(rng.standard_normal(N), 1500, 6000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * t))) * om * 0.05
s = oa + 0.3
while s < ob - 0.3:
    place(thump(48, 0.35, 0.6), s, 0.4); place(whoosh(0.6, 400, 2500), s + 0.05, 0.1); s += 1.96

# ---------- Orbi: parts fly in waves of three, the signal drops, resumes, lock click ----------
sFly, sDrop2, sRes = fr("orbi2", 0.48), fr("orbi2", 0.7), fr("orbi2", 0.86)
for w in range(4):
    t0 = sFly + w * ((sDrop2 - sFly) / 2.2) + ((sRes - sDrop2) if w >= 2 else 0)
    for j in range(3): place(whoosh(0.7, 600, 6000), t0 + j * 0.06, 0.14, -0.4 + j * 0.4)
n = int(0.5 * SR); glitch = np.sign(bp(rng.standard_normal(n), 200, 3000)) * np.exp(-np.arange(n) / SR / 0.15) * 0.3
glitch *= (np.arange(n) // 900) % 2
place(glitch, sDrop2, 0.5)
place(click(2400, 0.03), fr("orbi3", 0.52), 0.5)
place(clank() * 0.3, fr("orbi", 0.0), 0.0)

out *= 0.92 / max(1e-6, float(np.abs(out).max()))
pcm = (np.clip(out.T, -1, 1) * 32767).astype(np.int16)
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("extra.wav", round(DUR, 1), "s peak", round(float(np.abs(out).max()), 2))
