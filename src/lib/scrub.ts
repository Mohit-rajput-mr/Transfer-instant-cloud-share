"use client";
// Anonymous sends (lib/anon.ts): what a photo says about where and when it was taken is removed before it is
// encrypted. JPEG loses Exif/XMP (APP1), IPTC (APP13), comments and vendor blocks, keeping only the rotation;
// PNG loses its eXIf and text chunks. Every file is re-wrapped, so its "last modified" becomes the send time.
// Nothing is copied whole: the cleaned head is joined to a slice of the original.
import { isFolder, type Item } from "./bundle";

const JPEG_HEAD = 1024 * 1024; // markers before the image data never run longer than this in practice
const PNG_DROP = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);
// formats with metadata Orbi can't take out: sent as they are, and named in the warning
const AS_IS = /\.(heic|heif|webp|avif|tiff?|dng|cr2|cr3|nef|arw|orf|rw2|raf|pdf|docx?|xlsx?|pptx?|odt|ods|odp|pages|key|numbers)$/i;

const isJpeg = (f: File) => f.type === "image/jpeg" || /\.jpe?g$/i.test(f.name);
const isPng = (f: File) => f.type === "image/png" || /\.png$/i.test(f.name);
const carriesMeta = (f: File) => /^(image|video|audio)\//.test(f.type) || AS_IS.test(f.name);

/** the rotation from an Exif block (1 when there is none or it can't be read) */
function orientation(b: Uint8Array, s: number, e: number): number {
  // "Exif\0\0" then a TIFF header
  if (e - s < 14 || String.fromCharCode(...b.subarray(s, s + 4)) !== "Exif") return 1;
  const t = s + 6;
  const le = b[t] === 0x49;
  const v = new DataView(b.buffer, b.byteOffset);
  const u16 = (o: number) => v.getUint16(o, le);
  const u32 = (o: number) => v.getUint32(o, le);
  const ifd = t + u32(t + 4);
  if (ifd + 2 > e) return 1;
  const n = u16(ifd);
  for (let i = 0; i < n; i++) {
    const at = ifd + 2 + i * 12;
    if (at + 12 > e) break;
    if (u16(at) === 0x0112) return u16(at + 8) || 1;
  }
  return 1;
}

/** an APP1 holding nothing but the rotation (34 bytes after the marker), so photos don't turn sideways */
function orientationApp1(o: number) {
  return new Uint8Array([
    0xff, 0xe1, 0x00, 0x22,
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // Exif\0\0
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // MM, 42, IFD0 at 8
    0x00, 0x01, // one entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, o & 0xff, 0x00, 0x00, // Orientation, SHORT, 1, value
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ]);
}

async function cleanJpeg(f: File): Promise<Blob> {
  const b = new Uint8Array(await f.slice(0, JPEG_HEAD).arrayBuffer());
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error("not a jpeg");
  const keep: Uint8Array[] = [b.subarray(0, 2)];
  let rot = 1;
  let afterApp0 = 1; // where the rotation block goes: right after SOI, or after a leading APP0 (JFIF wants to be first)
  let p = 2;
  for (;;) {
    if (p + 4 > b.length) throw new Error("no image data in the first megabyte");
    if (b[p] !== 0xff) throw new Error("bad marker");
    const m = b[p + 1];
    if (m === 0xff) {
      p++; // fill byte
      continue;
    }
    if (m === 0xda) break; // SOS: the image data starts here
    if ((m >= 0xd0 && m <= 0xd7) || m === 0x01) {
      keep.push(b.subarray(p, p + 2));
      p += 2;
      continue;
    }
    const end = p + 2 + ((b[p + 2] << 8) | b[p + 3]);
    if (end > b.length) throw new Error("segment past the first megabyte");
    const app = m >= 0xe0 && m <= 0xef;
    if (m === 0xe1 && rot === 1) rot = orientation(b, p + 4, end);
    // APP0 (JFIF), APP2 (ICC colour) and APP14 (Adobe colour transform) stay; every other APPn and COM go
    if ((app && m !== 0xe0 && m !== 0xe2 && m !== 0xee) || m === 0xfe) {
      p = end;
      continue;
    }
    keep.push(b.subarray(p, end));
    if (m === 0xe0 && keep.length === 2) afterApp0 = 2;
    p = end;
  }
  if (rot !== 1 && rot <= 8) keep.splice(afterApp0, 0, orientationApp1(rot));
  return new Blob([...keep.map((x) => x.slice()), f.slice(p)], { type: f.type || "image/jpeg" });
}

async function cleanPng(f: File): Promise<Blob> {
  const sig = new Uint8Array(await f.slice(0, 8).arrayBuffer());
  if (sig[0] !== 0x89 || sig[1] !== 0x50 || sig[2] !== 0x4e || sig[3] !== 0x47) throw new Error("not a png");
  const parts: Blob[] = [f.slice(0, 8)];
  let p = 8;
  while (p + 12 <= f.size) {
    const h = new DataView(await f.slice(p, p + 8).arrayBuffer());
    const len = h.getUint32(0);
    const type = String.fromCharCode(h.getUint8(4), h.getUint8(5), h.getUint8(6), h.getUint8(7));
    const end = p + 12 + len;
    if (end > f.size) throw new Error("chunk past the end");
    if (!PNG_DROP.has(type)) parts.push(f.slice(p, end));
    p = end;
    if (type === "IEND") break;
  }
  return new Blob(parts, { type: f.type || "image/png" });
}

/** one file, cleaned and re-wrapped (asIs: it was sent as it is) */
async function scrubFile(f: File): Promise<{ file: File; asIs: boolean }> {
  const wrap = (b: Blob) => new File([b], f.name, { type: f.type });
  try {
    if (isJpeg(f)) return { file: wrap(await cleanJpeg(f)), asIs: false };
    if (isPng(f)) return { file: wrap(await cleanPng(f)), asIs: false };
  } catch {
    // can't be read: the original goes, and the warning names it
    return { file: wrap(f), asIs: true };
  }
  return { file: wrap(f), asIs: carriesMeta(f) };
}

/** Every file in a send (files inside folders too), cleaned of what it says about where and when. */
export async function scrubItems(items: Item[]): Promise<{ items: Item[]; asIs: string[] }> {
  const asIs: string[] = [];
  const out = await Promise.all(
    items.map(async (it) => {
      if (!isFolder(it)) {
        const r = await scrubFile(it);
        if (r.asIs) asIs.push(it.name);
        return r.file;
      }
      const entries = await Promise.all(
        it.entries.map(async (e) => {
          const r = await scrubFile(e.file);
          if (r.asIs) asIs.push(e.path.split("/").pop() || e.path);
          return { ...e, file: r.file };
        }),
      );
      return { ...it, entries };
    }),
  );
  return { items: out, asIs };
}

// ---- "Hide file names": what a send is called when its names stay inside ----

const kindOf = (f: File) => {
  const t = f.type, n = f.name.toLowerCase();
  if (t.startsWith("image/")) return "photo";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  if (t === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (t === "text/plain" || t === "text/x-orbit-link") return "note";
  return "file";
};

/** the ball's title: "Photo", "Video", "Audio", "PDF", "Note", "File", "Folder" or "N files" */
export function genericTitle(single: File | null, folder: boolean, count: number) {
  if (folder) return "Folder";
  if (!single) return `${count} files`;
  return { photo: "Photo", video: "Video", audio: "Audio", pdf: "PDF", note: "Note", file: "File" }[kindOf(single)];
}

/** the file name sent: photo.jpg, video.mp4, document.pdf, note.txt, file.<ext> or folder */
export function genericFileName(f: File) {
  if (f.type === "application/x-orbit-folder") return "folder";
  const k = kindOf(f);
  const ext = /\.([a-z0-9]{1,5})$/i.exec(f.name)?.[1]?.toLowerCase();
  if (k === "photo") return isJpeg(f) || !ext ? "photo.jpg" : `photo.${ext}`;
  if (k === "video") return ext && ext !== "mp4" ? `video.${ext}` : "video.mp4";
  if (k === "pdf") return "document.pdf";
  if (k === "note") return f.type === "text/x-orbit-link" ? "link.url" : "note.txt";
  return ext ? `file.${ext}` : "file";
}
