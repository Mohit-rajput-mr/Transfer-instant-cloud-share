# Minimal cinematic sound bed, synthesized from scratch (no samples): pad + pulse + whooshes + hits.
import numpy as np, wave
SR = 48000; DUR = 32.5; N = int(SR * DUR)
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(3)
def note(f): return 440.0 * 2 ** ((f - 69) / 12)
def env(start, a, d, total):
    e = np.zeros(N); i0 = int(start * SR); n = int(total * SR)
    seg = np.arange(n) / SR
    e_seg = np.minimum(1, seg / max(a, 1e-4)) * np.exp(-np.maximum(0, seg - a) / max(d, 1e-4))
    e[i0:i0 + n] = e_seg[: max(0, min(n, N - i0))]
    return e
def add(sig, pan=0.0, g=1.0):
    global L, R
    L += sig * g * (1 - pan) ; R += sig * g * (1 + pan)
def smooth(x, k):
    k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode="same")

# --- pad: Am F C G, 6 s per chord, soft partials, slow swell ---
chords = [[45, 48, 52, 57, 64], [41, 45, 48, 53, 60], [48, 52, 55, 60, 67], [43, 47, 50, 55, 62], [45, 48, 52, 57, 64], [41, 45, 48, 53, 60]]
for ci, ch in enumerate(chords):
    s0 = ci * 6.0 - 0.5
    a = np.clip((t - s0) / 1.6, 0, 1) * np.clip((s0 + 6.9 - t) / 1.4, 0, 1)
    for k, m in enumerate(ch):
        f = note(m)
        for det, pan in ((-0.0025, -0.5), (0.0025, 0.5)):
            ph = 2 * np.pi * f * (1 + det) * t
            sig = np.sin(ph) + 0.28 * np.sin(2 * ph) + 0.09 * np.sin(3 * ph)
            add(sig * a * (0.016 if k else 0.022), pan)
master_pad = np.clip(t / 2.5, 0, 1) * (1 - np.clip((t - 31.0) / 1.5, 0, 1))
L *= master_pad; R *= master_pad

# --- slow pulse (80 bpm) under the product scenes ---
for b in np.arange(6.45, 29.0, 0.75):
    e = env(b, 0.004, 0.22, 0.6)
    f = 52 + 30 * np.exp(-np.maximum(0, t - b) * 30)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * e
    add(sub, 0, 0.32)

# --- whoosh helper: filtered noise swell ---
def whoosh(at, length=0.9, g=0.18, bright=8):
    n = int(length * SR); i0 = int((at - length * 0.7) * SR)
    x = rng.standard_normal(n)
    x = smooth(x, bright) - smooth(x, 60)
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2
    seg = x * shape
    for ch, pan in ((0, -0.3), (1, 0.3)):
        buf = np.zeros(N); j = max(0, i0); buf[j:j + n] = seg[: N - j][: n - (j - i0)]
        add(buf, pan, g)
for at in (3.4, 6.5, 9.35, 14.5, 20.3, 25.9, 29.0):
    whoosh(at)

# --- hits on the kinetic words ---
def hit(at, g=0.55, f0=48):
    e = env(at, 0.002, 0.35, 1.2)
    f = f0 + 90 * np.exp(-np.maximum(0, t - at) * 22)
    add(np.sin(2 * np.pi * np.cumsum(f) / SR) * e, 0, g)
    c = env(at, 0.0005, 0.012, 0.05) * rng.standard_normal(N)
    add(smooth(c, 3), 0, 0.12)
for k in range(4):
    hit(3.45 + k * 0.75)
hit(29.05, 0.5, 40)

# --- small UI sounds: launch pop, taps ---
def pop(at, f=880, g=0.16, d=0.09):
    e = env(at, 0.001, d, 0.4)
    add(np.sin(2 * np.pi * f * t) * e, 0.1, g)
    add(np.sin(2 * np.pi * f * 1.5 * t) * e * 0.4, -0.1, g)
pop(11.3, 660, 0.2, 0.14)
pop(11.42, 990, 0.12, 0.12)
for at in (16.65, 18.35):
    pop(at, 1200, 0.1, 0.03)
# shimmer on the logo
for k, m in enumerate([76, 79, 83, 88]):
    e = env(0.4 + k * 0.12, 0.01, 0.9, 2.0)
    add(np.sin(2 * np.pi * note(m) * t) * e, (k - 1.5) * 0.3, 0.035)

# --- stereo width (tiny delay on right), soft clip, normalize ---
R = np.concatenate([np.zeros(int(0.011 * SR)), R[: -int(0.011 * SR)]])
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix *= 0.89 / np.max(np.abs(mix))
fade = np.clip((DUR - t) / 0.6, 0, 1)[:, None]
mix *= fade
w = wave.open("score.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((mix * 32767).astype(np.int16).tobytes()); w.close()
print("ok", mix.shape)
