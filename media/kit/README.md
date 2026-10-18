# Orbi film kit (cheap, fast films without losing quality)

One shared engine for every 3D film. A new film = 3 small files, everything else comes from here.

```
media/<name>/source/
  kit -> ../../kit          (symlink: ln -sfn ../../kit kit)
  film.html                 (copy from password-film; just loads kit/style.css + story.js)
  script.json               [{key, text, emo 0.75–1.2, gap}]  — the voice lines (the story)
  story.js                  sets, props and shots (import { THREE, K } from "./kit/engine.js")
  make_events.py            sound cues from vo/lines.json
```

Pipeline (run inside `<name>/source`):
1. Voice: `/tmp/cb/bin/python kit/vo.py` (Chatterbox George, every take checked by Whisper; `kit/vo.py end` redoes one line).
   Setup once: venv + `pip install --extra-index-url https://download.pytorch.org/whl/cpu chatterbox-tts faster-whisper jiwer soundfile librosa "setuptools<81"`.
2. ONE preview round: `node kit/render.cjs still 2,9,20,… /tmp/x` → contact sheet → fix → full render.
3. Full: 4 × `node kit/render.cjs a b frames` (detached), `python3 make_events.py`, `python3 kit/synth.py`, ffmpeg (see password-film).
   `/tmp/claude-0/fin_pw.sh` shows a one-shot script that waits for the voice, renders, mixes and encodes.

What `K` gives you (engine.js): addWorld/world (sky, fog, light per set) · lowGround, tree, pine, rock, house, cloud, flat, edge,
canvasTex · person(x,z,ry,tint,{sex,parent,phone}) + posePerson modes (phone, film, cheer, watch, walk) · screen() phone screens ·
look/lookV/orbit/overShoulder/project · tags({…}) + tag(), big(), counter(), redX(), timer(), flash() · at/end/fr/prog timing ·
frame(endLine, shots) (subtitles, end card, fades) · ready().
Rule: the kit is plumbing. Every film still invents its own main visual (owner: never the same look twice).
