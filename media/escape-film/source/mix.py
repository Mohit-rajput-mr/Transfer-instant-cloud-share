# Escape-the-ring sound: every bounce on the ring plays the next note of "In the Hall of the Mountain King" (Grieg,
# public domain), a key up each time the tune loops; escapes whoosh up; the shatter booms. Writes score.wav.
import json, numpy as np, soundfile as sf
SR = 48000; S = json.load(open("sim.json")); DUR = len(S["frames"]) / S["fps"]; N = int(DUR * SR); out = np.zeros(N)
P1 = [59, 61, 62, 64, 66, 62, 66, 65, 61, 65, 64, 60, 64]; P2 = [59, 61, 62, 64, 66, 62, 66, 71, 69, 66, 62, 66, 69]; MEL = P1 + P2
def put(x, at, gain):
    i = int(at * SR); x = x[: max(0, N - i)]; out[i:i + len(x)] += x * gain
def note(m, d=0.22):
    f = 440 * 2 ** ((m - 69) / 12); n = int(d * SR); tt = np.arange(n) / SR; e = np.exp(-tt * 9) * np.minimum(1, tt / 0.004)
    return (np.sin(2 * np.pi * f * tt) * 0.7 + np.sin(2 * np.pi * 2 * f * tt) * 0.2 + np.sign(np.sin(2 * np.pi * f * tt)) * 0.08) * e
last, k = -1, 0
for e in S["events"]:
    if e["k"] == "hit":
        if e["t"] - last < 0.075: continue
        last = e["t"]; loop = k // len(MEL); put(note(MEL[k % len(MEL)] + 12 + loop), e["t"], 0.32); k += 1
    elif e["k"] == "esc":
        n = int(0.12 * SR); tt = np.arange(n) / SR; put(np.sin(2 * np.pi * np.cumsum(np.linspace(500, 1600, n)) / SR) * np.exp(-tt * 25), e["t"], 0.06)
    elif e["k"] == "shatter":
        n = int(2.2 * SR); tt = np.arange(n) / SR; boom = np.sin(2 * np.pi * (40 + 90 * np.exp(-tt * 6)) * tt) * np.exp(-tt * 1.6) + np.random.default_rng(1).normal(0, 1, n) * np.exp(-tt * 5) * 0.3
        put(boom, e["t"], 0.9)
        for m in (59, 66, 71, 74): put(note(m, 2.4) * 0.6, e["t"] + 0.15, 0.25)
mix = np.tanh(out * 1.3); mix /= max(1e-9, np.abs(mix).max() / 0.92)
sf.write("score.wav", np.stack([mix, mix], 1), SR, subtype="PCM_16"); print("notes", k, "score", round(DUR, 1))
