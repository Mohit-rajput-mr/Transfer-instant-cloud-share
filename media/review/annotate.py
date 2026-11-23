# Red "teacher's pen" review of the AI Eiffel Tower (left) vs a real photo (right). → eiffel-review.png
from PIL import Image, ImageDraw, ImageFont
import math
src = Image.open("/root/.claude/uploads/e16ec05d-62c3-5828-85fc-a93bf045b589/2bc41c1e-image.jpg").convert("RGB")
W, H0 = src.size; S = 2  # draw at 2x for crisp lines
BAND = 640
im = Image.new("RGBA", (W * S, (H0 + BAND) * S), (250, 248, 242, 255))
im.paste(src.resize((W * S, H0 * S), Image.LANCZOS), (0, 0))
d = ImageDraw.Draw(im, "RGBA")
RED, DRED, GRN = (230, 30, 30), (175, 15, 15), (20, 140, 60)
F = lambda s: ImageFont.truetype("caveat.woff", s * S)
def P(x, y): return (x * S, y * S)
def wobble(pts, w=3, col=RED):
    d.line([P(*p) for p in pts], fill=col, width=w * S, joint="curve")
def circ(x, y, r, col=RED, w=3):
    pts = [(x + r * math.cos(t / 40 * 6.283) * (1 + 0.04 * math.sin(t)), y + r * 0.92 * math.sin(t / 40 * 6.283)) for t in range(43)]
    wobble(pts, w, col)
def ell(box, col=RED, w=3):
    x0, y0, x1, y1 = box; cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
    wobble([(cx + rx * math.cos(t / 40 * 6.283) * (1 + 0.03 * math.sin(t * 1.7)), cy + ry * math.sin(t / 40 * 6.283)) for t in range(43)], w, col)
def arrow(x0, y0, x1, y1, col=RED, w=3):
    mx, my = (x0 + x1) / 2 + (y1 - y0) * 0.12, (y0 + y1) / 2 - (x1 - x0) * 0.12
    pts = [((1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1) for t in [i / 20 for i in range(21)]]
    wobble(pts, w, col); a = math.atan2(y1 - pts[-3][1], x1 - pts[-3][0])
    for s in (2.6, -2.6): wobble([(x1, y1), (x1 - 14 * math.cos(a + s * 0.17), y1 - 14 * math.sin(a + s * 0.17))], w, col)
def txt(x, y, s, size=26, col=RED, anchor="la", bg=True):
    s = s.replace("≈", "~").replace("→", "to").replace("≤", "under ")
    if bg and y < H0 - 5 and anchor == "la":
        b = d.textbbox(P(x, y), s, font=F(size), anchor=anchor); d.rounded_rectangle((b[0] - 8, b[1] - 4, b[2] + 8, b[3] + 6), 10, fill=(255, 255, 255, 205))
    d.text(P(x, y), s, font=F(size), fill=col, anchor=anchor)
def num(x, y, n, col=RED):
    circ(x, y, 15, col, 3); d.ellipse((P(x - 14, y - 14)[0], P(x - 14, y - 14)[1], P(x + 14, y + 14)[0], P(x + 14, y + 14)[1]), fill=(255, 255, 255, 220)); circ(x, y, 15, col, 3); txt(x, y + 1, str(n), 26, col, "mm")
def ruler(x, y0, y1, col=RED):
    wobble([(x, y0), (x, y1)], 2, col)
    for y in (y0, y1): wobble([(x - 8, y), (x + 8, y)], 2, col)

# headings on the photos
txt(12, 8, "AI render", 34, RED); txt(470, 8, "Real (from Trocadéro)", 34, GRN)

# ---- LEFT (AI) problems
# 1 top section too thin + solid (no sky through it)
ell((196, 150, 252, 440)); num(268, 290, 1); txt(286, 270, "too thin + solid,", 24); txt(286, 296, "no sky through it", 24)
# 2 long needle spire + box cap
ell((198, 50, 250, 168)); num(268, 105, 2); txt(286, 88, "needle spire +", 24); txt(286, 114, "box. Wrong summit", 24)
# 3 2nd floor is a thin line
ell((172, 450, 278, 476)); num(30, 445, 3); txt(50, 368, "2nd floor = a line,", 22); txt(50, 392, "no platform/rail", 22)
# 4 1st floor solid slab overhang
ell((108, 562, 352, 600)); num(372, 560, 4); txt(388, 540, "solid black slab,", 24); txt(388, 565, "overhangs ~9 m", 24)
# 5 arch: thin hoop, too low, springs from the ground
ell((150, 600, 300, 700)); num(225, 720, 5); txt(245, 708, "hoop springs from ground,", 22); txt(245, 730, "crown far below deck", 22)
# 6 colour black/grey
num(150, 290, 6); txt(50, 228, "black/grey,", 22); txt(50, 252, "not bronze-brown", 22)
# 7 flat grey sky, no sun
num(400, 160, 7); txt(355, 186, "flat grey fog,", 24); txt(355, 211, "no sun/shadow", 24)
# 8 ground = lawn + blobs + black slabs
ell((4, 650, 446, 795)); num(60, 640, 8); txt(78, 626, "lawn + blob trees + black slabs", 20)

# ---- RIGHT (real): matching green notes
def gnum(x, y, n): num(x, y, n, GRN)
gnum(1160, 250, 1); txt(1178, 232, "open lattice, sky", 24, GRN); txt(1178, 257, "visible, gentle curve", 24, GRN)
gnum(1100, 30, 2); txt(1118, 14, "compact cupola +", 24, GRN); txt(1118, 39, "short antenna mast", 24, GRN)
gnum(1135, 438, 3); txt(1153, 420, "real platform,", 24, GRN); txt(1153, 445, "railing + cage", 24, GRN)
gnum(1180, 578, 4); txt(1198, 556, "openwork gallery,", 24, GRN); txt(1198, 581, "barely overhangs", 24, GRN)
gnum(1230, 640, 5); txt(1248, 620, "arch = leg-to-leg,", 24, GRN); txt(1248, 645, "crown at the 1st floor", 24, GRN)
gnum(890, 520, 6); txt(830, 545, "warm bronze-brown,", 24, GRN); txt(830, 570, "sunlit side glows", 24, GRN)
gnum(640, 240, 7); txt(560, 265, "blue sky, clouds,", 24, GRN); txt(560, 290, "low warm sun", 24, GRN)
gnum(640, 600, 8); txt(658, 580, "trees, Seine bridge,", 24, GRN); txt(658, 605, "Invalides dome, skyline", 24, GRN)

# ---- proportions (rulers) on both
for (x, top, f1, f2, f3, base, col) in [(14, 57, 582, 462, 150, 695, RED), (1360, 12, 580, 438, 92, 715, GRN)]:
    ruler(x, top, base, col)
    for y, lab in [(f3, "276 m"), (f2, "116 m"), (f1, "57 m"), (base, "0")]:
        wobble([(x - 6, y), (x + 6, y)], 2, col); txt(x + 8, y - 13, lab, 18, col, bg=False)
    txt(x + 8, top - 13, "330 m", 18, col, bg=False)
txt(1385, 330, "heights OK in both:", 22, GRN); txt(1385, 352, "the problem is SHAPE,", 22, GRN); txt(1385, 374, "material, light, context", 22, GRN)

# ---- band: how to fix
y = H0 + 18
txt(20, y, "How to fix (same numbers as above)", 40, DRED); y += 58
FIX = [
 "1  Top section (116 m up to 276 m): open X-lattice with daylight through it; 4 corner members, concave taper (width ≈ 10 m at 2nd floor → ≈ 7 m at 3rd floor).",
 "2  Summit: 3rd-floor cage (≈ 18 m wide box with windows + walkway) → small cupola/lantern → short antenna mast. Total 330 m. No long needle.",
 "3  2nd floor (115.7 m): ≈ 40 m square platform with railings, walkway, lift cages; visible thickness (≈ 3 m).",
 "4  1st floor (57.6 m): ≈ 70 m square, OPEN gallery with the lattice frieze + glass pavilions; overhang under 2 m. Never a solid slab.",
 "5  Arches: one decorative arch per side, from the inner face of one leg to the next, springing ≈ 15 m up, crown touching the 1st-floor girder (≈ 39 m).",
 "6  Material: bronze-brown painted iron (≈ #7A5236 shadow → #C08A5A sunlit, 3 shades darker at base), roughness 0.6, rivet-bump normal map.",
 "7  Sky + sun: HDRI blue sky with streaky clouds, low golden sun from the side → warm lit face + brown shadow face, real cast shadows.",
 "8  Context: shoot from Trocadéro (elevated, ≈ 800 m away, long lens 50–70 mm FOV ≈ 15–20°): Pont d'Iéna, Seine, Champ de Mars,",
 "    full trees (not blobs), Haussmann skyline (cream stone, grey zinc roofs), the gold dome of Les Invalides.",
 "Check: render the SAME angle as this photo and put them side by side. Fix until a stranger can't tell which is the photo at thumbnail size.",
]
for line in FIX: txt(24, y, line, 27, (40, 40, 40) if not line.startswith("Check") else DRED); y += 52
im = im.resize((W * 3 // 2, (H0 + BAND) * 3 // 2), Image.LANCZOS)
im.convert("RGB").save("eiffel-review.png"); print(im.size)
