"use client";
// Where a received file goes. Phones and tablets never auto-download: the user picks the place.

export type SaveEnv = {
  /** phone or tablet (incl. iPadOS, which reports a Mac UA): received files are held until the user chooses where they go */
  mobile: boolean;
  ios: boolean;
  ipad: boolean;
  android: boolean;
  /** Blink engine (Chrome, Samsung Internet, Edge, Opera… but never on iOS) */
  chromium: boolean;
  /** in-app browser / Android WebView: saving often fails silently */
  inApp: boolean;
  mac: boolean;
  browser: "safari" | "chrome" | "firefox" | "edge" | "samsung" | "other";
};

type Nav = Navigator & { userAgentData?: { platform?: string } };

const NONE: SaveEnv = { mobile: false, ios: false, ipad: false, android: false, chromium: false, inApp: false, mac: false, browser: "other" };

export function saveEnv(): SaveEnv {
  if (typeof window === "undefined" || typeof navigator === "undefined") return NONE;
  const n = navigator as Nav;
  const ua = n.userAgent || "";
  // iPadOS 13+ asks for desktop sites: UA says "Macintosh" and platform "MacIntel"; only touch gives it away (Macs report 0).
  const ipad = /iPad/.test(ua) || (n.platform === "MacIntel" && n.maxTouchPoints > 1);
  const ios = ipad || /iPhone|iPod/.test(ua);
  const android = /Android/i.test(ua) || n.userAgentData?.platform === "Android";
  const mq = (q: string) => typeof window.matchMedia === "function" && window.matchMedia(q).matches;
  // touch-only screen behind a desktop UA: Android tablet on "desktop site", Windows tablet without keyboard
  const touchOnly = n.maxTouchPoints > 0 && mq("(pointer: coarse)") && !mq("(any-pointer: fine)");
  const chromium = !ios && (!!n.userAgentData || /Chrome\/\d|Chromium\/\d/.test(ua));
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Snapchat|TikTok|musical_ly|Bytedance|LinkedInApp|Pinterest|GSA\/|; ?wv\)/i.test(ua);
  const browser: SaveEnv["browser"] = /EdgiOS|EdgA\/|Edg\//.test(ua) ? "edge" : /SamsungBrowser/.test(ua) ? "samsung"
    : /FxiOS|Firefox\//.test(ua) ? "firefox" : /CriOS|Chrome\//.test(ua) ? "chrome" : /Safari\//.test(ua) ? "safari" : "other";
  return { mobile: ios || android || touchOnly, ios, ipad, android, chromium, inApp, mac: !ios && /Mac OS X/.test(ua), browser };
}

/** Phone or tablet, iPadOS included. */
export const isMobileDevice = () => saveEnv().mobile;

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", jfif: "image/jpeg", pjpeg: "image/jpeg", pjp: "image/jpeg",
  png: "image/png", gif: "image/gif", webp: "image/webp", avif: "image/avif", heic: "image/heic", heif: "image/heif",
  bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff", ico: "image/x-icon",
  mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska",
  "3gp": "video/3gpp", mpg: "video/mpeg", mpeg: "video/mpeg", ogv: "video/ogg", avi: "video/x-msvideo",
  mp3: "audio/mpeg", m4a: "audio/x-m4a", aac: "audio/aac", wav: "audio/wav", flac: "audio/flac",
  ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", weba: "audio/webm", caf: "audio/x-caf",
  pdf: "application/pdf", txt: "text/plain", text: "text/plain", csv: "text/csv", md: "text/markdown",
  json: "application/json", zip: "application/zip", "7z": "application/x-7z-compressed", rar: "application/vnd.rar",
  epub: "application/epub+zip", rtf: "application/rtf",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  key: "application/vnd.apple.keynote", pages: "application/vnd.apple.pages", numbers: "application/vnd.apple.numbers",
  apk: "application/vnd.android.package-archive", ics: "text/calendar", vcf: "text/vcard",
};
// first extension listed wins (image/jpeg → jpg, video/mp4 → mp4, text/plain → txt)
const MIME_EXT: Record<string, string> = Object.fromEntries(Object.entries(EXT_MIME).reverse().map(([e, m]) => [m, e]));
const ALIAS: Record<string, string> = {
  "image/jpg": "image/jpeg", "image/pjpeg": "image/jpeg", "audio/mp3": "audio/mpeg", "audio/x-mp3": "audio/mpeg",
  "audio/mp4": "audio/x-m4a", "audio/m4a": "audio/x-m4a", "audio/x-wav": "audio/wav", "audio/wave": "audio/wav",
  "audio/vnd.wave": "audio/wav", "audio/x-flac": "audio/flac", "video/x-m4v": "video/mp4",
  "application/x-zip-compressed": "application/zip", "application/x-zip": "application/zip",
};
// a blob: URL carrying one of these would run sender-controlled script on our origin if anything ever navigated to it
// (text/xsl is rendered as XML by Blink and WebKit; multipart/ and message/ can be web archives)
const ACTIVE = /html|xml|xsl|javascript|ecmascript|svg|^multipart\/|^message\//;

/** Lower-case extension, or "" (needs a letter, so "Report v2.0" has none). */
export const extOf = (name: string) => (/\.([a-z0-9]*[a-z][a-z0-9]*)$/i.exec(name)?.[1] ?? "").slice(0, 8).toLowerCase();

/** The type a received file is rebuilt with: normalised, never "active", inferred from the extension when missing. */
export function safeMime(sent: string, fileName: string): string {
  const raw = (sent || "").toLowerCase().split(";")[0].trim();
  const m = ALIAS[raw] ?? raw;
  const fromExt = EXT_MIME[extOf(fileName)];
  if (!m || m === "application/octet-stream" || m === "binary/octet-stream" || ACTIVE.test(m) || !/^[a-z]+\/[a-z0-9.+-]+$/.test(m))
    return fromExt ?? "application/octet-stream";
  return m;
}

/** A name every OS and share target accepts; adds the extension when the sender's name had none. */
export function saveName(name: string, mime: string): string {
  let n = (name || "").normalize("NFC")
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "_")
    .replace(/\.{2,}/g, ".") // Android rejects any name containing ".."
    .trim()
    .replace(/^\.+/, "")
    .replace(/[. ]+$/, "");
  if (!n) n = "file";
  if (!extOf(n) && MIME_EXT[mime]) n += `.${MIME_EXT[mime]}`;
  if (n.length > 180) {
    const e = extOf(n);
    n = n.slice(0, 180 - (e ? e.length + 1 : 0)).trimEnd() + (e ? `.${e}` : "");
  }
  return n;
}

// Chromium (Android Chrome, Samsung Internet, Edge, Opera…) shares only these — by extension AND exact type —
// and at most 50 MB in total; anything else rejects with NotAllowedError "Permission denied".
// canShare() checks none of it. Mirrors chromium ShareServiceImpl(.java/.cc) + blink navigator_share.cc.
const CR_EXT = new Set(
  "avif bmp css csv ehtml flac gif htm html ico jfif jpeg jpg m4a m4v mp3 mp4 mpeg mpg oga ogg ogm ogv opus pdf pjp pjpeg png shtm shtml svg svgz text tif tiff txt wav weba webm webp xbm".split(" "),
);
const CR_MIME = new Set([
  "application/pdf", "audio/flac", "audio/mp3", "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/x-m4a",
  "image/avif", "image/bmp", "image/gif", "image/jpeg", "image/png", "image/svg+xml", "image/tiff", "image/webp",
  "image/x-icon", "image/x-ms-bmp", "image/x-xbitmap", "text/comma-separated-values", "text/css", "text/csv",
  "text/html", "text/plain", "video/mp4", "video/mpeg", "video/ogg", "video/webm",
]);
export const CR_SHARE_MAX = 50 * 1024 * 1024;
// WebKit copies the whole file into the page's memory before the sheet opens; past this an iPhone may kill the tab.
export const IOS_SHARE_MAX = 512 * 1024 * 1024;

/** Will the OS share sheet take this file here? (canShare() alone lies on Chromium.) */
export function canShareFile(file: File, env: SaveEnv): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  if (env.android && env.inApp) return false; // Android WebView has no Web Share
  try {
    if (!navigator.canShare({ files: [file] })) return false;
  } catch {
    return false;
  }
  if (env.chromium) return file.size <= CR_SHARE_MAX && CR_EXT.has(extOf(file.name)) && CR_MIME.has(file.type);
  if (env.ios) return file.size <= IOS_SHARE_MAX;
  return true;
}

type Writable = { write(d: Blob): Promise<void>; close(): Promise<void>; abort(): Promise<void> };
type SaveTarget = { name: string; createWritable(): Promise<Writable> };
type PickerWindow = Window & {
  showSaveFilePicker?: (o: { suggestedName?: string; types?: { description?: string; accept: Record<string, string[]> }[] }) => Promise<SaveTarget>;
};

/** Android Chrome 132+ (and any desktop Chromium): the system "save to…" picker exists. */
export const canPickSave = (env: SaveEnv) =>
  typeof window !== "undefined" && !env.ios && !env.inApp && typeof (window as PickerWindow).showSaveFilePicker === "function";

/** Opens the OS share sheet with the file alone. Call synchronously inside the tap (needs transient activation). */
export function shareFile(file: File): Promise<void> {
  try {
    // files only: a title/text rides along as an extra item (iOS "Save to Files" then also writes a .txt)
    return navigator.share({ files: [file] });
  } catch (e) {
    return Promise.reject(e);
  }
}

/** Opens the system "save to…" picker and writes the file there. Call synchronously inside the tap. Resolves with the chosen name. */
export function pickAndWrite(file: File): Promise<string> {
  const w = window as PickerWindow;
  const e = extOf(file.name);
  const types = e && file.type && file.type !== "application/octet-stream" ? [{ description: e.toUpperCase(), accept: { [file.type]: [`.${e}`] } }] : undefined;
  let picked: Promise<SaveTarget>;
  try {
    picked = w.showSaveFilePicker!({ suggestedName: file.name, types });
  } catch (err) {
    return Promise.reject(err);
  }
  return picked.then(async (h) => {
    const out = await h.createWritable();
    try {
      await out.write(file);
      await out.close();
    } catch (err) {
      await out.abort().catch(() => {});
      throw err;
    }
    return h.name;
  });
}

/** Desktop: hand the file to the browser's downloads. */
export function autoDownload(file: File) {
  const href = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = href;
  a.download = file.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 120_000);
}

/** Plain words for where a plain Download lands. */
export function downloadWhere(env: SaveEnv): string {
  const dev = env.ipad ? "iPad" : "iPhone";
  if (env.ios)
    return env.browser === "chrome" ? `Files › On My ${dev} › Chrome`
      : env.browser === "firefox" ? `Files › On My ${dev} › Firefox`
      : env.browser === "edge" ? `Files › On My ${dev} › Edge`
      : "Files › Downloads";
  if (env.android) return "Files › Downloads";
  return "your Downloads folder";
}

/** Keyboard shortcut that opens the browser's downloads list (desktop only). */
export function downloadsShortcut(env: SaveEnv): string | null {
  if (env.mobile) return null;
  if (env.mac) return env.browser === "safari" || env.browser === "chrome" ? "⌥⌘L" : null;
  return env.browser === "chrome" || env.browser === "edge" ? "Ctrl+J" : null;
}

/** "iPhone" / "iPad" / "phone" / "tablet" — for copy like "Decrypted on this iPhone". */
export function deviceNoun(env: SaveEnv): string {
  if (env.ios) return env.ipad ? "iPad" : "iPhone";
  if (typeof window !== "undefined" && Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0) >= 600) return "tablet";
  return env.mobile ? "phone" : "device";
}
