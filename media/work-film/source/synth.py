# Score for the launch film, synthesized from scratch (no samples): a 100 BPM bed (pad, plucked arpeggio,
# sub, soft drums), UI sounds on every click / tap / beat from events.json, and the voiceover from vo/,
# with the music ducked under the voice. Writes score.wav (48 kHz stereo).
import json, wave
import numpy as np

SR = 48000
EV = json.load(open("events.json"))
DUR = EV["duration"]
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(11)
music = np.zeros((2, N))
sfx = np.zeros((2, N))
BPM = 118
BEAT = 60 / BPM


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(buf, sig, at, pan=0.0, g=1.0):
    i0 = int(at * SR)
    if i0 >= N:
        return
    j0 = max(0, i0)
    s = sig[j0 - i0 :][: N - j0]
    buf[0, j0 : j0 + len(s)] += s * g * (1 - pan) * 0.9
    buf[1, j0 : j0 + len(s)] += s * g * (1 + pan) * 0.9


def adsr(n, a, d, s_lvl, r):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    e = np.full(n, s_lvl)
    e[:a] = np.linspace(0, 1, max(1, a))[:a]
    e[a : a + d] = np.linspace(1, s_lvl, max(1, d))[: max(0, min(d, n - a))]
    if r:
        e[-r:] *= np.linspace(1, 0, r)[-len(e[-r:]) :]
    return e


def lowpass(x, k):
    k = max(1, int(k))
    return np.convolve(x, np.ones(k) / k, mode="same")


# ---------------- music ----------------
# Am9 · Fmaj7 · C(add9) · G6, one bar (4 beats) each
CH = [[45, 57, 60, 64, 67, 71], [41, 57, 60, 64, 65, 69], [48, 55, 60, 62, 64, 67], [43, 55, 59, 62, 64, 67]]
BAR = 4 * BEAT
nbars = int(DUR / BAR) + 1


DAN = EV["vo"]["dance"]
GRID = DAN - BEAT * np.ceil((DAN - 0.3) / BEAT)  # the beat lands exactly when the dance starts


def energy(x):
    # a calm office bed under the talk, then the dance: everything up
    return np.interp(x, [0, 0.4, DAN - 0.4, DAN, DUR - 0.8, DUR], [0.7, 0.8, 0.8, 1.35, 1.35, 0])


for b in range(nbars):
    t0 = b * BAR
    ch = CH[b % 4]
    n = int((BAR + 0.6) * SR)
    tt = np.arange(n) / SR
    env = adsr(n, 0.5, 0.6, 0.85, 0.7)
    for k, m in enumerate(ch[1:]):
        f = note(m)
        for det, pan in ((-0.004, -0.6), (0.004, 0.6)):
            ph = 2 * np.pi * f * (1 + det) * tt
            sig = np.sin(ph) + 0.35 * np.sin(2 * ph + 0.3) + 0.12 * np.sin(3 * ph + 0.7)
            place(music, sig * env * 0.010, t0, pan)
    # sub bass on the root, pulsing on beats 1 and 3
    for beat in (0, 2):
        at = t0 + beat * BEAT
        nn = int(BEAT * 1.9 * SR)
        tb = np.arange(nn) / SR
        e = np.exp(-tb * 2.2) * np.minimum(1, tb / 0.01)
        place(music, np.sin(2 * np.pi * note(ch[0] - 12) * tb) * e * 0.20 * (energy(at) > 0.7), at)

# plucked arpeggio, 8ths, during the product scenes
arp_idx = [1, 3, 2, 4, 3, 5, 4, 2]
for i, at in enumerate(np.arange(GRID, DUR - 0.8, BEAT / 2)):
    ch = CH[int(at / BAR) % 4]
    m = ch[arp_idx[i % 8]] + 12
    nn = int(0.45 * SR)
    tp = np.arange(nn) / SR
    e = np.exp(-tp * 9) * np.minimum(1, tp / 0.003)
    sig = (np.sin(2 * np.pi * note(m) * tp) + 0.4 * np.sin(4 * np.pi * note(m) * tp)) * e
    place(music, sig * 0.05, at, 0.35 if i % 2 else -0.35, energy(at))

# soft drums: kick on every beat, hat on the off-beats, a clap on 2 and 4
for i, at in enumerate(np.arange(GRID, DUR - 0.6, BEAT)):
    nk = int(0.35 * SR)
    tk = np.arange(nk) / SR
    f = 48 + 110 * np.exp(-tk * 38)
    kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tk * 9)
    place(music, kick * 0.38, at, 0, energy(at))
    nh = int(0.05 * SR)
    hat = rng.standard_normal(nh)
    hat = (hat - lowpass(hat, 4)) * np.exp(-np.arange(nh) / SR * 70)
    place(music, hat * 0.08, at + BEAT / 2, 0.25, energy(at))
    if i % 2 == 1:
        nc = int(0.18 * SR)
        clap = lowpass(rng.standard_normal(nc), 2) * np.exp(-np.arange(nc) / SR * 26)
        place(music, clap * 0.07, at, -0.1, energy(at))

# the dance: a slap bass riff in 16ths, cowbell on the off-beats, a fat clap on 2 and 4
riff = [0, None, 0, 12, None, 0, 10, None, 0, None, 7, None, 10, 12, None, 7]
for i, at in enumerate(np.arange(DAN, DUR - 0.8, BEAT / 4)):
    m = riff[i % 16]
    if m is None:
        continue
    root = [45, 41, 48, 43][int((at - DAN) / BAR) % 4]
    nn = int(0.2 * SR); tb = np.arange(nn) / SR
    f = note(root - 12 + m)
    sig = (np.sign(np.sin(2 * np.pi * f * tb)) * 0.35 + np.sin(2 * np.pi * f * tb)) * np.exp(-tb * 14) * np.minimum(1, tb / 0.002)
    place(music, lowpass(sig, 6) * 0.22, at, 0)
for i, at in enumerate(np.arange(DAN, DUR - 0.8, BEAT)):
    nc = int(0.12 * SR); tc = np.arange(nc) / SR
    bell = (np.sign(np.sin(2 * np.pi * 540 * tc)) + np.sign(np.sin(2 * np.pi * 800 * tc))) * np.exp(-tc * 30)
    place(music, bell * 0.03, at + BEAT / 2, 0.4)
    if i % 2 == 1:
        nc = int(0.25 * SR)
        clap = lowpass(rng.standard_normal(nc), 2) * np.exp(-np.arange(nc) / SR * 18)
        place(music, clap * 0.16, at, 0)

# ---------------- sound effects ----------------
def click():
    n = int(0.03 * SR)
    tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2600 * tt) * np.exp(-tt * 300) + 0.5 * rng.standard_normal(n) * np.exp(-tt * 600)) * 0.6


def tap():
    n = int(0.08 * SR)
    tt = np.arange(n) / SR
    return np.sin(2 * np.pi * (520 + 300 * np.exp(-tt * 80)) * tt) * np.exp(-tt * 55) * 0.8


def whoosh(length=0.8, bright=6, up=True):
    n = int(length * SR)
    x = rng.standard_normal(n)
    x = lowpass(x, bright) - lowpass(x, 80)
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2
    if up:
        shape *= np.linspace(0.4, 1, n)
    return x * shape


def chime(notes, d=0.9, g=0.25):
    n = int((d + 0.2 * len(notes)) * SR)
    out = np.zeros(n)
    for k, m in enumerate(notes):
        i0 = int(k * 0.09 * SR)
        tt = np.arange(n - i0) / SR
        out[i0:] += (np.sin(2 * np.pi * note(m) * tt) + 0.3 * np.sin(2 * np.pi * note(m) * 2 * tt)) * np.exp(-tt * (3 / d))
    return out * g


def thud():
    n = int(0.4 * SR)
    tt = np.arange(n) / SR
    return np.sin(2 * np.pi * (70 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 12) * 0.7


def poof():
    w = whoosh(0.5, 3, up=False)
    return w[::-1] * 0.8


def hit():
    n = int(0.6 * SR)
    tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(46 + 90 * np.exp(-tt * 24)) / SR) * np.exp(-tt * 6)
    return s * 0.6 + lowpass(rng.standard_normal(n), 3) * np.exp(-tt * 60) * 0.15


for e in EV["events"]:
    at, k = e["t"], e["k"]
    if k == "click":
        place(sfx, click(), at - 0.01, 0.1, 0.55)
    elif k == "tap":
        place(sfx, tap(), at - 0.01, -0.1, 0.6)
    elif k == "launch":
        place(sfx, whoosh(0.7, 4), at - 0.2, 0, 0.35)
        place(sfx, chime([76, 83], 0.5, 0.22), at + 0.3, 0.2)
    elif k == "arrive":
        place(sfx, chime([79, 84, 88], 0.8, 0.2), at, -0.2)
    elif k == "done":
        place(sfx, chime([72, 76, 79, 84], 1.0, 0.2), at, 0)
    elif k == "lid":
        place(sfx, thud(), at + 0.75, 0, 0.8)
        place(sfx, whoosh(0.9, 8), at - 0.2, 0.2, 0.25)
    elif k == "burn":
        place(sfx, poof(), at - 0.1, 0, 0.6)
    elif k == "strike":
        place(sfx, whoosh(0.25, 2), at - 0.05, 0.3, 0.45)
    elif k == "logo":
        place(sfx, chime([76, 79, 83, 88], 1.6, 0.16), at, 0)
        place(sfx, hit(), at, 0, 0.7)
    elif k == "word":
        place(sfx, hit(), at, 0, 0.55)
    elif k == "move":
        if at > 0.5:
            place(sfx, whoosh(0.8, 10), at - 0.15, 0.3 if int(at) % 2 else -0.3, 0.16)
    elif k == "end":
        place(sfx, hit(), at, 0, 0.8)
        place(sfx, chime([69, 76, 81, 84, 88], 2.2, 0.18), at, 0)

# ---------------- voice ----------------
vo = np.zeros(N)
lines = json.load(open("vo/lines.json"))
for ln in lines["lines"]:
    w = wave.open(f"vo/{ln['key']}.wav")
    sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    # resample to 48 kHz
    xs = np.interp(np.arange(int(len(x) * SR / sr)) * sr / SR, np.arange(len(x)), x)
    at = EV["vo"][ln["key"]]
    i0 = int(at * SR)
    vo[i0 : i0 + len(xs)] += xs[: N - i0]
# a touch of room: two soft early reflections
room = vo.copy()
for d, g in ((0.017, 0.12), (0.031, 0.07)):
    k = int(d * SR)
    room[k:] += vo[:-k] * g
vo = room * 1.55

# duck the music while someone speaks
pres = lowpass(np.abs(vo) > 0.02, int(0.25 * SR)).astype(float)
pres = np.clip(lowpass(pres, int(0.15 * SR)) * 3, 0, 1)
duck = 1 - 0.62 * pres
music *= duck
sfx *= 1 - 0.25 * pres

mix = music * 0.9 + sfx
mix[0] += vo
mix[1] += vo
# fade in / out, soft clip, normalise to -1 dBFS
fade = np.clip(t / 0.05, 0, 1) * np.clip((DUR - t) / 0.8, 0, 1)
mix *= fade
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix *= 0.89 / np.max(np.abs(mix))
pcm = (np.clip(mix.T, -1, 1) * 32767).astype(np.int16)
with wave.open("score.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("score.wav", DUR, "s", "rms", round(float(np.sqrt((mix**2).mean())), 3))
