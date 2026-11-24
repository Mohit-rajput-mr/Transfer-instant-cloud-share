# Golden Gate tower: one tower cut out of "Golden Gate Bridge" by Supratik Athanti (Printables #1562815, CC BY 4.0) —
# the print shortens the span, so only the tower (with its pier) is used; the film places two of them 1,280 m apart.
# Scale from the model itself: deck (model z = 0) to tower top = 160 m (227 m above water − 67 m deck) → the pier base
# lands on the water line and the tower is 35 m across, as the real one (≈37 m). Writes pos/nor/idx.bin + meta.json
import sys, json, numpy as np
src, out = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read(); n = np.frombuffer(b, np.uint32, 1, 80)[0]
T = np.frombuffer(b, np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')]), n, 84)['v'].astype(np.float64)
C = T.mean(1); ext = T.max(1) - T.min(1)
keep = (C[:, 1] > -0.02) & (C[:, 1] < 0.014) & (C[:, 0] > -0.031) & (C[:, 0] < -0.002) & (ext[:, 1] < 0.006) & (C[:, 2] > -0.0416)
T = T[keep]; P = T.reshape(-1, 3)
s = 160.0 / P[:, 2].max(); cx = (P[:, 0].min() + P[:, 0].max()) / 2; top = P[P[:, 2] > P[:, 2].max() - 0.004]; cy = (top[:, 1].min() + top[:, 1].max()) / 2
Q = np.c_[-(P[:, 0] - cx), P[:, 2] + 67.0 / s, P[:, 1] - cy] * s           # (x, y, z) → (−x, z, y): right-handed; y = 0 at the water
TQ = Q.reshape(-1, 3, 3); cq = TQ.mean(1); TQ = TQ[(np.abs(cq[:, 2]) < 10.5) | (cq[:, 1] < 12)]; Q = TQ.reshape(-1, 3)   # tower + pier only: drop the model's own deck and cable pieces
q = np.round(Q / 1e-3).astype(np.int64); u, inv = np.unique(q, axis=0, return_inverse=True); V = u * 1e-3; F = inv.reshape(-1, 3)
e1 = V[F[:, 1]] - V[F[:, 0]]; e2 = V[F[:, 2]] - V[F[:, 0]]; Nf = np.cross(e1, e2); A = np.linalg.norm(Nf, axis=1); ok = A > 1e-12; F, Nf, A = F[ok], Nf[ok], A[ok]; Nf /= A[:, None]
Nv = np.zeros_like(V); np.add.at(Nv, F.ravel(), np.repeat(Nf * A[:, None], 3, axis=0)); Nv /= np.linalg.norm(Nv, axis=1, keepdims=True) + 1e-12
Nc = Nv[F.ravel()]; Fn = np.repeat(Nf, 3, axis=0); flat = (Nc * Fn).sum(1) < np.cos(np.radians(30)); Nc[flat] = Fn[flat]
key = np.concatenate([F.ravel()[:, None], np.round(Nc * 64).astype(np.int64)], 1); uk, inv2 = np.unique(key, axis=0, return_inverse=True)
pos = V[uk[:, 0]].astype(np.float32); nor = np.zeros((len(uk), 3)); np.add.at(nor, inv2.ravel(), Nc); nor /= np.linalg.norm(nor, axis=1, keepdims=True) + 1e-12
n8 = np.zeros((len(uk), 4), np.int8); n8[:, :3] = np.round(nor * 127).astype(np.int8); idx = inv2.ravel().astype(np.uint32)
pos.tofile(out + '/pos.bin'); n8.tofile(out + '/nor.bin'); idx.tofile(out + '/idx.bin')
json.dump({"credit": "Golden Gate Bridge model by Supratik Athanti (Printables #1562815), CC BY 4.0 — tower only", "scale_m_per_unit": s, "verts": int(len(pos)), "tris": int(len(idx) // 3), "bounds": [pos.min(0).tolist(), pos.max(0).tolist()]}, open(out + '/meta.json', 'w'), indent=1)
print('scale', s, len(pos), 'verts', len(idx) // 3, 'tris', 'bounds', pos.min(0), pos.max(0))
