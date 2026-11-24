# usage: tmf2stl.py in.3mf out.stl — merge every mesh object in a 3MF (applying build-item transforms) into a binary STL
import sys, zipfile, re, numpy as np, xml.etree.ElementTree as ET
z = zipfile.ZipFile(sys.argv[1]); ns = {'m': 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'}
objs = {}; items = []; comps = {}
for name in z.namelist():
    if not name.endswith('.model'): continue
    root = ET.fromstring(z.read(name))
    for o in root.iter('{%s}object' % ns['m']):
        mesh = o.find('m:mesh', ns)
        if mesh is not None:
            V = np.array([[float(v.get(a)) for a in 'xyz'] for v in mesh.find('m:vertices', ns)], np.float64)
            T = np.array([[int(t.get(a)) for a in ('v1', 'v2', 'v3')] for t in mesh.find('m:triangles', ns)], np.int64)
            objs[(name, o.get('id'))] = V[T]
        cs = o.find('m:components', ns)
        if cs is not None: comps[(name, o.get('id'))] = [(c.get('{http://schemas.microsoft.com/3dmanufacturing/production/2015/06}path', name).lstrip('/'), c.get('objectid'), c.get('transform')) for c in cs]
    b = root.find('m:build', ns)
    if b is not None: items += [(name, i.get('objectid'), i.get('transform')) for i in b]
def M(t):
    if not t: return np.eye(4)
    v = list(map(float, t.split())); m = np.eye(4); m[:3, :3] = np.array(v[:9]).reshape(3, 3); m[3, :3] = v[9:12]; return m   # row-vector convention
def collect(key, m):
    out = []
    if key in objs: P = objs[key]; Q = np.c_[P.reshape(-1, 3), np.ones(len(P) * 3)] @ m; out.append(Q[:, :3].reshape(-1, 3, 3))
    for path, oid, t in comps.get(key, []):
        k2 = (path if path in z.namelist() else key[0], oid); out += collect(k2, M(t) @ m)
    return out
tris = []
for name, oid, t in items: tris += collect((name, oid), M(t))
T = np.concatenate(tris).astype(np.float32); n = len(T)
with open(sys.argv[2], 'wb') as f:
    f.write(b'\0' * 80); f.write(np.uint32(n).tobytes()); rec = np.zeros(n, np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')])); rec['v'] = T; f.write(rec.tobytes())
print('tris', n, 'bounds', T.reshape(-1, 3).min(0), T.reshape(-1, 3).max(0))
