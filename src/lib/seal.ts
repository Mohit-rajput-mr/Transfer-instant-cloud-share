// Sealing a small secret (an anonymous space's invite) to someone's one-time public key: ECDH P-256 + AES-GCM.
// Only the holder of the private half can open it; a server passing it along sees bytes. Used by the knock
// (lib/space.ts), tested in lib/seal.test.ts.
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
const aesFrom = (priv: CryptoKey, pub: CryptoKey) =>
  crypto.subtle.deriveKey({ name: "ECDH", public: pub }, priv, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);

/** a one-time key pair: share `pub` (base64 raw point), keep `priv` (never leaves this page) */
export async function newSealKey(): Promise<{ pub: string; priv: CryptoKey }> {
  const kp = await crypto.subtle.generateKey(ECDH, false, ["deriveKey"]);
  return { pub: b64(new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey))), priv: kp.privateKey };
}

/** seal a JSON value to `pub`: base64 of [65-byte ephemeral public key | 12-byte iv | ciphertext] */
export async function sealTo(pub: string, value: unknown): Promise<string> {
  const them = await crypto.subtle.importKey("raw", unb64(pub), ECDH, false, []);
  const eph = await crypto.subtle.generateKey(ECDH, true, ["deriveKey"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesFrom(eph.privateKey, them), new TextEncoder().encode(JSON.stringify(value))));
  const ephRaw = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const all = new Uint8Array(ephRaw.length + iv.length + ct.length);
  all.set(ephRaw, 0);
  all.set(iv, ephRaw.length);
  all.set(ct, ephRaw.length + iv.length);
  return b64(all);
}

/** open a sealed box with the private half; throws if it was not sealed to this key or was changed */
export async function openSealed<T>(priv: CryptoKey, box: string): Promise<T> {
  const raw = unb64(box);
  const eph = await crypto.subtle.importKey("raw", raw.slice(0, 65), ECDH, false, []);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(65, 77) }, await aesFrom(priv, eph), raw.slice(77));
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}
