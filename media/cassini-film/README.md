# Cassini's Grand Finale: crashed on purpose (HD film, 9:16)

"Do you know NASA crashed one of its best spacecraft into Saturn, on purpose?" Cassini (NASA's own model) studied Saturn for 13
years (2004–2017) and found that Enceladus sprays water into space from an ocean under its ice. Low on fuel, it was sent into
Saturn so it could never hit and contaminate a moon like that. Its Grand Finale: 22 dives between Saturn and its rings, never done
before; on 15 September 2017 it plunged into Saturn, sending data to the end; its last signal reached Earth 83 minutes later.
Orbi ending (new for this series): the sender can destroy a file — deleted on the server, gone for everyone at once
(`src/components/Void.tsx` destroy, `src/components/OrbView.tsx` Destroy ×).

- `OrbiTransfer-cassini.mp4`: 1080×1920, H.264 + AAC (≤ 45 MB); `cover.jpg`. Build: `/tmp/cb/bin/python kit/vo.py` →
  `python3 make_events.py && python3 cas_sfx.py && EXTRA_GAIN=1.3 python3 kit/synth.py` → `cat story_a.js story_b.js story_c.js > story.js`
  → 4 × `RS=0.85 node kit/render.cjs a b frames` (setsid nohup) → two-pass ffmpeg at 3400k.

## Real image and model
- Saturn: "Backlit Saturn from Cassini Orbiter 2007 May 9" (NASA/JPL/Space Science Institute, public domain) — `source/ref/`.
- The spacecraft: "Cassini-Huygens (A)", NASA 3D Resources, free and without copyright — `media/cassini-model/` (×0.58 → 6.8 m).
- Built in code (labelled ILLUSTRATION / DIAGRAM): Saturn and its rings at their real radii (banded sphere + ring disk), Enceladus with
  water jets (a real plume image could not be downloaded: Wikimedia 429), the orbit diagram, the phones.

## Facts and sources
| On screen / spoken | Source |
|---|---|
| At Saturn 2004–2017 (13 years) | NASA/JPL |
| Enceladus (~504 km wide) sprays water from a subsurface ocean | NASA/JPL |
| Low on fuel; plunged so it could never hit and contaminate moons like Enceladus | NASA/JPL |
| 22 dives between Saturn and its rings, a first | NASA/JPL |
| 15 Sept 2017 plunge; data to the end; last signal reached Earth ~83 min later (~1.4 billion km) | NASA/JPL, National Geographic |
| Orbi: the sender destroys a file — deleted on the server, gone for everyone; only the sender's device holds the key | `src/components/Void.tsx`, `src/components/OrbView.tsx` |
