/**
 * Bilibili service.
 * Extracts subtitles from Bilibili videos and series (合集/分P)
 * for download as Markdown files or direct import into NotebookLM.
 *
 * Subtitle fetching uses FlowToLM's proven approach:
 *   view API (bvid → aid + cid) → WBI API (aid + cid → subtitle tracks) → download subtitle JSON
 *
 * All requests use credentials: 'include' for authenticated access.
 */

import type { BilibiliVideoItem } from '@/lib/types';
import { encodeWbi } from '@/services/bilibili-wbi';
export type { BilibiliVideoItem };

export interface BilibiliSourceInfo {
  bvid: string;
  title: string;
  owner: string;
  desc: string;
  videoCount: number;
  isSeries: boolean;
  type: 'video' | 'series' | 'season';
}

export interface BilibiliResult {
  source: BilibiliSourceInfo;
  videos: BilibiliVideoItem[];
}

export interface BilibiliSubtitleBody {
  from: number;
  to: number;
  content: string;
}

// ── URL Parsing ──
//
// `detectBilibiliPage` is the single source of truth; every predicate and
// parser below is derived from it. Keeping one classifier matters because the
// patterns here overlap heavily — a 合集 and a 收藏夹 both live *inside* an
// UP主 space — and duplicated copies of these rules have drifted twice before,
// once dropping /medialist/play/ml{id} and once reading 合集 links as plain
// UP主 pages.

/** What kind of video source a Bilibili URL points at. */
export type BilibiliPage =
  /** Single video, or one part (分P) of a multi-part video. */
  | { kind: 'video'; bvid: string; page: number }
  /** UP主 homepage — their full upload list. */
  | { kind: 'space'; mid: string }
  /** 合集/系列 — a curated season within an UP主's space. */
  | { kind: 'collection'; mid: string; sid: string }
  /** 收藏夹 / 媒体列表 / 稍后再看. */
  | { kind: 'favorite'; favType: 'watchlater' | 'fav' | 'ml'; id: string | null };

const isBiliHost = (hostname: string) => /(^|\.)bilibili\.com$/i.test(hostname);
const isSpaceHost = (hostname: string) => /^space\.bilibili\.com$/i.test(hostname);

function toUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/**
 * Classify a Bilibili URL.
 *
 * Patterns are ordered most-specific first, and that order is load-bearing:
 * 合集 (`/{mid}/lists/{sid}`) and 收藏夹 (`/{mid}/favlist?fid=`) are both
 * sub-paths of an UP主 space, so matching the bare space pattern first would
 * classify them as 'space' and silently fetch the uploader's entire upload
 * list instead of the list the user is actually looking at.
 *
 * Returns null for Bilibili pages that aren't a video source (动态, 专栏,
 * 直播, 搜索…) so callers can tell "not supported" from "wrong parse".
 */
export function detectBilibiliPage(url: string): BilibiliPage | null {
  const u = toUrl(url);
  if (!u || !isBiliHost(u.hostname)) return null;
  const path = u.pathname;

  // 稍后再看
  if (/^\/list\/watchlater\/?$/i.test(path)) {
    return { kind: 'favorite', favType: 'watchlater', id: null };
  }

  // 合集/系列: space.bilibili.com/{mid}/lists/{sid}?type=season|series
  const collection = path.match(/^\/(\d+)\/lists\/(\d+)\/?$/);
  if (isSpaceHost(u.hostname) && collection) {
    return { kind: 'collection', mid: collection[1], sid: collection[2] };
  }

  // 收藏夹 as actually browsed on the web: space.bilibili.com/{mid}/favlist?fid={id}
  // (and the www.bilibili.com/favlist?fid={id} variant). `fid` is the media_id.
  if (/^\/(?:\d+\/)?favlist\/?$/i.test(path)) {
    const fid = u.searchParams.get('fid')?.trim();
    if (fid && /^\d+$/.test(fid)) return { kind: 'favorite', favType: 'fav', id: fid };
  }

  // 收藏夹/媒体列表 in playback form
  const medialist = path.match(/^\/medialist\/(?:detail|play)\/ml(\d+)\/?$/i);
  if (medialist) return { kind: 'favorite', favType: 'ml', id: medialist[1] };

  // /list/fav/{id}, /list/ml/{id}, /list/ml{id}, /list/{id}
  const listMatch = path.match(/^\/list\/(fav|ml)?\/?(?:ml)?(\d+)\/?$/i);
  if (listMatch) {
    const favType = listMatch[1]?.toLowerCase() === 'fav' ? 'fav' : 'ml';
    return { kind: 'favorite', favType, id: listMatch[2] };
  }

  // 单个视频 / 分P
  const video = path.match(/^\/video\/(BV[a-zA-Z0-9]+|av\d+)\/?$/i);
  if (video) {
    const parsedPage = parseInt(u.searchParams.get('p') || '1', 10);
    return {
      kind: 'video',
      bvid: video[1],
      page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    };
  }

  // UP主主页 — only the space root and its 投稿 tab. Everything else under the
  // space (/dynamic, /article, /favlist without fid, /lists index…) has no
  // video list to extract, so it must not fall through to a space fetch.
  if (isSpaceHost(u.hostname)) {
    const segments = path.split('/').filter(Boolean);
    const mid = segments[0] || '';
    const isSpaceRoot = segments.length === 1;
    const isUploadTab = segments.length === 2 && /^(video|upload)$/i.test(segments[1]);
    if (/^\d+$/.test(mid) && (isSpaceRoot || isUploadTab)) {
      return { kind: 'space', mid };
    }
  }

  return null;
}

export function isBilibiliUrl(url: string): boolean {
  return detectBilibiliPage(url)?.kind === 'video';
}

export function parseBilibiliUrl(url: string): { bvid: string; page: number } | null {
  const page = detectBilibiliPage(url);
  return page?.kind === 'video' ? { bvid: page.bvid, page: page.page } : null;
}

export function isBilibiliSpaceUrl(url: string): boolean {
  return detectBilibiliPage(url)?.kind === 'space';
}

export function parseBilibiliSpaceUrl(url: string): string | null {
  const page = detectBilibiliPage(url);
  return page?.kind === 'space' ? page.mid : null;
}

export function isBilibiliCollectionUrl(url: string): boolean {
  return detectBilibiliPage(url)?.kind === 'collection';
}

export function parseBilibiliCollectionUrl(url: string): { mid: string; sid: string } | null {
  const page = detectBilibiliPage(url);
  return page?.kind === 'collection' ? { mid: page.mid, sid: page.sid } : null;
}

export function isBilibiliFavUrl(url: string): boolean {
  return detectBilibiliPage(url)?.kind === 'favorite';
}

export function parseBilibiliFavUrl(url: string): { type: 'watchlater' | 'fav' | 'ml'; id: string | null } | null {
  const page = detectBilibiliPage(url);
  return page?.kind === 'favorite' ? { type: page.favType, id: page.id } : null;
}

// ── API Helpers ──

const BILIBILI_HEADERS = {
  'Referer': 'https://www.bilibili.com',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

async function apiFetch(url: string): Promise<unknown> {
  const resp = await fetch(url, {
    credentials: 'include',
    headers: BILIBILI_HEADERS,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  const json = await resp.json() as { code: number; message?: string; data: unknown };
  if (json.code !== 0) {
    throw new Error(`Bilibili API error ${json.code}: ${json.message || 'Unknown error'}`);
  }
  return json.data;
}

// ── Fetch Video Info ──

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function fetchBilibiliVideo(id: string): Promise<BilibiliResult> {
  // parseBilibiliUrl accepts both BV... and legacy av\d+ ids, but the view API
  // takes them via different query params (bvid= vs aid=) and every downstream
  // call (subtitle fetch, page URLs) only accepts a real BVID. Query with
  // whichever form we have, then normalize to the canonical bvid the response
  // itself reports — an av-id was previously threaded through as `bvid` for
  // the rest of the pipeline, which bilibili's other endpoints reject outright.
  const aidMatch = /^av(\d+)$/i.exec(id);
  const query = aidMatch ? `aid=${aidMatch[1]}` : `bvid=${encodeURIComponent(id)}`;
  const data = await apiFetch(`https://api.bilibili.com/x/web-interface/view?${query}`) as any;
  const bvid: string = data?.bvid || id;

  const mainTitle: string = data?.title || bvid;
  const owner: string = data?.owner?.name || '';
  const desc: string = data?.desc || '';
  const aid: number | undefined = data?.aid;
  const pages: any[] = data?.pages || [];

  if (pages.length > 1) {
    const videos: BilibiliVideoItem[] = pages.map((p: any) => ({
      bvid,
      cid: p.cid,
      aid,
      title: mainTitle,
      part: p.part || `P${p.page}`,
      page: p.page,
      url: `https://www.bilibili.com/video/${bvid}?p=${p.page}`,
      duration: p.duration,
    }));

    return {
      source: {
        bvid,
        title: mainTitle,
        owner,
        desc,
        videoCount: videos.length,
        isSeries: true,
        type: 'video',
      },
      videos,
    };
  }

  if (data?.ugc_season && data.ugc_season.sections) {
    const sections = data.ugc_season.sections;
    const allVideos: BilibiliVideoItem[] = [];
    let pageNum = 1;

    for (const section of sections) {
      if (!section?.archives || !Array.isArray(section.archives)) continue;
      for (const archive of section.archives) {
        allVideos.push({
          bvid: archive.bvid,
          cid: archive.cid,
          title: archive.title || mainTitle,
          part: undefined,
          page: pageNum++,
          url: `https://www.bilibili.com/video/${archive.bvid}`,
          duration: archive.duration,
        });
      }
    }

    if (allVideos.length > 0) {
      return {
        source: {
          bvid,
          title: data.ugc_season.title || mainTitle,
          owner,
          desc,
          videoCount: allVideos.length,
          isSeries: true,
          type: 'series',
        },
        videos: allVideos,
      };
    }
  }

  const singleVideo: BilibiliVideoItem[] = [{
    bvid,
    cid: data.cid || (pages[0]?.cid),
    aid,
    title: mainTitle,
    page: 1,
    url: `https://www.bilibili.com/video/${bvid}`,
    duration: data.duration,
  }];

  return {
    source: {
      bvid,
      title: mainTitle,
      owner,
      desc,
      videoCount: 1,
      isSeries: false,
      type: 'video',
    },
    videos: singleVideo,
  };
}

// ── Fetch UP主主页 Videos ──

export interface BilibiliSpaceResult {
  source: BilibiliSourceInfo;
  videos: BilibiliVideoItem[];
}

export async function fetchBilibiliUserVideos(mid: string): Promise<BilibiliSpaceResult> {
  const allVideos: BilibiliVideoItem[] = [];
  let pageNum = 1;
  const ps = 50;

  // Fetch user info
  const infoData = await apiFetch(`https://api.bilibili.com/x/space/wbi/acc/info?mid=${mid}`) as any;
  const owner = infoData?.name || '';
  const title = `${owner} 的视频列表`;

  // Fetch video list (paginate up to 200 videos)
  let hasMore = true;
  while (hasMore && allVideos.length < 200) {
    const listData = await apiFetch(
      `https://api.bilibili.com/x/space/wbi/arc/search?mid=${mid}&ps=${ps}&pn=${pageNum}`
    ) as any;

    const vlist = listData?.list?.vlist || [];
    for (const v of vlist) {
      allVideos.push({
        bvid: v.bvid,
        cid: 0, // Will be resolved later during subtitle fetch
        title: v.title,
        // Position in the overall list, not the API page number (pageNum) —
        // every video fetched in the same API page previously got the same
        // `page` value, so the UI's "P{page}" label repeated across each
        // batch of 50 instead of counting up.
        page: allVideos.length + 1,
        url: `https://www.bilibili.com/video/${v.bvid}`,
        duration: v.length ? parseInt(v.length, 10) : undefined,
      });
    }

    const total = listData?.page?.count || 0;
    hasMore = allVideos.length < total && vlist.length > 0;
    pageNum++;
  }

  return {
    source: {
      bvid: mid,
      title,
      owner,
      desc: '',
      videoCount: allVideos.length,
      isSeries: true,
      type: 'series',
    },
    videos: allVideos,
  };
}

// ── Fetch 合集/系列 (Collection) Videos ──

export interface BilibiliCollectionResult {
  source: BilibiliSourceInfo;
  videos: BilibiliVideoItem[];
}

export async function fetchBilibiliCollection(mid: string, sid: string): Promise<BilibiliCollectionResult> {
  const allVideos: BilibiliVideoItem[] = [];
  const ps = 30;
  let pageNum = 1;
  let title = '';
  let owner = '';
  let hasMore = true;

  while (hasMore && allVideos.length < 500) {
    // seasons_archives_list rejects unsigned requests — see services/bilibili-wbi.ts.
    const query = await encodeWbi({ mid, season_id: sid, page_num: pageNum, page_size: ps });
    const data = await apiFetch(
      `https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?${query}`
    ) as any;

    if (!title) {
      title = data?.meta?.name || '';
      owner = data?.meta?.upper?.name || '';
    }

    const archives: any[] = data?.archives || [];
    for (const a of archives) {
      allVideos.push({
        bvid: a.bvid,
        cid: 0, // Resolved later during subtitle fetch
        aid: a.aid,
        title: a.title || '',
        page: allVideos.length + 1,
        url: `https://www.bilibili.com/video/${a.bvid}`,
        duration: a.duration,
      });
    }

    const total: number = data?.page?.total ?? 0;
    hasMore = archives.length > 0 && allVideos.length < total;
    pageNum++;
  }

  return {
    source: {
      bvid: sid,
      title: title || '合集',
      owner,
      desc: '',
      videoCount: allVideos.length,
      isSeries: true,
      type: 'series',
    },
    videos: allVideos,
  };
}

// ── Fetch Favorite / Collection List Videos ──

export interface BilibiliFavListResult {
  source: BilibiliSourceInfo;
  videos: BilibiliVideoItem[];
}

/**
 * Fetch videos from a Bilibili favorite/collection list.
 * Supports: watch later, favorite folders (/list/fav/{media_id}), media lists (/list/ml/{id}).
 */
export async function fetchBilibiliFavoriteList(url: string): Promise<BilibiliFavListResult> {
  const parsed = parseBilibiliFavUrl(url);
  if (!parsed) throw new Error('无法解析的收藏夹链接');

  const { type } = parsed;
  let title = '';
  let owner = '';
  const allVideos: BilibiliVideoItem[] = [];

  if (type === 'watchlater') {
    // 稍后再看: no pagination needed, returns all items
    const data = await apiFetch('https://api.bilibili.com/x/v2/history/toview') as any;
    title = '稍后再看';
    const list: any[] = data?.list || data?.data?.list || [];
    let page = 1;
    for (const v of list) {
      allVideos.push({
        bvid: v.bvid,
        cid: v.cid || 0,
        aid: v.aid,
        title: v.title || '',
        part: undefined,
        page: page++,
        url: `https://www.bilibili.com/video/${v.bvid}`,
        duration: v.duration,
      });
      if (!owner && v.owner?.name) owner = v.owner.name;
    }
  } else {
    // Fav folder or media list: use medialist resource/list API
    const bizId = parsed.id;
    if (!bizId) throw new Error('无法解析的收藏夹 ID');

    let ps = 20;
    let pn = 1;
    let hasMore = true;
    let infoTitle = '';
    let infoOwner = '';

    while (hasMore && allVideos.length < 200) {
      const data = await apiFetch(
        `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${bizId}&ps=${ps}&pn=${pn}&platform=web`
      ) as any;

      if (!infoTitle) {
        // Parenthesised on purpose: `||` binds tighter than `?:`, so without it
        // the real folder name is never used — a truthy title selected the
        // '媒体列表' literal instead.
        infoTitle = data?.info?.title || (type === 'ml' ? '媒体列表' : '收藏夹');
        infoOwner = data?.info?.upper?.name || '';
      }

      const medias: any[] = data?.medias || [];
      for (const m of medias) {
        allVideos.push({
          bvid: m.bvid,
          cid: 0, // Resolved later
          aid: m.aid,
          title: m.title || m.name || '',
          part: undefined,
          // `m.page` is the media-list API's own field for that single video's
          // part count (almost always 1), not its position in this folder —
          // `1 || allVideos.length + 1` always won, so every entry showed "P1".
          page: allVideos.length + 1,
          url: `https://www.bilibili.com/video/${m.bvid}`,
          duration: m.duration,
        });
      }

      hasMore = data?.has_more === true && medias.length > 0;
      pn++;
    }

    title = infoTitle;
    owner = infoOwner;
  }

  return {
    source: {
      bvid: parsed.id || type,
      title,
      owner,
      desc: '',
      videoCount: allVideos.length,
      isSeries: true,
      type: 'series',
    },
    videos: allVideos,
  };
}

// ── Fetch Subtitles (FlowToLM approach) ──

interface SubtitleTrack {
  lan: string;
  lan_doc: string;
  subtitle_url: string;
}

function pickBestSubtitle(subtitles: SubtitleTrack[]): SubtitleTrack | null {
  if (subtitles.length === 0) return null;
  const zhCN = subtitles.find(t => t.lan === 'zh-CN' || t.lan === 'zh-Hans');
  if (zhCN) return zhCN;
  const anyZh = subtitles.find(t => t.lan.startsWith('zh') || t.lan_doc.includes('中'));
  if (anyZh) return anyZh;
  return subtitles[0];
}

// ── Format Subtitle as Markdown ──

export function smartMergeSubtitles(subtitles: BilibiliSubtitleBody[]): string {
  let finalArticle = '';
  let currentParagraph = '';
  let lastContent = '';

  for (let i = 0; i < subtitles.length; i++) {
    const current = subtitles[i];
    const next = subtitles[i + 1];

    let text = current.content?.trim() || '';
    if (!text) continue;

    if (text.length <= 1 && /^[\s，。！？、；：""''（）【】《》\.!\?,;:()\[\]{}'"\s-]+$/.test(text)) continue;

    if (text === lastContent) continue;
    lastContent = text;

    currentParagraph += text;

    if (next) {
      const timeGap = next.from - current.to;
      if (timeGap > 0.6) {
        finalArticle += currentParagraph.replace(/[，。！？、；：]+$/g, '') + '。\n\n';
        currentParagraph = '';
      } else {
        currentParagraph += '，';
      }
    } else {
      finalArticle += currentParagraph.replace(/[，。！？、；：]+$/g, '') + '。';
    }
  }

  return finalArticle;
}

export function buildSubtitleMarkdown(
  title: string,
  videoUrl: string,
  part: string | undefined,
  owner: string,
  desc: string,
  subtitleBody: BilibiliSubtitleBody[],
  stripTimestamps: boolean = true,
): string {
  const displayTitle = part ? `${title} - ${part}` : title;
  const mergedText = stripTimestamps
    ? smartMergeSubtitles(subtitleBody)
    : buildSubtitleWithTimestamps(subtitleBody);
  const estimatedWords = Math.round(mergedText.length * 0.7);
  const cleanDesc = desc?.trim() || '暂无简介';

  const lines: string[] = [
    `# 视频标题：[Bilibili] ${displayTitle}`,
    '',
    `- **UP主：** ${owner || '未知'}`,
    `- **链接：** ${videoUrl}`,
    `- **简介：** ${cleanDesc}`,
    `字数：${estimatedWords.toLocaleString()} 字`,
    '',
    '---',
    '',
    '## 视频正文',
    '',
    mergedText,
  ];

  return lines.join('\n');
}

// ── Format converters ──

type SubtitleFormat = 'md' | 'txt' | 'json' | 'srt';

export function convertSubtitleOutput(
  format: SubtitleFormat,
  markdown: string,
  rawBody?: BilibiliSubtitleBody[],
  stripTimestamps: boolean = true,
): { content: string; ext: string; mime: string } {
  switch (format) {
    case 'txt':
      return {
        content: rawBody
          ? buildSubtitlePlainText(rawBody, stripTimestamps)
          : markdown.replace(/^# .+\n\n?/gm, '').replace(/\*\*/g, '').replace(/\n{3,}/g, '\n\n').trim(),
        ext: '.txt',
        mime: 'text/plain',
      };
    case 'json':
      return {
        content: rawBody ? buildSubtitleJson(rawBody) : JSON.stringify({ text: markdown }),
        ext: '.json',
        mime: 'application/json',
      };
    case 'srt':
      return {
        content: rawBody ? buildSubtitleSrt(rawBody) : markdown,
        ext: '.srt',
        mime: 'text/plain',
      };
    default:
      return { content: markdown, ext: '.md', mime: 'text/markdown' };
  }
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function buildSubtitleSrt(
  subtitleBody: BilibiliSubtitleBody[],
): string {
  return subtitleBody.map((body, i) => {
    const from = formatTimestamp(body.from);
    const to = formatTimestamp(body.to);
    const text = body.content.replace(/<[^>]+>/g, '').trim();
    return `${i + 1}\n${from} --> ${to}\n${text}\n`;
  }).join('\n');
}

export function buildSubtitleJson(
  subtitleBody: BilibiliSubtitleBody[],
): string {
  return JSON.stringify(subtitleBody.map((b, i) => ({
    index: i + 1,
    from: b.from,
    to: b.to,
    content: b.content.replace(/<[^>]+>/g, '').trim(),
  })), null, 2);
}

/**
 * Build plain subtitle text with timestamp markers preserved.
 * Format: [MM:SS,mmm] content
 */
export function buildSubtitleWithTimestamps(
  subtitleBody: BilibiliSubtitleBody[],
): string {
  return subtitleBody
    .map(b => {
      const ts = formatTimestamp(b.from);
      const text = b.content.replace(/<[^>]+>/g, '').trim();
      if (!text) return '';
      return `[${ts}] ${text}`;
    })
    .filter(Boolean)
    .join('\n');
}

export function buildSubtitlePlainText(
  subtitleBody: BilibiliSubtitleBody[],
  stripTimestamps: boolean = true,
): string {
  if (stripTimestamps) {
    return subtitleBody.map(b => b.content.replace(/<[^>]+>/g, '').trim()).join('\n');
  }
  return buildSubtitleWithTimestamps(subtitleBody);
}

export function mergeBilibiliSubtitles(
  results: { video: BilibiliVideoItem; markdown: string | null }[],
  source: BilibiliSourceInfo,
): string {
  const validResults = results.filter(r => r.markdown !== null);

  let totalChars = 0;
  const chapterLines: string[] = [];

  for (const res of validResults) {
    const videoTitle = res.video.part
      ? `P${res.video.page} ${res.video.part}`
      : `P${res.video.page} ${res.video.title}`;
    chapterLines.push('', '---', '');
    chapterLines.push(`## ${videoTitle}`);
    chapterLines.push('');

    const bodyMatch = res.markdown?.match(/## 视频正文\n\n([\s\S]+)/);
    if (bodyMatch) {
      const body = bodyMatch[1].trim();
      totalChars += body.length;
      chapterLines.push(body);
    } else {
      chapterLines.push(res.markdown || '');
      totalChars += (res.markdown || '').length;
    }
  }

  const estimatedWords = Math.round(totalChars * 0.7);

  const lines: string[] = [
    `# 字幕 提取：${source.title}（共 ${validResults.length} 集）`,
    '',
    `- **UP主：** ${source.owner || '未知'}`,
    `- **简介：** ${source.desc?.trim() || '暂无简介'}`,
    `字数：${estimatedWords.toLocaleString()} 字`,
    ...chapterLines,
    '',
    '---',
    '',
    `总字数：${estimatedWords.toLocaleString()} 字`,
  ];

  return lines.join('\n');
}

/**
 * Merge multiple videos' subtitles into a single file honoring the requested
 * output format. `mergeBilibiliSubtitles` above only ever produces Markdown —
 * feeding that into `convertSubtitleOutput` with no rawBody meant a merged
 * '.json' export was just `{ text: "<the markdown>" }` and a merged '.srt'
 * export was the markdown itself wearing a '.srt' extension. Per-video
 * rawBody (kept on each SubtitleFetchResult) makes a real merge possible.
 */
export function mergeSubtitlesFormatted(
  results: SubtitleFetchResult[],
  source: BilibiliSourceInfo,
  format: SubtitleFormat,
  stripTimestamps: boolean = true,
): { content: string; ext: string; mime: string } {
  if (format === 'md' || format === 'txt') {
    const md = mergeBilibiliSubtitles(results, source);
    return convertSubtitleOutput(format, md, undefined, stripTimestamps);
  }

  const validResults = results.filter((r) => r.rawBody && r.rawBody.length > 0);
  const chapterTitle = (v: BilibiliVideoItem) => (v.part ? `P${v.page} ${v.part}` : `P${v.page} ${v.title}`);

  if (format === 'json') {
    const chapters = validResults.map((r) => ({
      title: chapterTitle(r.video),
      bvid: r.video.bvid,
      entries: r.rawBody!.map((b, i) => ({
        index: i + 1,
        from: b.from,
        to: b.to,
        content: b.content.replace(/<[^>]+>/g, '').trim(),
      })),
    }));
    return {
      content: JSON.stringify({ title: source.title, owner: source.owner, chapters }, null, 2),
      ext: '.json',
      mime: 'application/json',
    };
  }

  // srt: one continuous timeline. Each chapter's cues are shifted past the
  // previous chapter's last cue (plus a gap) so the whole file stays
  // monotonically increasing, and a short marker cue announces each chapter —
  // SRT has no native heading construct, so this is the only way a player or
  // reader can tell where one video ends and the next begins.
  const GAP_SECONDS = 2;
  let index = 1;
  let offset = 0;
  const blocks: string[] = [];

  for (const r of validResults) {
    const title = chapterTitle(r.video);
    blocks.push(`${index}\n${formatTimestamp(offset)} --> ${formatTimestamp(offset + 1.5)}\n[${title}]\n`);
    index++;

    let lastTo = 0;
    for (const b of r.rawBody!) {
      const text = b.content.replace(/<[^>]+>/g, '').trim();
      if (!text) continue;
      const from = offset + 1.5 + b.from;
      const to = offset + 1.5 + b.to;
      blocks.push(`${index}\n${formatTimestamp(from)} --> ${formatTimestamp(to)}\n${text}\n`);
      index++;
      lastTo = Math.max(lastTo, b.to);
    }
    offset += 1.5 + lastTo + GAP_SECONDS;
  }

  return { content: blocks.join('\n'), ext: '.srt', mime: 'text/plain' };
}

// ── Main Subtitle Fetch (FlowToLM approach) ──

export interface SubtitleFetchResult {
  video: BilibiliVideoItem;
  markdown: string | null;
  error: string | null;
  lan_doc?: string;
  rawBody?: BilibiliSubtitleBody[];
}

/**
 * Fetch subtitle for one video.
 *
 * FlowToLM's proven pipeline:
 *   1. view API → get aid + cid (with credentials)
 *   2. WBI API → get subtitle tracks (with credentials)
 *   3. Download subtitle JSON (simple fetch)
 *   4. Build Markdown
 */
export async function fetchVideoSubtitle(
  video: BilibiliVideoItem,
  ownerName: string,
  desc: string,
  stripTimestamps: boolean = true,
): Promise<SubtitleFetchResult> {
  let { bvid, cid, aid } = video;

  try {
    // Step 1: Ensure we have aid + cid (via view API)
    if (!aid || !cid) {
      console.log(`[Bilibili] Fetching view info for ${bvid}...`);
      const viewUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
      const viewRes = await fetch(viewUrl, {
        credentials: 'include',
        headers: { 'Referer': 'https://www.bilibili.com' },
      });
      if (!viewRes.ok) throw new Error(`View API HTTP ${viewRes.status}`);
      const viewData = await viewRes.json();
      if (viewData.code !== 0 || !viewData.data) {
        throw new Error(`View API error: ${viewData.message || 'Unknown'}`);
      }
      if (!cid) cid = viewData.data.cid;
      if (!aid) aid = viewData.data.aid;
      if (!aid || !cid) throw new Error(`无法获取 ${bvid} 的 aid/cid`);
    }

    console.log(`[Bilibili] WBI: aid=${aid}, cid=${cid}`);

    // Step 2: Get subtitle tracks via WBI API
    const wbiUrl = `https://api.bilibili.com/x/player/wbi/v2?aid=${aid}&cid=${cid}`;
    const wbiRes = await fetch(wbiUrl, {
      credentials: 'include',
      headers: { 'Referer': 'https://www.bilibili.com' },
    });
    if (!wbiRes.ok) throw new Error(`WBI API HTTP ${wbiRes.status}`);
    const wbiData = await wbiRes.json();

    const subtitles: SubtitleTrack[] = (wbiData?.data?.subtitle?.subtitles || [])
      .filter((s: any) => s.subtitle_url)
      .map((s: any) => ({
        lan: s.lan || '',
        lan_doc: s.lan_doc || s.lan || '',
        subtitle_url: s.subtitle_url || '',
      }));

    const track = pickBestSubtitle(subtitles);
    if (!track) {
      return { video: { ...video, cid, aid }, markdown: null, error: 'no_subtitle' };
    }

    console.log(`[Bilibili] Selected: ${track.lan_doc} (${track.lan}), ${subtitles.length} tracks total`);

    // Step 3: Download subtitle JSON
    let subtitleUrl = track.subtitle_url;
    if (subtitleUrl.startsWith('//')) subtitleUrl = `https:${subtitleUrl}`;
    else if (subtitleUrl.startsWith('http://')) subtitleUrl = subtitleUrl.replace('http://', 'https://');

    const subRes = await fetch(subtitleUrl);
    if (!subRes.ok) throw new Error(`Subtitle download HTTP ${subRes.status}`);

    const subJson = await subRes.json();
    const bodies: BilibiliSubtitleBody[] = subJson.body || [];
    if (bodies.length === 0) {
      return { video: { ...video, cid, aid }, markdown: null, error: 'empty_subtitle' };
    }

    // Step 4: Build Markdown
    const markdown = buildSubtitleMarkdown(
      video.title,
      video.url,
      video.part,
      ownerName,
      desc,
      bodies,
      stripTimestamps,
    );

    return {
      video: { ...video, cid, aid },
      markdown,
      error: null,
      lan_doc: track.lan_doc,
      rawBody: bodies,
    };
  } catch (err) {
    console.error(`[Bilibili] 提取字幕异常 bvid=${bvid} cid=${cid}`, err);
    return {
      video,
      markdown: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Strip SRT-style timestamp markers and numbering from subtitle text.
 * Handles formats like:
 *   `1\n00:00:01,000 --> 00:00:04,500\ncontent text`
 *   `[00:01:23] content text`
 *   `(00:01:23) content text`
 * Relies on buildSubtitlePlainText when raw body is available for best results.
 */
export function stripBilibiliTimestamps(text: string): string {
  return text
    // Remove SRT numbering lines (standalone numbers)
    .replace(/^\d+\n/gm, '')
    // Remove SRT/ASS timestamp range lines
    .replace(/^\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*$/gm, '')
    // Remove bracket timestamps like [00:01:23] or (00:01:23)
    .replace(/[[(]\d{1,2}:\d{2}(?::\d{2})?[)\]]\s*/g, '')
    // Remove standalone timestamp prefixes
    .replace(/^\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*/gm, '')
    // Clean up multiple blank lines left after removal
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeBilibiliFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}
