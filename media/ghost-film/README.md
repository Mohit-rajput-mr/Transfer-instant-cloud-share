# How hackers stay invisible (83 s, 1080×1920) · educational, ends on Orbi

`HowHackersStayInvisible.mp4` · cover `cover.jpg`. A hooded figure on a dark neon grid:
the trail (your IP address = a return address on every message, browser fingerprint, a photo's hidden GPS) →
a VPN hides you from the site but the VPN still sees you → Tor: three layers of encryption, three relays, each peels one
(the first knows you, not where you go; the last knows the site, not you) → people get caught by small mistakes
(reused username, logged-in account, location on), almost never by the math.

Orbi ending (claims checked in the code): no account, email or name (`lib/crypto.ts`: the code never leaves the device,
PBKDF2 → AES-256-GCM, the server stores only a hash of a proof, so it can't open the file) · only a salted hash of the
network (`netHash`), never the raw address · private space with a passcode · the file burns in 30 minutes.
Not claimed: "no one knows" (Orbi keeps city-level visit stats). Educational, defensive privacy only.
Phone screens are real captures of orbitransfer.com (`capture.cjs`). Voice: Chatterbox with emotion, word-checked
(`vo.py`, `RESUME=1` continues an interrupted run, then `tempo.py 1.06`).
