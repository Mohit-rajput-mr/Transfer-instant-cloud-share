# Orbi Transfer — "The party" (89 s, 1080×1920, house style) · AirDrop vs Orbi

`OrbiTransfer-party.mp4` · cover `cover.jpg`. One house party: you film the best moment, everyone yells "NOW!", AirDrop
only shows the iPhones (Leo's Android "not found", the Windows DJ laptop never appears, the toggle needs
"Everyone · 10 min"). One send in Orbi with code "disco" and every phone in the room lights up, Android and laptop too.
No app, no login.

Under the layers (not the usual 2–3 claims):
- **Same Wi-Fi → "Nearby"**: the house router; the server keeps only a scrambled network fingerprint (`#a4f2c9`), never the address.
- **Live room**: the page keeps a line open; one note rings through it to every phone in about a second.
- **Speed**: the file goes up in parts, 3 at a time; a dropped part goes again alone; downloads pull 4 streams.
- **Lock**: the code is stirred 310,000× into a key (PBKDF2); 12 wrong tries lock the file; it burns in 30 minutes.

Honesty notes: no "within the city" wording; the film shows one house and the true same-Wi-Fi "Nearby" badge.
AirDrop facts (2026): Android interop only on some phones, only in "Everyone for 10 minutes", Windows not at all.
No claim that Orbi is faster than AirDrop.

Voice: Chatterbox (emotion per line) cloned from the house George voice, checked word-for-word by faster-whisper
(`vo.py`, then `tempo.py 1.06`). Phone screens are real captures (`capture.cjs`). Rebuild: see `../VIDEO_PLAYBOOK.md`.
