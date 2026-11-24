# Bell X-1 sound design → extra.wav. High altitude: thin wind roar rising with speed; the rocket (four chambers lighting one
# by one, a rough crackling roar); buffeting near Mach 1; the drop: a clunk and a falling whoosh; the boom: silence on the
# desert (wind, the wind sock flapping), then a double crack (the N-wave's two shocks) and a rumble; the gallery: room tone.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(29)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def place(sig, t0, g=1.0, pan=0.0):
    i0 = int(t0 * SR)
    if i0 >= N or i0 < 0: return
    s = sig[: N - i0]; out[0, i0:i0 + len(s)] += s * g * (1 - pan * 0.6); out[1, i0:i0 + len(s)] += s * g * (1 + pan * 0.6)
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
def noise(lo, hi): return filt(rng.standard_normal(N), lo, hi)
high = np.clip(seg(0, at("real"), 0.1, 0.2) + seg(at("sound"), at("boom"), 0.2, 0.05), 0, 1)
studio = seg(at("why"), at("sound"), 0.2, 0.2); museum = np.clip(seg(at("real"), at("why"), 0.2, 0.2) + seg(at("today"), DUR, 0.3, 1.0), 0, 1)
desert = seg(at("boom"), at("today"), 0.05, 0.4)
rocket = np.clip(seg(0, at("real"), 0.1, 0.2) + seg(at("pile"), at("tail"), 0.3, 0.3) * 0.7 + seg(fr("rocket", 0.05), at("boom"), 0.1, 0.05), 0, 1)
bed(noise(80, 1500) * 0.05 * high, 1, 0.02)                                                     # thin air rushing
roar = filt(rng.standard_normal(N), 30, 900) * (0.8 + 0.2 * np.sin(T * 13)); crackle = filt(rng.standard_normal(N), 1500, 8000) * (rng.random(N) > 0.996) * 4
ramp = np.clip((T - at("rocket")) / 2.0, 0, 1); ramp = np.where(T < at("rocket"), 1, np.floor(ramp * 4 + 0.999) / 4)    # chambers light one by one
bed((roar * 0.22 + crackle * 0.03) * rocket * ramp, 1, 0.006)
buff = seg(fr("pile", 0.5), at("tail"), 0.4, 0.2) + seg(at("mach"), fr("mach", 0.5), 0.3, 0.4)
for t0 in np.arange(0, DUR, 0.11):
    k = buff[min(N - 1, int(t0 * SR))]
    if k > 0.05: n = int(0.12 * SR); tt = np.arange(n) / SR; place(filt(rng.standard_normal(n), 40, 400) * np.exp(-tt * 30), t0, 0.08 * k)
n = int(0.4 * SR); tt = np.arange(n) / SR; place(np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 12) + filt(rng.standard_normal(n), 300, 3000) * np.exp(-tt * 25), at("drop") + 0.3, 0.25)   # release clunk
bed(filt(rng.standard_normal(N), 200, 2500) * seg(at("drop"), at("rocket"), 0.5, 0.2) * 0.06, 1, 0.01)
bed(noise(60, 700) * (0.6 + 0.4 * np.sin(T * 0.9)) * 0.05 * desert, 1, 0.02); bed(noise(800, 3000) * (np.sin(T * 9) > 0.3) * 0.012 * desert, 1, 0.01)   # wind + sock flapping
hit = fr("boom", 0.72)
def crack(t0, g):
    n = int(0.06 * SR); tt = np.arange(n) / SR; place(filt(rng.standard_normal(n), 60, 6000) * np.exp(-tt * 60) + np.sin(2 * np.pi * 45 * tt) * np.exp(-tt * 20), t0, g)
crack(hit, 0.6); crack(hit + 0.12, 0.5)                                                         # the two shocks of the N-wave
n = int(3.0 * SR); tt = np.arange(n) / SR; place(filt(rng.standard_normal(n), 25, 250) * np.exp(-tt * 1.3) * (1 - np.exp(-tt * 30)), hit + 0.05, 0.35)
bed(noise(60, 400) * 0.03 * (museum + studio * 0.6), 1, 0.03)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
