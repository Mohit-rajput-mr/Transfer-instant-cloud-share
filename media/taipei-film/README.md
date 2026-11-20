# Taipei 101: the golden ball (HD film)

"Do you know why a giant golden ball hangs inside one of the tallest buildings in the world?" — the tuned mass damper.

- Real-scale world (metres): the tower built from its real layout (trunk to 25F, ruyi coins, 8 flared modules of 8 floors with
  notched corners, stepped crown, spire to 508 m), a procedural Xinyi city + mountains, Poly Haven CC0 sky / textures / lamp,
  NASA Earth textures (typhoon + quake map), BodyParts3D visitor (CC BY 4.0).
- The damper at its true height: 5.5 m sphere of 41 × 12.5 cm plates, 8 cables (~12 m → ~7 s swing), 8 hydraulic dampers,
  bumper ring, viewing deck; a cutaway of one damper (oil through the piston holes → heat).
- Facts: 660 t, 87F–92F, opened 2004 (tallest until 2010), up to 40% less sway, Typhoon Soudelor 2015 → 100 cm swing. Sway is
  exaggerated on screen and labelled so.
- Orbi ad: real orbitransfer.com captures — a file's own QR (laptop) → phone scans → the file is on the phone; locked; 30-min burn.

Build: `cd source && /tmp/cb/bin/python kit/vo.py && python3 make_events.py && python3 taipei_sfx.py && EXTRA_GAIN=1.4 python3 kit/synth.py`,
then render 3670 frames with `node kit/render.cjs a b frames` and encode at 3000k.
