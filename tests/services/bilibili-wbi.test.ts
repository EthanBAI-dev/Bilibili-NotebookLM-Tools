import { describe, it, expect } from 'vitest';
import { getMixinKey, signWbiParams } from '@/services/bilibili-wbi';

// Worked example published in bilibili-API-collect's WBI documentation.
const IMG_KEY = '7cd084941338484aae1ad9425b84077c';
const SUB_KEY = '4932caff0ff746eab6f01bf08b70ac45';

describe('bilibili WBI signing', () => {
  it('derives the documented mixin key', () => {
    expect(getMixinKey(IMG_KEY, SUB_KEY)).toBe('ea1db124af3c7062474693fa704f4ff8');
  });

  it('produces the documented signature', () => {
    const query = signWbiParams(
      { foo: '114', bar: '514', zab: 1919810 },
      { imgKey: IMG_KEY, subKey: SUB_KEY },
      1702204169,
    );
    expect(query).toBe('bar=514&foo=114&wts=1702204169&zab=1919810&w_rid=8f6f2b5b3d485fe1886cec6a0be8c5d4');
  });

  it('sorts params and appends wts before hashing', () => {
    const query = signWbiParams({ zzz: 1, aaa: 2 }, { imgKey: IMG_KEY, subKey: SUB_KEY }, 1700000000);
    expect(query.startsWith('aaa=2&wts=1700000000&zzz=1&w_rid=')).toBe(true);
  });
});
