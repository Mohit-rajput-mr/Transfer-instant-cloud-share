# Your bank doesn't know your password (87 s, 1080×1920) · educational, ends on Orbi

Hook: the site never stores your password → a hash "blender" (real SHA-256 values on screen) → same in, same out;
one letter changes everything → one way (no un-blending a smoothie) → login compares scrambles → salt → stolen lists:
thieves guess common passwords ("123456") → slow hashing on purpose (if one try = 0.3 s, a million ≈ 3.5 days) →
Orbi: the passcode never leaves the phone, 310,000 rounds (PBKDF2), the server keeps only a hash of a proof, 12 wrong tries lock.
Built on the anon-film engine (same people, grid, cards, subtitles, voice pipeline).
