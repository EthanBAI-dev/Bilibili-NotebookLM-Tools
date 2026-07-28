/**
 * MD5 (RFC 1321).
 *
 * Needed only for Bilibili's WBI request signature, which hardcodes MD5.
 * Web Crypto deliberately omits MD5, so this is a from-scratch implementation
 * rather than a `crypto.subtle` call. Do not use it for anything security
 * bearing — MD5 is broken for collision resistance.
 */

const SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

/** K[i] = floor(abs(sin(i + 1)) * 2^32) */
const K = (() => {
  const table = new Int32Array(64);
  for (let i = 0; i < 64; i++) {
    table[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
  }
  return table;
})();

function wordToHexLittleEndian(word: number): string {
  let hex = '';
  for (let i = 0; i < 4; i++) {
    hex += ((word >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
  }
  return hex;
}

export function md5(input: string): string {
  const message = new TextEncoder().encode(input);
  const messageLength = message.length;

  // Append 0x80, pad with zeros to 56 mod 64, then 8 bytes of bit length.
  const withTerminator = messageLength + 1;
  const zeroPadding = (56 - (withTerminator % 64) + 64) % 64;
  const totalLength = withTerminator + zeroPadding + 8;

  const buffer = new Uint8Array(totalLength);
  buffer.set(message);
  buffer[messageLength] = 0x80;

  const view = new DataView(buffer.buffer);
  const bitLength = messageLength * 8;
  view.setUint32(totalLength - 8, bitLength >>> 0, true);
  view.setUint32(totalLength - 4, Math.floor(bitLength / 4294967296), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const chunk = new Int32Array(16);
  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      chunk[i] = view.getInt32(offset + i * 4, true);
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }

      f = (f + a + K[i] + chunk[g]) | 0;
      a = d;
      d = c;
      c = b;
      b = (b + ((f << SHIFTS[i]) | (f >>> (32 - SHIFTS[i])))) | 0;
    }

    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  return (
    wordToHexLittleEndian(a0) +
    wordToHexLittleEndian(b0) +
    wordToHexLittleEndian(c0) +
    wordToHexLittleEndian(d0)
  );
}
