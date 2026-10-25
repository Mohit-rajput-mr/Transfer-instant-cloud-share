# Race sound: every hard hit plays a note (each file type its own octave of a pentatonic scale), a chime for each finish,
# a drum roll + hit for each round, a fanfare for the champion. Same timeline as film.html (3 rounds of sim_7/8/3).
import json, numpy as np, soundfile as sf
SR = 48000; INTRO, GAP = 2.2, 1.6
R = [json.load(open(f"sim_{s}.json")) for s in (7, 8, 3)]
start, t = [], INTRO
for s in R:
    start.append(t); n = round((max(s["finish"]) + 1.2) * 30); s["len"] = n / 30; t += n / 30 + INTRO + GAP
DUR = start[2] + R[2]["len"] + 5.5; N = int(DUR * SR); out = np.zeros(N)
def put(x, at, g):
    i = int(at * SR)
    if i >= N: return
    x = x[: N - i]; out[i:i + len(x)] += x * g
def tone(m, d=0.25, bright=0.2):
    f = 440 * 2 ** ((m - 69) / 12); n = int(d * SR); tt = np.arange(n) / SR; e = np.exp(-tt * 10) * np.minimum(1, tt / 0.003)
    return (np.sin(2 * np.pi * f * tt) + bright * np.sin(4 * np.pi * f * tt)) * e
PENT = [0, 2, 4, 7, 9]; BASE = {"photo": 72, "video": 67, "song": 79, "pdf": 64, "folder": 74, "note": 76}
rng = np.random.default_rng(3)
for s, st in zip(R, start):
    for i in range(16): put(rng.normal(0, 1, int(0.05 * SR)) * np.exp(-np.arange(int(0.05 * SR)) / SR * 40), st - 1.6 + i * 0.09, 0.15 + i * 0.01)
    put(tone(43, 0.8, 0.5) * 1.5, st, 0.5)
    for e in s["events"]:
        if e["t"] > s["len"]: continue
        if e["k"] == "hit": put(tone(BASE[e["b"]] + PENT[int(e["t"] * 7) % 5], 0.22), st + e["t"], min(0.35, 0.08 + e["v"] / 4000))
        else:
            for j, m in enumerate((72, 76, 79) if e["place"] == 1 else (72, 76)): put(tone(m + (12 if e["place"] == 1 else 0), 0.5), st + e["t"] + j * 0.07, 0.25)
end = start[2] + R[2]["len"] - 0.5
for j, m in enumerate((60, 64, 67, 72, 76, 79, 84)): put(tone(m, 1.4, 0.3), end + j * 0.12, 0.3)
mix = np.tanh(out * 1.2); mix /= max(1e-9, np.abs(mix).max() / 0.92)
sf.write("score.wav", np.stack([mix, mix], 1), SR, subtype="PCM_16"); print("score", round(DUR, 2))
