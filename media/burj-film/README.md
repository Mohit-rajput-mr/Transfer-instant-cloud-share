# Burj Khalifa: why the wind can't knock it over (HD film, 9:16)

"Do you know why the tallest building on Earth is shaped like a desert flower?" Vortex shedding, the Y-shaped plan and
its 27 spiralling setbacks ("confusing the wind"), the buttressed hexagonal core, the record concrete pump, the piled raft.

- `OrbiTransfer-burj-khalifa.mp4`: 1080×1920, H.264 + AAC; `cover.jpg`.
- Source: `source/` (kit/hd.js). Build: `/tmp/cb/bin/python kit/vo.py` → `python3 make_events.py && python3 burj_sfx.py &&
  EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js` → 4 × `node kit/render.cjs a b frames`.

## What's on screen (real scale, metres)
- The tower is lofted from its plan: three wings (capsules) in a Y round a hexagonal core (r 12.5 m), 27 setbacks that
  shorten the wings one at a time in a spiral (110 → 575 m), circular crown to 585 m, steel spire to 828 m.
- Vortex shedding: an analytic vortex street (Strouhal St ≈ 0.2: one vortex every D/(0.2·U)/2 s, alternating sides) drawn
  as glowing smoke. The plain cylinder sheds in step and rocks (exaggerated, labelled); the Burj's wake is drawn
  incoherent (random phases, positions and strengths), as wind tunnel tests describe. Real sway ≈ 1.5 m (shown ×20, labelled).
- X-ray: hexagonal core + the three buttress walls; concrete pump line to 606 m; raft + 192 piles in layered ground.

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
