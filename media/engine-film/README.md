# How a car engine turns fuel into motion (HD science film, 3:04)
First film on the HD kit (`kit/hd.js`): PBR metal with studio reflections, hatched cutaway faces, bloom, depth of field,
sub-frame motion blur, film grade. A real inline-4 (86 mm bore/stroke, 145 mm rods, slider-crank motion, DOHC cams at
half speed, firing order 1-3-4-2) cut open with a laser plane.
Beats: 100 explosions a second at 3,000 rpm, you feel none → cut → block, cylinders, piston, rings → rod + crank (bicycle
pedal beside it) → head, valves, cams, springs, plug → intake (injector mist) → compression (~10×) → power (20,000+ V spark,
2,000 °C+, a few tonnes) → exhaust → 2 turns, 1 power stroke → four cylinders take turns 1-3-4-2 → flywheel, gearbox,
wheel → rev to 3,000 rpm (100 reversals/s, 25 sparks/s per cylinder) → ~⅔ of the fuel's energy is heat → Otto 1876 (sepia)
→ Orbi ad: a 12.4 GB video cut into 12 parts, 3 at once, signal drops and resumes, phone → laptop (real orbitransfer.com
captures), no login/app, locked on the phone, 30-min burn → end card.
Sound: `engine_sfx.py` → `extra.wav` (engine hum following the crank, revs to a real 3,000 rpm, valve clicks, spark crack,
boom, piston clank, intake/exhaust whoosh, laser buzz, flywheel whirr, heat crackle, projector + chuff, Orbi whooshes),
mixed by `kit/synth.py` with music + voice.
Rebuild: `node shots capture: node cap.cjs` · voice `kit/vo.py` · `RS=0.5 node kit/render.cjs still …` · 4 × `node kit/render.cjs a b frames`
· dump crank.json (window.crankG) · `python3 engine_sfx.py && python3 make_events.py && EXTRA_GAIN=1.3 python3 kit/synth.py` · ffmpeg.
