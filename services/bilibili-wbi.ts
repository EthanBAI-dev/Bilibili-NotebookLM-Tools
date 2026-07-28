/**
 * Bilibili WBI request signing.
 *
 * Some endpoints (notably `x/player/wbi/playurl`, which is how we reach a
 * video's audio stream) reject unsigned requests. The signature is derived
 * from two rotating keys published in the `nav` response: concatenate them,
 * shuffle the characters through a fixed permutation table, truncate to 32
 * chars, then MD5 the sorted query string with that mixin key appended.
 */

import { md5 } from '@/lib/md5';

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

export interface WbiKeys {
  imgKey: string;
  subKey: string;
}

export function getMixinKey(imgKey: string, subKey: string): string {
  const raw = imgKey + subKey;
  let mixin = '';
  for (const index of MIXIN_KEY_ENC_TAB) {
    mixin += raw[index] ?? '';
  }
  return mixin.slice(0, 32);
}

/** Strip a wbi_img URL down to the bare key: `.../7cd084941338484aae1ad9425b84077c.png` → the hex. */
function keyFromUrl(url: string): string {
  return url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
}

const KEYS_TTL_MS = 10 * 60 * 1000;
let cachedKeys: WbiKeys | null = null;
let cachedKeysAt = 0;

export async function getWbiKeys(): Promise<WbiKeys> {
  const now = Date.now();
  if (cachedKeys && now - cachedKeysAt < KEYS_TTL_MS) return cachedKeys;

  const resp = await fetch('https://api.bilibili.com/x/web-interface/nav', {
    credentials: 'include',
    headers: { Referer: 'https://www.bilibili.com' },
  });
  if (!resp.ok) throw new Error(`WBI nav HTTP ${resp.status}`);

  // `nav` answers code -101 for logged-out users but still carries wbi_img,
  // so the presence of the keys is the success condition here, not code === 0.
  const json = (await resp.json()) as { data?: { wbi_img?: { img_url?: string; sub_url?: string } } };
  const imgUrl = json?.data?.wbi_img?.img_url;
  const subUrl = json?.data?.wbi_img?.sub_url;
  if (!imgUrl || !subUrl) throw new Error('无法获取 WBI 签名密钥');

  cachedKeys = { imgKey: keyFromUrl(imgUrl), subKey: keyFromUrl(subUrl) };
  cachedKeysAt = now;
  return cachedKeys;
}

/** Build a signed query string (without the leading `?`). */
export function signWbiParams(
  params: Record<string, string | number>,
  keys: WbiKeys,
  nowSeconds: number = Math.round(Date.now() / 1000),
): string {
  const mixinKey = getMixinKey(keys.imgKey, keys.subKey);
  const signed: Record<string, string | number> = { ...params, wts: nowSeconds };

  const query = Object.keys(signed)
    .sort()
    .map((key) => {
      // Bilibili strips these characters from values before hashing; encoding
      // them instead produces a signature the server rejects.
      const value = String(signed[key]).replace(/[!'()*]/g, '');
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');

  return `${query}&w_rid=${md5(query + mixinKey)}`;
}

/** Fetch the current keys and sign `params` with them. */
export async function encodeWbi(params: Record<string, string | number>): Promise<string> {
  return signWbiParams(params, await getWbiKeys());
}
