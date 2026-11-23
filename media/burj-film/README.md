# Burj Khalifa: why the wind can't knock it over (HD film, 9:16)

"Do you know why the tallest building on Earth is shaped like a desert flower?" Vortex shedding, the Y-shaped plan and
its 27 spiralling setbacks ("confusing the wind"), the buttressed hexagonal core, the record concrete pump, the piled raft.

- `OrbiTransfer-burj-khalifa.mp4`: 1080×1920, H.264 + AAC; `cover.jpg`.
- Source: `source/` (kit/hd.js). Build: `/tmp/cb/bin/python kit/vo.py` → `python3 make_events.py && python3 burj_sfx.py &&
  EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js` → 4 × `node kit/render.cjs a b frames`.

## What's on screen (real scale, metres)
- The tower is modelled from its plan and checked against photos (`source/ref/`, side-by-side PNGs in `source/check/`):
  a fat Y of three wings round a hexagonal core (r 12.5 m); each wing has a rounded tip and rows of convex glass bays
  down both sides with V-notches between them. The 27 setbacks remove one wing's tip bay at a time (wing 0, 1, 2, …),
  78 m → 598 m; the tip distances were fitted to the width profile measured on a ground-level photo. Trefoil tiers carry
  on to 652 m, then the clad, stepped spire base and the steel needle with its rings to 828 m.
- Facade shader (from close-up photos): dark blue-grey reflective glass mirroring the sky, a pale silver band at every
  floor (163 floors in 585 m), stainless fins on every 1.5 m mullion, bronze-silver louvre bands at the mechanical
  floors and where each tube stops; stripes are anti-aliased with screen-space filtering.
- Downtown Dubai: glass and stone-clad towers of varied heights and tints (they reflect the same sky), Sheikh Zayed Road
  with traffic, the Dubai Fountain lake with its arcs of jets, palms, desert and the Gulf; procedural clouds.
- Wind tunnel: a real tunnel set (steel walls, honeycomb flow straightener, fan, laser sheet); thousands of smoke particles
  are advected through potential flow round the model plus Lamb–Oseen vortices shed at the Strouhal rhythm (St ≈ 0.2),
  an orderly street behind the cylinder, an incoherent wake behind the Burj model (its real geometry, scaled).
- X-ray: the scene dims to dusk, the skin turns to glass edges, the hexagonal core glows blue, the buttress walls green;
  concrete pump line to 606 m; raft + 192 piles in layered ground.

## Facts and sources
| Fact | Source |
|---|---|
| 828 m to the tip; 163 floors; opened 4 Jan 2010 | Wikipedia "Burj Khalifa" (records list; opening refs: BBC News 4 Jan 2010, Gulf News) |
| Design based on the *Hymenocallis* desert flower; Y-shaped tripartite plan | Wikipedia "Burj Khalifa" (park and tower design based on *Hymenocallis*; "Y-shaped tripartite floor geometry") |
| 27 setbacks in a spiral, aligned to minimise wind loading from eddies and vortices | Wikipedia "Burj Khalifa" (Architecture) |
| Hexagonal core buttressed by three wings in a Y | Wikipedia "Buttressed core"; Baker & Pawlikowski, "Higher and Higher: The Evolution of the Buttressed Core" |
| The top sways about 1.5 m in total | Wikipedia "Burj Khalifa" ("At its tallest point, the tower sways a total of 1.5 m") |
| Concrete pumped to a record 606 m (2008, Putzmeister) | Wikipedia "Burj Khalifa" (records; Putzmeister ref) |
| 192 piles, 1.5 m diameter × 43 m, buried more than 50 m deep; 45,000 m³ / 110,000 t of concrete in the foundation | Wikipedia "Burj Khalifa" (Structure) |
| Spire > 4,000 t of structural steel, 244 m; "could be a skyscraper on its own" (CTBUH) | Wikipedia "Burj Khalifa" (Spire; CTBUH vanity-height study) |
| Orbi: big files split into parts, several at once; resumes after a drop; no app, no login | `media/VIDEO_PLAYBOOK.md` verified facts |

## Assets and licences
- Sky: Poly Haven "Qwantani late afternoon (pure sky)", CC0. Sand: Poly Haven "aerial_sand", CC0. Concrete / wood: Poly Haven, CC0.
- Water shader: three.js `Water.js` (MIT); procedural normals. Everything else is procedural.
- Orbi screens: live orbitransfer.com captures (2026-11-22, `source/shots_live/`), with the upload state drawn on top.
- Voice: Chatterbox (MIT) cloned from the house reference voice (Kokoro bm_george, Apache-2.0); checked with faster-whisper.
- Reference photos (`source/ref/`), Creative Commons via Openverse / Flickr and Wikimedia Commons:
  - `burj_dubai_001.jpg`: "File:Burj Dubai 001.jpg" by Nepenthes, CC BY-SA 2.5 (https://commons.wikimedia.org/wiki/File:Burj_Dubai_001.jpg)
  - `burj_khalifa_0.jpg`: "Burj Khalifa Park #2" by mckaysavage, BY 2.0 (https://www.flickr.com/photos/56796376@N00/5374367940)
  - `burj_khalifa_1.jpg`: "Architecture: Burj Khalifa and the Moon" by dodongjan, BY-ND 2.0 (https://www.flickr.com/photos/44301197@N08/5193950675)
  - `burj_khalifa_dubai_fountain_1.jpg`: "Burj Khalifa Dancing Water Fountain show" by Infomastern, BY-SA 2.0 (https://www.flickr.com/photos/55856449@N04/8278133482)
  - `downtown_dubai_skyline_0.jpg`: "Downtown Dubai Skyline" by tempoworld.net, BY-SA 2.0 (https://www.flickr.com/photos/83318973@N00/6985587904)
  - `burj_khalifa_tower_0.jpg`: "Burj Khalifa Park #2" by mckaysavage, BY 2.0 (https://www.flickr.com/photos/56796376@N00/5374367940)
  - `burj_khalifa_tower_1.jpg`: "Burj Dubai" by Leandro's World Tour, BY 2.0 (https://www.flickr.com/photos/18115835@N00/4128599775)
  - `burj_khalifa_looking_up_0.jpg`: "mall and lake tilt-shift" by _gee_, BY 2.0 (https://www.flickr.com/photos/32426344@N00/20576596426)
  - `burj_khalifa_spire_0.jpg`: "Burj Al-Khalifa" by mikecogh, BY-SA 2.0 (https://www.flickr.com/photos/89165847@N00/9827348995)
  - `burj_khalifa_glass_0.jpg`: "Glass Curtain Wall II Burj Khalifa" by andryn2006, BY-SA 2.0 (https://www.flickr.com/photos/84985982@N00/9852400295)
  - `burj_khalifa_glass_1.jpg`: "High High ... High Enough to Dream" by MNmagic, PDM 1.0 (https://www.flickr.com/photos/21416599@N08/22648611076)
  - `burj_khalifa_sunset_0.jpg`: "burj khalifa sunset" by Hungarian Snow, BY-SA 2.0 (https://www.flickr.com/photos/19546327@N00/14325285230)
  - `burj_khalifa_sunset_1.jpg`: "burj khalifa sunset" by Hungarian Snow, BY-SA 2.0 (https://www.flickr.com/photos/19546327@N00/14325248108)
  - `burj_khalifa_night_0.jpg`: "Dubai City" by slp07, BY-SA 2.0 (https://www.flickr.com/photos/128413581@N05/15479505345)
  - `burj_khalifa_night_1.jpg`: "Glowing Dubai" by huskyte77, BY-ND 2.0 (https://www.flickr.com/photos/74101223@N00/8526340947)
  - `burj_khalifa_aerial_0.jpg`: "Looking out over Dubai looking NE" by mckaysavage, BY 2.0 (https://www.flickr.com/photos/56796376@N00/5374320022)
  - `burj_khalifa_aerial_1.jpg`: "Dubai - vue depuis la Burj Khalifa - 18-06-2011 - 17h39" by Panoramas, BY-ND 2.0 (https://www.flickr.com/photos/33834913@N00/5857279327)
