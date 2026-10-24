# Sound for the merge film: a bright bed, a pop on every merge (deeper for bigger kinds), the voice naming each new
# kind as it first appears, pitched lower and lower, then a boom and the end line. Writes score.wav (48 kHz stereo).
import json, numpy as np, soundfile as sf, librosa
SR = 48000
S = json.load(open("sim.json")); DUR = len(S["frames"]) / S["fps"]; N = int(DUR * SR); t = np.arange(N) / SR
mus = np.zeros(N); sfx = np.zeros(N); vox = np.zeros(N); rng = np.random.default_rng(5)
def put(buf, x, at, g=1.0):
    i = int(at * SR); x = x[: max(0, N - i)]; buf[i:i + len(x)] += x * g
env = lambda n, a, d: np.minimum(1, np.arange(n) / max(1, a * SR)) * np.exp(-np.arange(n) / (d * SR))
# bed: 124 BPM, pluck arpeggio + kick + hat + bass, key rises a step every new big kind
BEAT = 60 / 124; prog = [57, 53, 60, 55]
firsts = {}
for e in S["events"]:
    firsts.setdefault(e["tier"], e["t"])
fin = S["final"]
for b in range(int(DUR / BEAT)):
    at = b * BEAT
    if fin and at > fin + 3.8: break
    lift = sum(1 for k, v in firsts.items() if v <= at and k >= 4)
    root = prog[(b // 8) % 4] + lift
    for j, iv in enumerate([0, 7, 12, 16]):
        f = 440 * 2 ** ((root + iv + 12 - 69) / 12); n = int(0.22 * SR); tt = np.arange(n) / SR
        put(mus, np.sign(np.sin(2 * np.pi * f * tt)) * 0.3 * env(n, 0.003, 0.07) + np.sin(2 * np.pi * f * tt) * env(n, 0.003, 0.12), at + j * BEAT / 4, 0.09)
    n = int(0.3 * SR); tt = np.arange(n) / SR
    put(mus, np.sin(2 * np.pi * (50 + 90 * np.exp(-tt * 30)) * tt) * env(n, 0.001, 0.12), at, 0.5)  # kick
    put(mus, rng.normal(0, 1, int(0.05 * SR)) * env(int(0.05 * SR), 0.001, 0.012), at + BEAT / 2, 0.08)  # hat
    f = 440 * 2 ** ((root - 24 - 69) / 12); n = int(BEAT * SR); tt = np.arange(n) / SR
    put(mus, np.sin(2 * np.pi * f * tt) * env(n, 0.01, 0.25), at, 0.25)
# pops: higher and short for small kinds, low booms for big ones
for e in S["events"]:
    k = e["tier"]; f0 = 1100 * 2 ** (-k * 0.42); n = int((0.12 + k * 0.05) * SR); tt = np.arange(n) / SR
    sweep = np.sin(2 * np.pi * np.cumsum(f0 * (1.6 - 0.6 * tt / tt[-1])) / SR) * env(n, 0.002, 0.05 + k * 0.03)
    put(sfx, sweep, e["t"], 0.35 + k * 0.05)
    if k >= 4:
        m = int((0.5 + k * 0.1) * SR); tt = np.arange(m) / SR
        put(sfx, np.sin(2 * np.pi * (35 + 60 * np.exp(-tt * 8)) * tt) * env(m, 0.002, 0.25 + k * 0.05), e["t"], 0.3 + k * 0.06)
# voice: the hook, then each new kind's name, deeper each time
def load(key, semis=0.0):
    y, sr = librosa.load(f"vo/{key}.wav", sr=SR)
    return librosa.effects.pitch_shift(y, sr=SR, n_steps=semis) if semis else y
free = 0.0
h = load("hook"); put(vox, h, 0.35); free = 0.35 + len(h) / SR + 0.1
for k in range(1, 9):
    if k not in firsts: continue
    at = max(firsts[k], free)
    if at - firsts[k] > 1.2: continue  # too late after the moment: skip that word
    w = load(f"t{k}", -k * 0.9); w *= 1.0 + k * 0.04; put(vox, w, at); free = at + len(w) / SR + 0.1
if fin:
    e = load("end"); put(vox, e, fin + 4.4)
# duck the bed under the voice
vl = np.convolve(np.abs(vox), np.ones(int(0.15 * SR)) / int(0.15 * SR), mode="same"); duck = 1 - 0.6 * np.clip(vl / (vl.max() + 1e-9) * 4, 0, 1)
if fin: mus *= np.clip(1 - (t - fin - 3.8) / 1.5, 0, 1) ** 1 * (t > fin - 1) + (t <= fin - 1)
mix = mus * duck * 0.8 + sfx * 0.9 + vox * 1.0
mix = np.tanh(mix * 1.1) * 0.9; mix /= max(1e-9, np.abs(mix).max() / 0.95)
sf.write("score.wav", np.stack([mix, mix], 1), SR, subtype="PCM_16"); print("score", round(DUR, 2), "s")
