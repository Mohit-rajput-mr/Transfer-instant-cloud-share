"use client";
import { Zip, ZipPassThrough } from "fflate";

export interface Entry {
  path: string;
  file: File;
}

export interface Folder {
  name: string;
  entries: Entry[];
}

export const LINK_MIME = "text/x-orbit-link";
export const INLINE_MAX = 256 * 1024; // text/links up to this size open in the card instead of downloading

const URL_RE = /^(https?:\/\/|www\.)[^\s]+$/i;

// Text or a link becomes a tiny file; links get their own type so the receiver can open them directly.
export function textToFile(text: string): File {
  const t = text.trim();
  if (URL_RE.test(t)) {
    const url = t.startsWith("www.") ? `https://${t}` : t;
    let host = "link";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {}
    return new File([url], `${host}.url`, { type: LINK_MIME });
  }
  return new File([t], "note.txt", { type: "text/plain" });
}

export const isLinkText = (text: string) => URL_RE.test(text.trim());

// ---------------------------------------------------------------------------------------------
// Folder transfer, no zipping on the sender.
// A folder travels as ONE object: [magic "OBD1"][u32 manifest length][manifest JSON][file bytes…].
// The Blob is composed from the original File handles, so nothing is read or copied up front;
// encryption streams through it like any other file. The receiver parses the stream as it decrypts
// and writes each file straight into a real folder on disk.
export const FOLDER_MIME = "application/x-orbit-folder";
const MAGIC = new TextEncoder().encode("OBD1");

export interface Manifest {
  name: string;
  files: { path: string; size: number; mtime: number }[];
}

export function packFolder(folder: Folder): File {
  const manifest: Manifest = {
    name: folder.name,
    files: folder.entries.map((e) => ({ path: e.path, size: e.file.size, mtime: e.file.lastModified })),
  };
  const json = new TextEncoder().encode(JSON.stringify(manifest));
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, json.length);
  return new File([MAGIC, len, json, ...folder.entries.map((e) => e.file)] as BlobPart[], `${folder.name}.folder`, { type: FOLDER_MIME });
}

/** Where the unpacked files go: a real directory, or a zip for browsers that cannot write folders. */
export interface FolderOutput {
  open(path: string, mtime: number): Promise<void>;
  data(bytes: Uint8Array): Promise<void>;
  close(): Promise<void>;
  finish(name: string): Promise<void>;
  abort(): Promise<void>;
}

export type DirHandle = {
  name: string;
  getDirectoryHandle(n: string, o?: { create?: boolean }): Promise<DirHandle>;
  getFileHandle(n: string, o?: { create?: boolean }): Promise<{ createWritable(): Promise<{ write(d: BufferSource): Promise<void>; close(): Promise<void>; abort(): Promise<void> }> }>;
  queryPermission?(o: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(o: { mode: "readwrite" }): Promise<PermissionState>;
};
type PickerWindow = Window & {
  showDirectoryPicker?: (o?: { mode?: "readwrite"; id?: string; startIn?: string }) => Promise<DirHandle>;
};

export const canWriteFolders = () => typeof window !== "undefined" && !!(window as PickerWindow).showDirectoryPicker;

export type FolderPick = { handle: DirHandle } | { cancelled: true } | { unsupported: true };

/** Must be called from a click. Opens the folder picker; the received folder is created inside the pick. */
export async function pickFolderTarget(): Promise<FolderPick> {
  const w = window as PickerWindow;
  if (!w.showDirectoryPicker) return { unsupported: true };
  try {
    return { handle: await w.showDirectoryPicker({ mode: "readwrite", id: "orbit-receive" }) };
  } catch {
    return { cancelled: true };
  }
}

const safe = (part: string) => part.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/^\.+$/, "_").slice(0, 200) || "_";

async function freshDir(parent: DirHandle, name: string): Promise<DirHandle> {
  for (let i = 1; i < 100; i++) {
    const candidate = i === 1 ? name : `${name} (${i})`;
    try {
      await parent.getDirectoryHandle(candidate); // exists → try the next name
    } catch {
      return parent.getDirectoryHandle(candidate, { create: true });
    }
  }
  return parent.getDirectoryHandle(`${name} ${Date.now()}`, { create: true });
}

export function directoryOutput(parent: DirHandle, name: string): FolderOutput {
  let root: Promise<DirHandle> | null = null;
  let w: Awaited<ReturnType<Awaited<ReturnType<DirHandle["getFileHandle"]>>["createWritable"]>> | null = null;
  const dirs = new Map<string, Promise<DirHandle>>();
  const dir = (path: string[]): Promise<DirHandle> => {
    const key = path.join("/");
    if (!dirs.has(key))
      dirs.set(key, path.length ? dir(path.slice(0, -1)).then((d) => d.getDirectoryHandle(path[path.length - 1], { create: true })) : (root ??= freshDir(parent, safe(name))));
    return dirs.get(key)!;
  };
  return {
    async open(path) {
      const parts = path.split("/").filter(Boolean).map(safe);
      const d = await dir(parts.slice(0, -1));
      w = await (await d.getFileHandle(parts[parts.length - 1] || "file", { create: true })).createWritable();
    },
    async data(bytes) {
      await w!.write(bytes as BufferSource);
    },
    async close() {
      await w?.close();
      w = null;
    },
    async finish() {},
    async abort() {
      await w?.abort().catch(() => {});
    },
  };
}

// Fallback: stream the files into a stored zip. The caller decides how it is saved
// (auto-download on desktop; on phones the user picks where it goes).
export function zipOutput(name: string, done: (zip: File) => void): FolderOutput {
  const parts: Uint8Array[] = [];
  const zip = new Zip((err, chunk) => {
    if (!err) parts.push(chunk);
  });
  let entry: ZipPassThrough | null = null;
  const root = safe(name);
  return {
    async open(path, mtime) {
      entry = new ZipPassThrough(`${root}/${path}`);
      entry.mtime = mtime || Date.now();
      zip.add(entry);
    },
    async data(bytes) {
      entry!.push(bytes);
    },
    async close() {
      entry?.push(new Uint8Array(0), true);
      entry = null;
    },
    async finish() {
      zip.end(); // fflate flushes the central directory synchronously into parts
      done(new File(parts as BlobPart[], `${root}.zip`, { type: "application/zip" }));
      parts.length = 0; // the File owns the bytes now
    },
    async abort() {
      parts.length = 0;
    },
  };
}

/** DownloadSink that unpacks the folder stream on the fly. */
export function folderSink(make: (m: Manifest) => FolderOutput, onManifest?: (m: Manifest) => void) {
  let head = new Uint8Array(0);
  let need = 8;
  let manifest: Manifest | null = null;
  let out: FolderOutput | null = null;
  let idx = 0;
  let left = 0;

  const advance = async () => {
    // open the next file(s); zero-byte files open and close immediately
    while (manifest && idx < manifest.files.length && left === 0) {
      const f = manifest.files[idx];
      await out!.open(f.path, f.mtime);
      if (f.size === 0) {
        await out!.close();
        idx++;
      } else left = f.size;
    }
  };

  return {
    async write(chunk: Uint8Array) {
      let off = 0;
      while (!manifest && off < chunk.length) {
        const take = Math.min(need - head.length, chunk.length - off);
        const next = new Uint8Array(head.length + take);
        next.set(head);
        next.set(chunk.subarray(off, off + take), head.length);
        head = next;
        off += take;
        if (head.length === 8) {
          if (String.fromCharCode(...head.subarray(0, 4)) !== "OBD1") throw new Error("Not an ORBIT folder");
          need = 8 + new DataView(head.buffer).getUint32(4);
        }
        if (head.length === need && need > 8) {
          manifest = JSON.parse(new TextDecoder().decode(head.subarray(8))) as Manifest;
          onManifest?.(manifest);
          out = make(manifest);
          await advance();
        }
      }
      while (manifest && off < chunk.length && idx < manifest.files.length) {
        const take = Math.min(left, chunk.length - off);
        await out!.data(chunk.subarray(off, off + take));
        off += take;
        left -= take;
        if (left === 0) {
          await out!.close();
          idx++;
          await advance();
        }
      }
    },
    async close() {
      if (manifest) await out!.finish(manifest.name);
    },
    async abort() {
      await out?.abort();
    },
  };
}

// From an <input webkitdirectory> selection.
export function folderFromInput(files: File[]): Folder | null {
  if (!files.length || !files[0].webkitRelativePath) return null;
  const name = files[0].webkitRelativePath.split("/")[0] || "folder";
  return {
    name,
    entries: files.map((file) => ({ path: file.webkitRelativePath.split("/").slice(1).join("/") || file.name, file })),
  };
}

type FsEntry = { isFile: boolean; isDirectory: boolean; name: string };
type FsFile = FsEntry & { file(ok: (f: File) => void, err: (e: unknown) => void): void };
type FsDir = FsEntry & { createReader(): { readEntries(ok: (e: FsEntry[]) => void, err: (e: unknown) => void): void } };

async function walk(entry: FsEntry, prefix: string, out: Entry[]) {
  if (entry.isFile) {
    const file = await new Promise<File>((ok, err) => (entry as FsFile).file(ok, err));
    out.push({ path: prefix + file.name, file });
  } else if (entry.isDirectory) {
    const reader = (entry as FsDir).createReader();
    for (;;) {
      const batch = await new Promise<FsEntry[]>((ok, err) => reader.readEntries(ok, err));
      if (!batch.length) break;
      for (const e of batch) await walk(e, `${prefix}${entry.name}/`, out);
    }
  }
}

// Dropped items: plain files stay files; any dropped directory is collected (recursively) as a folder.
export async function fromDrop(dt: DataTransfer): Promise<{ files: File[]; folder: Folder | null }> {
  const items = Array.from(dt.items ?? []).filter((i) => i.kind === "file");
  const entries: (FsEntry | null)[] = items.map((i) => (i.webkitGetAsEntry?.() as unknown as FsEntry | null) ?? null);
  const dirs = entries.filter((e): e is FsEntry => !!e && e.isDirectory);
  if (!dirs.length) return { files: Array.from(dt.files ?? []), folder: null };

  const out: Entry[] = [];
  for (const e of entries) if (e) await walk(e, "", out);
  // strip the shared top-level folder name when exactly one folder was dropped
  const single = dirs.length === 1 && entries.length === 1;
  const name = single ? dirs[0].name : "orbit-bundle";
  return {
    files: [],
    folder: {
      name,
      entries: out.map((e) => ({ ...e, path: single ? e.path.replace(`${name}/`, "") : e.path })),
    },
  };
}
