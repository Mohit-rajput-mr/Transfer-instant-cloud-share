# Lightning film sound design, synced to story.js timings (vo/lines.json): writes extra.wav (48 kHz stereo), mixed by
# kit/synth.py under the music + voice. Layers: rain + wind bed · distant rumbles · hail clatter inside the cloud ·
# stepped-leader crackles · streamer buzz + static · the strike (crack, boom, long rumble) · flashover sizzle, steam
# hiss, shoes popping off · heart monitor beeps → flatline → beeps again · CPR compressions · thunder shockwave ·
# ground strike + spreading fizz · car strike + metal ring · Roy's seven cracks (+ projector) · Orbi zaps, chime, lock, burn.
import json, wave
import numpy as np

SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(9)
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


def env(n, a, d): tt = np.arange(n) / SR; return np.minimum(1, tt / max(a, 1e-4)) * np.exp(-tt / d)
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)


def crack(g=1.0, bright=1.0):  # the tearing snap of a channel: dense broadband crackle, a few ms bursts
    n = int(0.5 * SR); tt = np.arange(n) / SR
    s = rng.standard_normal(n) * (np.exp(-tt / 0.06) + 0.6 * (rng.random(n) < 0.02) * np.exp(-tt / 0.2))
    return filt(s, 400 * bright, 14000) * g


def rumble(length=6.0, g=1.0, low=40, high=420):
    n = int(length * SR); tt = np.arange(n) / SR
    am = 0.55 + 0.45 * np.abs(filt(rng.standard_normal(n), None, 3, 2)) * 6
    return filt(rng.standard_normal(n), low, high) * am * np.minimum(1, tt / 0.15) * np.exp(-tt / (length * 0.35)) * g


def boom(g=1.0):
    n = int(3.0 * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(32 + 90 * np.exp(-tt * 7)) / SR) * env(n, 0.003, 0.7)
    return (s + filt(rng.standard_normal(n), 30, 900) * env(n, 0.002, 0.5) * 1.2) * g


def tick(f=3000, d=0.01):
    n = int(0.05 * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt / d)


def beep(f=1000, d=0.12):
    n = int(d * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * np.minimum(1, tt / 0.004) * np.minimum(1, (d - tt) / 0.01)


def whoosh(length=0.7, lo=300, hi=5000):
    n = int(length * SR); tt = np.arange(n) / SR; e = np.sin(np.pi * np.clip(tt / length, 0, 1)) ** 2
    return filt(rng.standard_normal(n), lo, hi) * e


# ---- beds: rain (hiss + droplets), wind; inside the cloud: wind + hail; Orbi: quiet room
rain = filt(rng.standard_normal(N), 900, 9000) * 0.05
drops = filt((rng.random(N) < 0.0015) * rng.standard_normal(N), 1500, 8000) * 0.5
wind = filt(rng.standard_normal(N), 60, 500) * (0.6 + 0.4 * np.sin(T * 0.37) * np.sin(T * 0.11 + 1)) * 0.06
outside = seg(-1, at("storm") + 0.2, 0.3, 0.5) + seg(at("leader") - 0.3, at("orbi") + 0.5, 0.5, 1.2)
inside = seg(at("storm"), at("leader"), 0.4, 0.4)
bed = (rain + drops) * outside * (1 - 0.7 * seg(at("marks"), at("thunder"), 0.6, 0.6)) + wind * (outside + inside * 2.2)
hail = filt((rng.random(N) < 0.004) * rng.standard_normal(N), 2500, 12000) * 0.5 * inside
out += np.stack([bed + hail, np.roll(bed, 211) + np.roll(hail, 97)])
place(filt(rng.standard_normal(int(DUR * SR)), 40, 300) * 0.015, 0)  # room tone under everything

# ---- hook: three distant strikes (crack faint, rumble arrives later)
for a, pan in [(0.16, -0.6), (0.47, 0.6), (0.8, -0.5)]:
    t0 = fr("hook", a); place(crack(0.12, 0.6), t0, pan=pan); place(rumble(6, 0.5), t0 + 1.2, pan=pan)
# storm: in-cloud flashes = deep rumbles; charge crackle
for a in (0.55, 0.9): place(rumble(4, 0.6, 30, 250), fr("storm", a)); place(crack(0.08, 0.5), fr("storm", a))
for i in range(40): place(tick(5000 + 2000 * rng.random(), 0.004) * 0.05, fr("storm", 0.2) + i * 0.23 + rng.random() * 0.1, pan=rng.random() * 2 - 1)
# leader: a crackle at every jump (16), getting closer
steps = 16
for i in range(steps):
    k = i / steps; t0 = fr("leader", 0.05) + (fr("leader", 0.92) - fr("leader", 0.05)) * k
    place(crack(0.08 + 0.25 * k, 1.2), t0)
# streamers: rising buzz + static fizz in the hair
for a0, g in [(0.08, 0.6), (0.18, 0.5), (0.3, 0.9)]:
    t0 = fr("streamer", a0); n = int((end("streamer") - t0 + 0.6) * SR); tt = np.arange(n) / SR
    buzz = (np.sign(np.sin(2 * np.pi * 120 * tt)) * 0.3 + filt(rng.standard_normal(n), 2000, 9000)) * np.minimum(1, tt / 1.5) * 0.06 * g
    place(buzz, t0)
place(filt((rng.random(int(4 * SR)) < 0.01) * rng.standard_normal(int(4 * SR)), 3000, 12000) * 0.25, fr("streamer", 0.55))
# THE STRIKE: blinding crack, boom, a long rolling rumble; silence ducks around it
t0 = fr("strike", 0.08)
place(crack(1.3, 0.8), t0); place(crack(0.8, 1.0), t0 + 0.06); place(boom(1.1), t0 + 0.02); place(rumble(9, 1.0), t0 + 0.15)
out *= 1 - 0.85 * np.exp(-np.maximum(0, t0 - T) / 0.12) * (T < t0)   # a held breath right before the hit
# flashover: sizzle while the current races; steam hiss; shoes pop off and land
n = int((end("flash") - at("flash")) * SR); tt = np.arange(n) / SR
place(filt(rng.standard_normal(n), 3000, 12000) * (0.08 + 0.05 * np.sin(tt * 30)) * np.minimum(1, tt / 0.3), at("flash"))
place(filt(rng.standard_normal(int(4 * SR)), 1500, 9000) * env(int(4 * SR), 0.15, 1.5) * 0.25, fr("flash", 0.5))
for dt, pan in [(0.0, -0.4), (0.03, 0.4)]: place(boom(0.25)[: int(0.4 * SR)] + crack(0.3)[: int(0.4 * SR)], fr("flash", 0.72) + dt, pan=pan)
for dt, pan in [(0.48, -0.5), (0.55, 0.5)]: place(filt(rng.standard_normal(int(0.2 * SR)), 80, 900) * env(int(0.2 * SR), 0.002, 0.04) * 0.6, fr("flash", 0.72) + dt, pan=pan)
# heart monitor: 72 bpm beeps → flatline; inside current hum
for k in range(200):
    tb = k / 1.2 + 0.215 / 1.2
    if at("heart") < tb < fr("heart", 0.4): place(beep(1000, 0.1) * 0.12, tb)
    if fr("restart", 0.12) < tb < fr("restart", 0.5): place(beep(1000, 0.1) * 0.1, tb)
n = int((end("heart") - fr("heart", 0.42) + 0.5) * SR); place(np.sin(2 * np.pi * 1000 * np.arange(n) / SR) * 0.06 * np.minimum(1, np.arange(n) / SR / 0.05), fr("heart", 0.42))
n = int((end("heart") - at("heart")) * SR); place(filt(rng.standard_normal(n), 60, 200) * 0.12 * np.minimum(1, np.arange(n) / SR), at("heart"))
# CPR compressions (1.85 a second)
for k in range(40):
    tc = at("restart") + (k + 0.25) / 1.85
    if tc < at("marks") - 0.2: place(filt(rng.standard_normal(int(0.15 * SR)), 50, 400) * env(int(0.15 * SR), 0.004, 0.05) * 0.5, tc)
# marks: a soft tension pad (heartbeat felt, not heard)
n = int((end("marks") - at("marks")) * SR); tt = np.arange(n) / SR; place(np.sin(2 * np.pi * 55 * tt) * 0.05 * np.sin(np.pi * tt / tt[-1]), at("marks"))
# thunder: the shockwave
t0 = at("thunder") + 0.2; place(crack(0.9), t0); place(boom(1.3), t0 + 0.25); place(rumble(8, 1.1), t0 + 0.3)
# ground: strike + fizz spreading out + a buzz up the legs
t0 = fr("ground", 0.22); place(crack(1.0), t0); place(boom(0.7), t0); place(rumble(5, 0.6), t0 + 0.3)
place(filt(rng.standard_normal(int(2.5 * SR)), 2500, 11000) * env(int(2.5 * SR), 0.05, 0.9) * 0.35, t0 + 0.05)
n = int(3 * SR); tt = np.arange(n) / SR; place(np.sign(np.sin(2 * np.pi * 90 * tt)) * filt(rng.standard_normal(n), 300, 3000) * 0.05 * env(n, 0.2, 1.5), t0 + 0.4)
# car: strike + the metal shell rings + fizz to the road
t0 = fr("car", 0.25); place(crack(1.0), t0); place(boom(0.8), t0); place(rumble(5, 0.6), t0 + 0.3)
n = int(2.5 * SR); tt = np.arange(n) / SR
ring = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) for f, d in [(410, 0.9), (987, 0.6), (1530, 0.4), (2210, 0.3)]) * 0.12
place(ring, t0 + 0.02); place(filt(rng.standard_normal(n), 3000, 11000) * env(n, 0.05, 0.8) * 0.3, t0 + 0.1)
# Roy: seven cracks (archive projector flutter underneath)
per = (end("roy") - fr("roy", 0.1)) / 7
for i in range(7): place(crack(0.45), fr("roy", 0.1) + i * per, pan=(i % 3 - 1) * 0.5); place(rumble(2.2, 0.35), fr("roy", 0.1) + i * per + 0.2)
n = int((end("roy") - at("roy") + 0.3) * SR); tt = np.arange(n) / SR
place(filt(rng.standard_normal(n), 800, 5000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * tt))) * 0.03, at("roy"))
# Orbi: green arcs zap, the file arrives (chime), lock click, burn crackle
tSend, tArr = fr("orbi2", 0.12), fr("orbi2", 0.42)
place(whoosh(0.6, 400, 6000) * 0.25, tSend)
n = int((tArr - tSend) * SR); tt = np.arange(n) / SR
place((np.sign(np.sin(2 * np.pi * 150 * tt)) * 0.3 + filt(rng.standard_normal(n), 2000, 10000)) * 0.08 * np.minimum(1, tt / 0.1), tSend + 0.35)
for f, dt in [(880, 0), (1320, 0.09)]: place(np.sin(2 * np.pi * f * np.arange(int(0.6 * SR)) / SR) * env(int(0.6 * SR), 0.005, 0.25) * 0.15, tArr + dt)
place(tick(2400, 0.02) * 0.5 + tick(1200, 0.03) * 0.3, fr("orbi3", 0.55))
tB = fr("orbi3", 0.78) + 0.6; n = int(2.2 * SR); place(filt((rng.random(n) < 0.02) * rng.standard_normal(n), 1500, 9000) * env(n, 0.2, 0.9) * 0.5, tB)

out = np.nan_to_num(out); peak = np.abs(out).max(); out *= 0.92 / max(peak, 1e-6)
pcm = (np.clip(out.T, -1, 1) * 32767).astype("<i2")
with wave.open("extra.wav", "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("extra.wav", DUR, "s, peak", round(peak, 2))
