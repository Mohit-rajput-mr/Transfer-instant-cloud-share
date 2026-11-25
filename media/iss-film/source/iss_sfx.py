# ISS sound design → extra.wav. Orbit: a deep, slow space drone with the station's faint fan hum (the ISS is noisy inside: fans
# and pumps); sunrises: a soft swell each time; the water loop: pumps, a low boiling hiss in the distiller, warm-air blower for the
# brine, a reactor hum, water trickles; Orbi: room tone with soft UI ticks.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(16)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
space = np.clip(seg(0, at("water"), 0.2, 0.4) + seg(at("team"), at("orbi"), 0.4, 0.6), 0, 1)
bed(sum(np.sin(2 * np.pi * f * T + i) * (0.6 + 0.4 * np.sin(T * 0.13 * (i + 1))) for i, f in enumerate((55, 82.4, 110))) * 0.02 * space, 1, 0.03)
bed(filt(rng.standard_normal(N), 120, 700) * 0.02 * space, 1, 0.02); bed(np.sin(2 * np.pi * 240 * T) * 0.003 * space, 1, 0.004)
for i in range(16):
    t0 = fr("orbit", 0.05) + (at("water") - fr("orbit", 0.05)) * i / 16; k = np.clip(T - t0, 0, None); e = np.exp(-k * 3) * (T >= t0)
    bed(sum(np.sin(2 * np.pi * f * k) for f in (392.0, 587.3)) * e * 0.012, 1, 0.01)
lab = seg(at("water"), at("team"), 0.3, 0.4); bed(filt(rng.standard_normal(N), 80, 900) * 0.025 * lab, 1, 0.03); bed(np.sin(2 * np.pi * 60 * T) * 0.01 * lab * (0.8 + 0.2 * np.sin(T * 6)), 1, 0.0)
boil = seg(at("urine"), at("brine"), 0.3, 0.3); bed(filt(rng.standard_normal(N), 1500, 6000) * 0.02 * boil * (0.7 + 0.3 * (rng.random(N) > 0.98)), 1, 0.006)
blow = seg(at("brine"), at("clean"), 0.3, 0.3); bed(filt(rng.standard_normal(N), 300, 1800) * 0.035 * blow, 1, 0.01)
react = seg(at("clean"), at("team"), 0.3, 0.4); bed(np.sin(2 * np.pi * 110 * T) * 0.008 * react, 1, 0.002)
trick = seg(fr("clean", 0.3), at("team"), 0.3, 0.4); bed(filt(rng.standard_normal(N), 2000, 8000) * 0.015 * trick * (np.sin(T * 40) > 0.6), 1, 0.004)
orbi = seg(at("orbi"), DUR, 0.3, 1.0); bed(filt(rng.standard_normal(N), 60, 400) * 0.03 * orbi, 1, 0.03)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
