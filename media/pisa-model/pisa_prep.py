# Leaning Tower of Pisa: "Monuments 01 – Leaning Tower of Pisa – Italy" by André Spilari (Printables #1714900), Public Domain.
# → film coordinates (y up, lean towards +x), real size (outer diameter 15.48 m at the base, 56.67 m along the axis), split
#   into the 8 storeys at the cornices, each storey straightened about its base centre (its built tilt is returned so the
#   film can re-apply it), welded, crease normals (30°). Writes media/kit/models/pisa/storeys.bin + storeys.json
import sys, json, numpy as np
src, outdir = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read(); n = np.frombuffer(b, np.uint32, 1, 80)[0]
T = np.frombuffer(b, np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')]), n, 84)['v'].astype(np.float64)
# model z-up, lean towards +y  →  film: x = model y, y = model z, z = model x (cyclic, right-handed)
T = T[:, :, [1, 2, 0]]
def centre(P, y0, y1):
    m = (P[:, 1] > y0) & (P[:, 1] < y1); Q = P[m]; return np.array([(Q[:, 0].min() + Q[:, 0].max()) / 2, (y0 + y1) / 2, (Q[:, 2].min() + Q[:, 2].max()) / 2])
P = T.reshape(-1, 3)
c0, c1 = centre(P, 4, 6), centre(P, 79, 81); base = centre(P, 0.5, 1.5)
lean = np.arctan2(c1[0] - c0[0], c1[1] - c0[1]); side = np.arctan2(c1[2] - c0[2], c1[1] - c0[1]); print('overall lean %.2f°, side %.2f°' % (np.degrees(lean), np.degrees(side)))
def rotz(P, a, o):  # rotate in the x-y plane about point o by angle a (positive = +x top goes to -x... we use: x' = x cos - y sin)
    Q = P - o; x = Q[:, 0] * np.cos(a) - Q[:, 1] * np.sin(a); y = Q[:, 0] * np.sin(a) + Q[:, 1] * np.cos(a); Q[:, 0] = x; Q[:, 1] = y; return Q + o
o = np.array([c0[0], 0, c0[2]]); P = rotz(P, lean, o)          # stand it upright about the base centre
P[:, 0] -= o[0]; P[:, 2] -= o[2]; P[:, 1] -= P[:, 1].min()
AX = P[:, 1].max(); D0 = (P[(P[:, 1] > 4) & (P[:, 1] < 6), 2].max() - P[(P[:, 1] > 4) & (P[:, 1] < 6), 2].min())   # across (no door/lean bias)
sh, sv = 15.48 / D0, 56.67 / AX; P[:, [0, 2]] *= sh; P[:, 1] *= sv; print('scale h %.4f v %.4f (diam %.2f units, axis %.2f units)' % (sh, sv, D0, AX))
T = P.reshape(-1, 3, 3)
B = [0, 22.6, 33.6, 44.6, 54.6, 64.6, 74.6, 83.6, 200]; B = [x * sv * (100 / 100.0) for x in B]   # cornice tops, model units → m
cy = T.mean(1)[:, 1]; meta = {"credit": "Leaning Tower of Pisa model by André Spilari (Printables #1714900), Public Domain", "storeys": []}
chunks = []
for k in range(8):
    m = (cy >= B[k]) & (cy < B[k + 1]); S = T[m].reshape(-1, 3); y0, y1 = S[:, 1].min(), S[:, 1].max()
    # axis of this storey: slice centres, least squares x(y)
    ys = np.linspace(y0 + (y1 - y0) * 0.15, y1 - (y1 - y0) * 0.15, 6); C = np.array([centre(S, y - 0.2, y + 0.2) for y in ys])
    a = np.polyfit(C[:, 1], C[:, 0], 1)[0]; tilt = np.arctan(a); bx = 0.0; bz = 0.0   # measured only; storeys keep the author's shape (no per-storey straightening)
    ob = np.array([bx, B[k], bz]); S = S - ob                           # base of the storey on the tower axis → origin
    h = B[k + 1] - B[k] if k < 7 else y1 - B[k]
    # weld + crease normals
    q = np.round(S / 1e-4).astype(np.int64); u, inv = np.unique(q, axis=0, return_inverse=True); V = u * 1e-4; F = inv.reshape(-1, 3)
    e1 = V[F[:, 1]] - V[F[:, 0]]; e2 = V[F[:, 2]] - V[F[:, 0]]; Nf = np.cross(e1, e2); A = np.linalg.norm(Nf, axis=1); ok = A > 1e-12; F, Nf, A = F[ok], Nf[ok], A[ok]; Nf /= A[:, None]
    Nv = np.zeros_like(V); np.add.at(Nv, F.ravel(), np.repeat(Nf * A[:, None], 3, axis=0)); Nv /= np.linalg.norm(Nv, axis=1, keepdims=True) + 1e-12
    Nc = Nv[F.ravel()]; Fn = np.repeat(Nf, 3, axis=0); flat = (Nc * Fn).sum(1) < np.cos(np.radians(30)); Nc[flat] = Fn[flat]
    key = np.concatenate([F.ravel()[:, None], np.round(Nc * 64).astype(np.int64)], 1); uk, inv2 = np.unique(key, axis=0, return_inverse=True)
    pos = V[uk[:, 0]].astype(np.float32); nor = np.zeros((len(uk), 3)); np.add.at(nor, inv2.ravel(), Nc); nor /= np.linalg.norm(nor, axis=1, keepdims=True) + 1e-12
    idx = inv2.ravel().astype(np.uint32); nor8 = np.zeros((len(uk), 4), np.int8); nor8[:, :3] = np.round(nor * 127).astype(np.int8)
    print('storey %d: base %.2f m, height %.2f m, built tilt %.2f°, %d verts, %d tris' % (k, B[k], h, np.degrees(tilt), len(pos), len(idx) // 3))
    meta["storeys"].append({"y0": float(B[k]), "h": float(h), "tilt_deg": float(np.degrees(tilt)), "verts": int(len(pos)), "tris": int(len(idx) // 3)})
    chunks += [pos.tobytes(), nor8.tobytes(), idx.tobytes()]
open(outdir + '/storeys.bin', 'wb').write(b''.join(chunks)); json.dump(meta, open(outdir + '/storeys.json', 'w'), indent=1)
print('MB', sum(len(c) for c in chunks) / 1e6)
