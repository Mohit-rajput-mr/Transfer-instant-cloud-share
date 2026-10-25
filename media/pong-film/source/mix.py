# Pong sound: a driving 128 BPM beat, a blip per paddle hit (pitch climbs with the rally), a tick per wall bounce,
# a crowd-noise swell + chord for each point, a fanfare for the winner. Same timeline as film.html (sim_11.json).
import json, numpy as np, soundfile as sf
SR = 48000; INTRO = 2.6; S = json.load(open("sim_11.json"))
END = [e for e in S["events"] if e["k"] == "score"][-1]["t"] + 0.9; DUR = INTRO + END + 5.2; N = int(DUR * SR); out = np.zeros(N)
def put(x, at, g):
    i = int(at * SR)
    if i >= N or i < 0: return
    x = x[: N - i]; out[i:i + len(x)] += x * g
def tone(m, d=0.2, bright=0.3, dec=12):
    f = 440 * 2 ** ((m - 69) / 12); n = int(d * SR); tt = np.arange(n) / SR; e = np.exp(-tt * dec) * np.minimum(1, tt / 0.003)
    return (np.sign(np.sin(2 * np.pi * f * tt)) * 0.35 + np.sin(2 * np.pi * f * tt) + bright * np.sin(4 * np.pi * f * tt)) * e
rng = np.random.default_rng(5); beat = 60 / 128
def kick(): n = int(0.25 * SR); tt = np.arange(n) / SR; return np.sin(2 * np.pi * (50 + 90 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 9)
def hat(): n = int(0.05 * SR); return rng.normal(0, 1, n) * np.exp(-np.arange(n) / SR * 70)
t = INTRO
while t < INTRO + END:
    put(kick(), t, 0.5); put(hat(), t + beat / 2, 0.12); t += beat
for i, m in enumerate((48, 55, 60, 64)): put(tone(m, 1.4, 0.2, 2), 0.3 + i * 0.15, 0.18)
PENT = [0, 3, 5, 7, 10]
for e in S["events"]:
    at = INTRO + e["t"]
    if e["k"] == "hit": put(tone(64 + PENT[e["hits"] % 5] + 12 * (e["hits"] // 5 % 2) + (0 if e["side"] == "bot" else -5), 0.18), at, 0.32)
    elif e["k"] == "wall": put(tone(84, 0.05, 0, 40), at, 0.12)
    else:
        n = int(1.2 * SR); cr = rng.normal(0, 1, n); cr = np.convolve(cr, np.ones(30) / 30, "same") * np.sin(np.linspace(0, np.pi, n)); put(cr, at, 0.5)
        for j, m in enumerate((60, 64, 67, 72) if e["win"] == "bot" else (57, 60, 64, 69)): put(tone(m, 0.6, 0.2, 4), at + j * 0.06, 0.2)
for j, m in enumerate((60, 64, 67, 72, 76, 79, 84)): put(tone(m, 1.4, 0.3, 3), INTRO + END - 0.3 + j * 0.12, 0.22)
mix = np.tanh(out * 1.2); mix /= max(1e-9, np.abs(mix).max() / 0.92)
sf.write("score.wav", np.stack([mix, mix], 1), SR, subtype="PCM_16"); print("score", round(DUR, 2))
