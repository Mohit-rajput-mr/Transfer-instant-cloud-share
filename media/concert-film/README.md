# Orbi Transfer — "The concert" (78 s, 1080×1920, house style)

`OrbiTransfer-concert.mp4` · cover `cover.jpg`. Low-poly men and women in a dark arena: you film the encore, every friend
yells "send it to me!", chat and email fail, you drop the clip into Orbi with code "rock" and shout it over the music.
The mechanism as music: the clip locked in a guitar case (the code stays in your hand) → the song breaks into notes that
all fly out at once → the notes wait backstage behind a locked door → a stadium-style light wave rolls over your part of
the city (never your seat) → your friend's code brings the notes back together and the song plays → 30 minutes later the
stage goes dark. Phone screens are real captures (`capture.cjs`, "Encore" video).

Voice: **Chatterbox** (expressive, emotion per line) cloned from the house George voice (`ref_george.wav`), every take
checked word-for-word by faster-whisper (`vo.py`). Sound cues come from the voice timings (`make_events.py` → `events.json`).
Rebuild: see `../VIDEO_PLAYBOOK.md`.
