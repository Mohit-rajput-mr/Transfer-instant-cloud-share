# usage: landmark_prep.py OUT_DIR REAL_HEIGHT_M STRIP_BELOW CREDIT file1.stl [file2.stl …]
# STL parts (z-up, already stacked by the author) → y-up film mesh: drops the display plate (triangles entirely below
# STRIP_BELOW model units), centres the footprint on x/z = 0, base at y = 0, uniform scale to REAL_HEIGHT_M, welds,
# crease normals (30°). Writes pos.bin (float32 xyz), nor.bin (int8 xyz0), idx.bin (uint32), meta.json
import sys, json, numpy as np
out, H, strip, credit, files = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4], sys.argv[5:]
def load(f):
    b = open(f, 'rb').read(); n = np.frombuffer(b, np.uint32, 1, 80)[0]
    return np.frombuffer(b, np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')]), n, 84)['v'].astype(np.float64)
T = np.concatenate([load(f) for f in files]); T = T[T[:, :, 2].max(1) > strip]
T = T[:, :, [1, 2, 0]]                                     # z-up → y-up (cyclic: keeps the winding)
P = T.reshape(-1, 3); lo, hi = P.min(0), P.max(0); y0 = P[:, 1].min()
foot = P[P[:, 1] < y0 + (hi[1] - y0) * 0.05]; cx, cz = (foot[:, 0].min() + foot[:, 0].max()) / 2, (foot[:, 2].min() + foot[:, 2].max()) / 2
P = (P - [cx, y0, cz]) * (H / (hi[1] - y0)); T = P.reshape(-1, 3, 3)
q = np.round(P / 1e-3).astype(np.int64); u, inv = np.unique(q, axis=0, return_inverse=True); V = u * 1e-3; F = inv.reshape(-1, 3)
e1 = V[F[:, 1]] - V[F[:, 0]]; e2 = V[F[:, 2]] - V[F[:, 0]]; Nf = np.cross(e1, e2); A = np.linalg.norm(Nf, axis=1); ok = A > 1e-12; F, Nf, A = F[ok], Nf[ok], A[ok]; Nf /= A[:, None]
Nv = np.zeros_like(V); np.add.at(Nv, F.ravel(), np.repeat(Nf * A[:, None], 3, axis=0)); Nv /= np.linalg.norm(Nv, axis=1, keepdims=True) + 1e-12
Nc = Nv[F.ravel()]; Fn = np.repeat(Nf, 3, axis=0); flat = (Nc * Fn).sum(1) < np.cos(np.radians(30)); Nc[flat] = Fn[flat]
key = np.concatenate([F.ravel()[:, None], np.round(Nc * 64).astype(np.int64)], 1); uk, inv2 = np.unique(key, axis=0, return_inverse=True)
pos = V[uk[:, 0]].astype(np.float32); nor = np.zeros((len(uk), 3)); np.add.at(nor, inv2.ravel(), Nc); nor /= np.linalg.norm(nor, axis=1, keepdims=True) + 1e-12
n8 = np.zeros((len(uk), 4), np.int8); n8[:, :3] = np.round(nor * 127).astype(np.int8); idx = inv2.ravel().astype(np.uint32)
pos.tofile(out + '/pos.bin'); n8.tofile(out + '/nor.bin'); idx.tofile(out + '/idx.bin')
b0, b1 = pos.min(0), pos.max(0)
json.dump({"credit": credit, "height_m": H, "verts": int(len(pos)), "tris": int(len(idx) // 3), "bounds": [b0.tolist(), b1.tolist()]}, open(out + '/meta.json', 'w'), indent=1)
print(len(pos), 'verts', len(idx) // 3, 'tris', 'bounds', b0, b1)
