"use client";

// A small picture of what is inside, made in the sender's browser before the file goes out (like a chat
// app's photo preview): a photo itself, a video's opening frame, a PDF's first page. 240×240 JPEG, ~10 KB.
// Only for objects sent without a password: a locked object never shows what is inside before it is opened.

const SIZE = 240;
const TIMEOUT = 6000;

export type PreviewKind = "image" | "video" | "pdf";
export function previewKind(file: File): PreviewKind | null {
  const t = file.type, n = file.name.toLowerCase();
  if (/^image\/(jpeg|png|gif|webp|avif|bmp)$/.test(t) || /\.(jpe?g|png|gif|webp|avif|bmp)$/.test(n)) return "image";
  if (/^video\/(mp4|webm|quicktime|ogg)$/.test(t) || /\.(mp4|m4v|webm|mov)$/.test(n)) return "video";
  if (t === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  return null;
}

/** draw `src` into a square, cropped to fill (from the top for documents, the middle for pictures) */
function square(src: CanvasImageSource, w: number, h: number, top: boolean) {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const g = c.getContext("2d")!;
  const s = Math.min(w, h);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, SIZE, SIZE);
  g.drawImage(src, (w - s) / 2, top ? 0 : (h - s) / 2, s, s, 0, 0, SIZE, SIZE);
  return new Promise<Blob | null>((ok) => c.toBlob((b) => ok(b), "image/jpeg", 0.72));
}

async function fromImage(file: File) {
  const bmp = await createImageBitmap(file);
  try {
    return await square(bmp, bmp.width, bmp.height, false);
  } finally {
    bmp.close();
  }
}

function fromVideo(file: File) {
  return new Promise<Blob | null>((ok) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (b: Blob | null) => {
      URL.revokeObjectURL(url);
      v.removeAttribute("src");
      v.load();
      ok(b);
    };
    const t = setTimeout(() => done(null), TIMEOUT);
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.onloadedmetadata = () => {
      // a moment in, past a black first frame
      v.currentTime = Math.min(1, (v.duration || 0) * 0.1);
    };
    v.onseeked = async () => {
      clearTimeout(t);
      done(v.videoWidth ? await square(v, v.videoWidth, v.videoHeight, false) : null);
    };
    v.onerror = () => {
      clearTimeout(t);
      done(null);
    };
    v.src = url;
  });
}

async function fromPdf(file: File) {
  // the PDF reader loads only when a PDF is sent
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.slice(0, 64 * 1024 * 1024).arrayBuffer()) }).promise;
  try {
    const page = await doc.getPage(1);
    const vp1 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: (SIZE * 1.5) / Math.min(vp1.width, vp1.height) });
    const c = document.createElement("canvas");
    c.width = Math.ceil(vp.width);
    c.height = Math.ceil(vp.height);
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
    return await square(c, c.width, c.height, true);
  } finally {
    void doc.destroy();
  }
}

/** a preview for this file, or null (unsupported type, too big to read quickly, or it failed) */
export async function makePreview(file: File): Promise<Blob | null> {
  const kind = previewKind(file);
  if (!kind) return null;
  if (kind === "image" && file.size > 60 * 1024 * 1024) return null;
  const run = kind === "image" ? fromImage(file) : kind === "video" ? fromVideo(file) : fromPdf(file);
  const timeout = new Promise<null>((ok) => setTimeout(() => ok(null), TIMEOUT));
  try {
    const b = await Promise.race([run, timeout]);
    return b && b.size <= 64 * 1024 ? b : null;
  } catch {
    return null;
  }
}

/** where a preview is served from */
export const previewUrl = (id: string) => `/api/transfers/${id}/thumb`;
