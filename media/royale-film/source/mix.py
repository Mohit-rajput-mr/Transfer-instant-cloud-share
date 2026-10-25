# Royale sound: a tense 120 BPM pulse that speeds up as the ring closes, a soft tick per bump, a zap per lost heart,
# a boom + falling tone per knockout, a fanfare for the survivor. Same timeline as film.html (sim_27.json).
import json, numpy as np, soundfile as sf
SR = 48000; INTRO = 2.8; S = json.load(open("sim_27.json"))
W = next(e for e in S["events"] if e["k"] == "win"); END = W["t"] + 1.0; DUR = INTRO + END + 5.2; N = int(DUR * SR); out = np.zeros(N)
rng = np.random.default_rng(9)
def put(x, at, g):
    i = int(at * SR)
    if i >= N or i < 0: return
    x = x[: N - i]; out[i:i + len(x)] += x * g
def tone(m, d=0.2, bright=0.3, dec=12):
    f = 440 * 2 ** ((m - 69) / 12); n = int(d * SR); tt = np.arange(n) / SR; e = np.exp(-tt * dec) * np.minimum(1, tt / 0.003)
    return (np.sin(2 * np.pi * f * tt) + bright * np.sin(4 * np.pi * f * tt)) * e
def kick(): n = int(0.3 * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * (45 + 100 * np.exp(-tt * 28)) * tt) * np.exp(-tt * 8)
def zap(): n = int(0.18 * SR); tt = np.arange(n) / SR; return np.sign(np.sin(2 * np.pi * (900 - 2600 * tt) * tt)) * np.exp(-tt * 18) * 0.5
t = INTRO; bpm = 118
while t < INTRO + END:
    k = (t - INTRO) / END; put(kick(), t, 0.5); put(tone(36, 0.25, 0.6, 6), t, 0.18); t += 60 / (bpm + 50 * k)
for i, m in enumerate((50, 57, 62)): put(tone(m, 1.6, 0.2, 2), 0.3 + i * 0.25, 0.2)
for e in S["events"]:
    at = INTRO + e["t"]
    if e["k"] == "bump": put(tone(88, 0.04, 0, 50), at, 0.06)
    elif e["k"] == "hurt": put(zap(), at, 0.35)
    elif e["k"] == "out":
        put(kick(), at, 0.9); n = int(0.6 * SR); tt = np.arange(n) / SR; put(np.sin(2 * np.pi * (600 * np.exp(-tt * 4)) * tt) * np.exp(-tt * 4), at + 0.02, 0.3); put(rng.normal(0, 1, int(0.4 * SR)) * np.exp(-np.arange(int(0.4 * SR)) / SR * 9), at, 0.18)
for j, m in enumerate((60, 64, 67, 72, 76, 79, 84)): put(tone(m, 1.4, 0.3, 3), INTRO + END - 0.2 + j * 0.12, 0.22)
mix = np.tanh(out * 1.2); mix /= max(1e-9, np.abs(mix).max() / 0.92)
sf.write("score.wav", np.stack([mix, mix], 1), SR, subtype="PCM_16"); print("score", round(DUR, 2))
