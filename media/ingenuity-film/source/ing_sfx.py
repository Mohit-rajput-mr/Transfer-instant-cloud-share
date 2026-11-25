# Ingenuity sound design → extra.wav. Mars: thin, low wind; rotors heard as a high, thin buzz (thin air carries little sound:
# kept quiet and filtered); spin-up whine rising with rpm; dust hiss; the air-box scene: soft tones; Orbi studio: room tone.
import json, wave
import numpy as np
SR = 48000
D = json.load(open("vo/lines.json")); L = {l["key"]: l for l in D["lines"]}; DUR = D["duration"]
N = int(DUR * SR); T = np.arange(N) / SR
rng = np.random.default_rng(41)
at = lambda k: L[k]["at"]; fr = lambda k, a: L[k]["at"] + L[k]["dur"] * a
out = np.zeros((2, N))
def filt(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X /= 1 + (f / hi) ** order
    if lo: X /= 1 + (lo / np.maximum(f, 0.5)) ** order
    return np.fft.irfft(X, len(x))
def seg(a, b, fi=0.4, fo=0.4): return np.clip((T - a) / fi, 0, 1) * np.clip((b - T) / fo, 0, 1)
def bed(x, g, w=0.012): out[0] += x * g; out[1] += np.roll(x, int(w * SR)) * g
mars = np.clip(seg(0, at("air"), 0.1, 0.3) + seg(at("rpm"), at("orbi"), 0.3, 0.4), 0, 1)
bed(filt(rng.standard_normal(N), 40, 500) * (0.6 + 0.4 * np.sin(T * 0.4)) * 0.06 * mars, 1, 0.03)
spin = np.clip(seg(0, at("this"), 0.1, 0.3) + seg(at("alone"), fr("more", 0.0), 0.3, 0.3), 0, 1)
up = np.clip((T - at("rpm")) / max(0.1, L["rpm"]["dur"] * 0.7), 0, 1) * seg(at("rpm"), at("coax"), 0.05, 0.3); coaxs = seg(at("coax"), at("alone"), 0.3, 0.3) * 0.4
lvl = np.clip(spin + up + coaxs, 0, 1); f = 60 + 40 * lvl; ph = np.cumsum(2 * np.pi * f * 2 / SR)
buzz = filt(np.sign(np.sin(ph)) * 0.5 + 0.5 * np.sin(ph * 2), 200, 3000); bed(buzz * 0.03 * lvl, 1, 0.004)
bed(filt(rng.standard_normal(N), 1500, 7000) * 0.015 * lvl, 1, 0.007)
air = seg(at("air"), at("rpm"), 0.3, 0.3); bed(sum(np.sin(2 * np.pi * fq * T) for fq in (220, 277, 330)) * 0.012 * air, 1, 0.02)
orbi = seg(at("orbi"), DUR, 0.3, 1.0); bed(filt(rng.standard_normal(N), 60, 400) * 0.03 * orbi, 1, 0.03)
mix = out / max(1e-6, np.abs(out).max()) * 0.6
with wave.open("extra.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print("extra.wav", round(DUR, 2), "s")
