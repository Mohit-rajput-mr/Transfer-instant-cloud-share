# How a QR code works (66 s, 1080×1920) · educational, not Orbi

`HowQRCodesWork.mp4` · cover `cover.jpg`. A café table, one printed QR code and a cup of coffee:
origin (1994, Japanese car-parts maker, barcodes too small) → three finder squares (where · size · up) → grid of
1s and 0s → zigzag reading order from the bottom right, two columns at a time → one of 8 masks breaks up blank patches →
coffee spill, still scans → error correction (level H, ~30%) → sizes 21×21 up to 177×177 (over 7,000 digits).

The code on screen is real (`qrmake.cjs` → `qr.json`: "NOW YOU KNOW", level H, version 2, mask 1, true reading order).
The stain covers 15% of the data modules and a real decoder (jsQR) still reads it.
Voice: Chatterbox with emotion, word-checked by faster-whisper (`vo.py`, `tempo.py 1.06`). No Orbi branding.
