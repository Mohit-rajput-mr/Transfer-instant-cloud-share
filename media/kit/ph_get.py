# Poly Haven (CC0) fetcher: python3 kit/ph_get.py model <asset> [1k|2k] | tex <asset> [res] | hdri <asset> [res]
import json, os, sys, urllib.request
kind, asset = sys.argv[1], sys.argv[2]; res = sys.argv[3] if len(sys.argv) > 3 else "1k"
root = os.path.join(os.path.dirname(__file__), "ph", asset); os.makedirs(root, exist_ok=True)
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "orbi-film-kit"}), timeout=120).read()
f = json.loads(get(f"https://api.polyhaven.com/files/{asset}"))
def save(url, rel):
    p = os.path.join(root, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    if not os.path.exists(p): open(p, "wb").write(get(url))
    print(rel, os.path.getsize(p))
if kind == "model":
    g = f["gltf"][res]["gltf"]; save(g["url"], os.path.basename(g["url"]))
    for rel, inc in g.get("include", {}).items(): save(inc["url"], rel)
elif kind == "tex":
    for m in ["Diffuse", "nor_gl", "Rough", "AO", "arm"]:
        if m in f and res in f[m]: d = f[m][res]; d = d.get("jpg") or d.get("png"); save(d["url"], os.path.basename(d["url"]))
elif kind == "hdri":
    t = f.get("tonemapped"); 
    if t: save(t["url"], "tonemapped.jpg")
    h = f["hdri"][res]["hdr"]; save(h["url"], os.path.basename(h["url"]))
