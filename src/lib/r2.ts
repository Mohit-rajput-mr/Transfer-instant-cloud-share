import { AwsClient } from "aws4fetch";

// Cloudflare R2: the encrypted copy of each file, kept for its 5–30 minute life so it can be fetched
// after the sender has left (or when a direct connection is blocked). Browsers move the bytes straight
// to and from R2 through short-lived signed URLs; no file byte passes through this server. Downloads
// from R2 are free, and every object is deleted when its ball burns (plus a 1-day bucket rule as a net).

const ACCOUNT = process.env.R2_ACCOUNT_ID;
const BUCKET = process.env.R2_BUCKET || "orbi-storage";
const client =
  ACCOUNT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
    ? new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" })
    : null;

export const r2On = () => !!client;
const base = () => `https://${ACCOUNT}.r2.cloudflarestorage.com/${BUCKET}`;
export const objectKey = (id: string) => `f/${id}`;
/** the small preview picture of an open object */
export const previewKey = (id: string) => `t/${id}`;

/** A URL that lets a browser do exactly one kind of request on one object, for `seconds`. */
export async function presign(method: "GET" | "PUT", key: string, query: Record<string, string> = {}, seconds = 3600) {
  if (!client) throw new Error("r2 off");
  const u = new URL(`${base()}/${key}`);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  u.searchParams.set("X-Amz-Expires", String(seconds));
  const signed = await client.sign(u.toString(), { method, aws: { signQuery: true } });
  return signed.url;
}

const tag = (xml: string, name: string) => new RegExp(`<${name}>([^<]*)</${name}>`).exec(xml)?.[1] ?? null;

export async function startMultipart(key: string) {
  const r = await client!.fetch(`${base()}/${key}?uploads`, { method: "POST" });
  const id = tag(await r.text(), "UploadId");
  if (!r.ok || !id) throw new Error(`r2 create ${r.status}`);
  return id;
}

export async function completeMultipart(key: string, uploadId: string, etags: string[]) {
  const body = `<CompleteMultipartUpload>${etags.map((e, i) => `<Part><PartNumber>${i + 1}</PartNumber><ETag>${e.replace(/[<>&]/g, "")}</ETag></Part>`).join("")}</CompleteMultipartUpload>`;
  const r = await client!.fetch(`${base()}/${key}?uploadId=${encodeURIComponent(uploadId)}`, { method: "POST", body, headers: { "content-type": "application/xml" } });
  const text = await r.text();
  if (!r.ok || text.includes("<Error>")) throw new Error(`r2 complete ${r.status}`);
}

export async function abortMultipart(key: string, uploadId: string) {
  await client?.fetch(`${base()}/${key}?uploadId=${encodeURIComponent(uploadId)}`, { method: "DELETE" }).catch(() => {});
}

/** Parts already in R2 for an unfinished multipart upload (resume). null: the upload is gone. */
export async function listParts(key: string, uploadId: string): Promise<{ n: number; etag: string }[] | null> {
  const out: { n: number; etag: string }[] = [];
  let marker = "0";
  for (let page = 0; page < 20; page++) {
    const r = await client!.fetch(`${base()}/${key}?uploadId=${encodeURIComponent(uploadId)}&max-parts=1000&part-number-marker=${marker}`);
    if (r.status === 404) return null;
    const xml = await r.text();
    if (!r.ok) throw new Error(`r2 list ${r.status}`);
    for (const m of xml.matchAll(/<Part>([\s\S]*?)<\/Part>/g)) {
      const n = Number(tag(m[1], "PartNumber"));
      const etag = tag(m[1], "ETag");
      if (n && etag) out.push({ n, etag: etag.replace(/&quot;/g, '"') });
    }
    if (tag(xml, "IsTruncated") !== "true") break;
    marker = tag(xml, "NextPartNumberMarker") ?? "0";
  }
  return out;
}

/** Unfinished uploads of one object (a sender who never came back): their parts would otherwise linger. */
export async function abortAllUploads(key: string) {
  if (!client) return;
  const r = await client.fetch(`${base()}?uploads&prefix=${encodeURIComponent(key)}`).catch(() => null);
  if (!r?.ok) return;
  const xml = await r.text();
  const ids = [...xml.matchAll(/<Upload>([\s\S]*?)<\/Upload>/g)].filter((m) => tag(m[1], "Key") === key).map((m) => tag(m[1], "UploadId")).filter(Boolean) as string[];
  await Promise.all(ids.map((u) => abortMultipart(key, u)));
}

/** Size of a stored object, or null when it isn't there (yet). */
export async function storedSize(key: string): Promise<number | null> {
  if (!client) return null;
  const r = await client.fetch(`${base()}/${key}`, { method: "HEAD" }).catch(() => null);
  return r?.ok ? Number(r.headers.get("content-length")) : null;
}

/** Deletes are free on R2; a missing object is fine. */
export async function removeObjects(keys: string[]) {
  if (!client || !keys.length) return;
  await Promise.all(keys.map((k) => client.fetch(`${base()}/${k}`, { method: "DELETE" }).catch(() => null)));
}

/** A small object written by the server itself (preview pictures). */
export async function putObject(key: string, body: ArrayBuffer, type: string) {
  if (!client) throw new Error("r2 off");
  const r = await client.fetch(`${base()}/${key}`, { method: "PUT", body, headers: { "content-type": type } });
  if (!r.ok) throw new Error(`r2 put ${r.status}`);
}
export async function getObject(key: string): Promise<ArrayBuffer | null> {
  if (!client) return null;
  const r = await client.fetch(`${base()}/${key}`).catch(() => null);
  return r?.ok ? r.arrayBuffer() : null;
}
