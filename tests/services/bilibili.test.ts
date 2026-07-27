import { describe, it, expect } from 'vitest';
import {
  detectBilibiliPage,
  isBilibiliUrl,
  parseBilibiliUrl,
  isBilibiliSpaceUrl,
  parseBilibiliSpaceUrl,
  isBilibiliFavUrl,
  parseBilibiliFavUrl,
  isBilibiliCollectionUrl,
  parseBilibiliCollectionUrl,
} from '@/services/bilibili';

describe('bilibili URL detection', () => {
  describe('单个视频 / 分P', () => {
    it('parses a plain video URL', () => {
      expect(detectBilibiliPage('https://www.bilibili.com/video/BV1xx411c7mD')).toEqual({
        kind: 'video',
        bvid: 'BV1xx411c7mD',
        page: 1,
      });
    });

    it('parses the 分P index from ?p=', () => {
      expect(detectBilibiliPage('https://www.bilibili.com/video/BV1xx411c7mD?p=7')).toEqual({
        kind: 'video',
        bvid: 'BV1xx411c7mD',
        page: 7,
      });
    });

    it('tolerates a trailing slash and extra query params', () => {
      expect(detectBilibiliPage('https://www.bilibili.com/video/BV1xx411c7mD/?spm_id_from=333.999&vd_source=abc')).toEqual({
        kind: 'video',
        bvid: 'BV1xx411c7mD',
        page: 1,
      });
    });

    it('accepts legacy av ids', () => {
      expect(detectBilibiliPage('https://www.bilibili.com/video/av170001')).toEqual({
        kind: 'video',
        bvid: 'av170001',
        page: 1,
      });
    });

    it('falls back to page 1 for a garbage ?p=', () => {
      expect(detectBilibiliPage('https://www.bilibili.com/video/BV1xx411c7mD?p=abc')).toMatchObject({ page: 1 });
      expect(detectBilibiliPage('https://www.bilibili.com/video/BV1xx411c7mD?p=0')).toMatchObject({ page: 1 });
    });
  });

  describe('合集 / 系列', () => {
    // Regression: 合集 links live under space.bilibili.com and used to be
    // swallowed by the UP主 space pattern, which dropped the season id and
    // fetched the uploader's entire upload list instead.
    it('parses a 合集 link as a collection, not a space', () => {
      const url = 'https://space.bilibili.com/521041866/lists/2851266?type=season';
      expect(detectBilibiliPage(url)).toEqual({ kind: 'collection', mid: '521041866', sid: '2851266' });
      expect(isBilibiliCollectionUrl(url)).toBe(true);
      expect(isBilibiliSpaceUrl(url)).toBe(false);
      expect(parseBilibiliCollectionUrl(url)).toEqual({ mid: '521041866', sid: '2851266' });
    });

    it('parses the 系列 variant the same way', () => {
      expect(detectBilibiliPage('https://space.bilibili.com/521041866/lists/2851266?type=series')).toEqual({
        kind: 'collection',
        mid: '521041866',
        sid: '2851266',
      });
    });
  });

  describe('UP主主页', () => {
    it('matches the space root', () => {
      expect(detectBilibiliPage('https://space.bilibili.com/521041866')).toEqual({ kind: 'space', mid: '521041866' });
      expect(parseBilibiliSpaceUrl('https://space.bilibili.com/521041866')).toBe('521041866');
    });

    it('matches the 投稿 tab', () => {
      expect(detectBilibiliPage('https://space.bilibili.com/521041866/video')).toEqual({ kind: 'space', mid: '521041866' });
      expect(detectBilibiliPage('https://space.bilibili.com/521041866/upload/video')).toBeNull();
    });

    // Regression: the old pattern matched any space.bilibili.com/{digits} path,
    // so these all fetched an upload list that the page never showed.
    it('does not claim non-video space tabs', () => {
      expect(detectBilibiliPage('https://space.bilibili.com/521041866/dynamic')).toBeNull();
      expect(detectBilibiliPage('https://space.bilibili.com/521041866/article')).toBeNull();
      expect(detectBilibiliPage('https://space.bilibili.com/521041866/lists')).toBeNull();
      expect(isBilibiliSpaceUrl('https://space.bilibili.com/521041866/dynamic')).toBe(false);
    });
  });

  describe('收藏夹 / 媒体列表 / 稍后再看', () => {
    it('parses the 收藏夹 page as actually browsed on the web', () => {
      const url = 'https://space.bilibili.com/521041866/favlist?fid=3115512866&ftype=create';
      expect(detectBilibiliPage(url)).toEqual({ kind: 'favorite', favType: 'fav', id: '3115512866' });
      expect(isBilibiliFavUrl(url)).toBe(true);
      expect(isBilibiliSpaceUrl(url)).toBe(false);
    });

    it('parses the bare /favlist?fid= variant', () => {
      expect(detectBilibiliPage('https://www.bilibili.com/favlist?fid=3115512866')).toEqual({
        kind: 'favorite',
        favType: 'fav',
        id: '3115512866',
      });
    });

    it('parses both medialist forms', () => {
      expect(detectBilibiliPage('https://www.bilibili.com/medialist/play/ml3115512866')).toEqual({
        kind: 'favorite',
        favType: 'ml',
        id: '3115512866',
      });
      expect(detectBilibiliPage('https://www.bilibili.com/medialist/detail/ml3115512866')).toEqual({
        kind: 'favorite',
        favType: 'ml',
        id: '3115512866',
      });
    });

    it('parses the /list/ forms', () => {
      expect(detectBilibiliPage('https://www.bilibili.com/list/fav/3115512866')).toMatchObject({ favType: 'fav', id: '3115512866' });
      expect(detectBilibiliPage('https://www.bilibili.com/list/ml3115512866')).toMatchObject({ favType: 'ml', id: '3115512866' });
    });

    it('parses 稍后再看', () => {
      expect(detectBilibiliPage('https://www.bilibili.com/list/watchlater')).toEqual({
        kind: 'favorite',
        favType: 'watchlater',
        id: null,
      });
      expect(parseBilibiliFavUrl('https://www.bilibili.com/list/watchlater')).toEqual({ type: 'watchlater', id: null });
    });

    it('ignores a 收藏夹 page with no folder selected', () => {
      expect(detectBilibiliPage('https://space.bilibili.com/521041866/favlist')).toBeNull();
    });
  });

  describe('非视频来源', () => {
    it('rejects unrelated hosts and lookalike domains', () => {
      expect(detectBilibiliPage('https://example.com/video/BV1xx411c7mD')).toBeNull();
      expect(detectBilibiliPage('https://notbilibili.com/video/BV1xx411c7mD')).toBeNull();
      expect(detectBilibiliPage('not a url')).toBeNull();
    });

    it('rejects other Bilibili surfaces', () => {
      expect(detectBilibiliPage('https://search.bilibili.com/all?keyword=test')).toBeNull();
      expect(detectBilibiliPage('https://live.bilibili.com/12345')).toBeNull();
      expect(detectBilibiliPage('https://www.bilibili.com/bangumi/play/ep123')).toBeNull();
    });
  });

  describe('derived helpers agree with detectBilibiliPage', () => {
    const cases: [string, boolean][] = [
      ['https://www.bilibili.com/video/BV1xx411c7mD', true],
      ['https://space.bilibili.com/521041866', false],
      ['https://space.bilibili.com/521041866/lists/2851266?type=season', false],
      ['https://www.bilibili.com/list/watchlater', false],
    ];

    it('isBilibiliUrl only accepts single videos', () => {
      for (const [url, expected] of cases) {
        expect(isBilibiliUrl(url)).toBe(expected);
      }
    });

    it('parseBilibiliUrl returns null for list sources', () => {
      expect(parseBilibiliUrl('https://space.bilibili.com/521041866/lists/2851266')).toBeNull();
      expect(parseBilibiliUrl('https://www.bilibili.com/video/BV1xx411c7mD?p=3')).toEqual({
        bvid: 'BV1xx411c7mD',
        page: 3,
      });
    });
  });
});
