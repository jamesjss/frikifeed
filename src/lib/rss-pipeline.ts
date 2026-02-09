import Parser from "rss-parser";
import type { InterestDefinition } from "@/lib/interests";
import { SOURCES, getSourcesByIds, type SourceConfig, type SourceId } from "@/lib/sources";

type CustomFeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  contentSnippet?: string;
  content?: string;
  contentEncoded?: string;
  isoDate?: string;
  pubDate?: string;
};

type NormalizedItem = {
  id: string;
  title: string;
  link: string;
  sourceId: SourceId;
  source: string;
  publishedAt: string | null;
  text: string;
};

type CachedFeed = {
  expiresAt: number;
  items: NormalizedItem[];
};

type MatchedInterest = {
  id: string;
  label: string;
};

export type SummaryItem = {
  id: string;
  title: string;
  link: string;
  sourceId: SourceId;
  source: string;
  publishedAt: string | null;
  summary: string;
  matchedKeywords: string[];
  matchedInterests: MatchedInterest[];
};

export type SummaryResult = {
  items: SummaryItem[];
  warnings: string[];
  totalCandidates: number;
};

export const MAX_ITEMS_PER_SOURCE = 20;
export const MAX_TOTAL_ITEMS = 50;
const CACHE_TTL_MS = 10 * 60 * 1000;

const feedCache = new Map<string, CachedFeed>();

const parser = new Parser<Record<string, never>, CustomFeedItem>({
  timeout: 12000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8"
  },
  customFields: {
    item: [["content:encoded", "contentEncoded"]]
  }
});

export async function buildSummary(
  selectedInterests: InterestDefinition[],
  selectedSourceIds: SourceId[]
): Promise<SummaryResult> {
  const selectedKeywords = getSelectedKeywords(selectedInterests);
  const warnings: string[] = [];
  const selectedSources = selectedSourceIds.length > 0 ? getSourcesByIds(selectedSourceIds) : SOURCES;

  const perFeedResults = await Promise.all(
    selectedSources.map(async (feed) => {
      try {
        return await loadFeedItems(feed);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        warnings.push(`No se pudo leer ${feed.name}: ${detail}`);
        return [];
      }
    })
  );

  const dedupedItems = dedupeItems(perFeedResults.flat());
  const scoredItems = dedupedItems
    .map((item) => scoreItem(item, selectedInterests, selectedKeywords))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || compareDates(b.publishedAt, a.publishedAt))
    .slice(0, MAX_TOTAL_ITEMS);

  return {
    items: scoredItems.map((item) => ({
      id: item.id,
      title: item.title,
      link: item.link,
      sourceId: item.sourceId,
      source: item.source,
      publishedAt: item.publishedAt,
      summary: createSummary(item.text, item.title),
      matchedKeywords: item.matchedKeywords,
      matchedInterests: item.matchedInterests
    })),
    warnings,
    totalCandidates: dedupedItems.length
  };
}

async function loadFeedItems(feed: SourceConfig): Promise<NormalizedItem[]> {
  const cached = feedCache.get(feed.feedUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.items;
  }

  const parsedFeed = await parser.parseURL(feed.feedUrl);
  const normalizedItems = (parsedFeed.items ?? [])
    .slice(0, MAX_ITEMS_PER_SOURCE)
    .map((item, index) => normalizeItem(item, feed, index))
    .filter((item): item is NormalizedItem => item !== null);

  feedCache.set(feed.feedUrl, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    items: normalizedItems
  });

  return normalizedItems;
}

function normalizeItem(item: CustomFeedItem, feed: SourceConfig, index: number): NormalizedItem | null {
  const title = normalizeText(item.title);
  const link = normalizeUrl(item.link);
  if (!title || !link) {
    return null;
  }

  const publishedAt = normalizeDate(item.isoDate ?? item.pubDate);
  const text = buildItemText(item);
  const guid = normalizeText(item.guid ?? "");

  return {
    id: guid || `${feed.id}:${index}:${link}`,
    title,
    link,
    sourceId: feed.id,
    source: feed.name,
    publishedAt,
    text
  };
}

function buildItemText(item: CustomFeedItem): string {
  return normalizeText(
    [item.contentSnippet, item.contentEncoded, item.content, item.title]
      .filter(Boolean)
      .map((part) => stripHtml(part))
      .join(" ")
  );
}

function dedupeItems(items: NormalizedItem[]): NormalizedItem[] {
  const map = new Map<string, NormalizedItem>();
  for (const item of items) {
    const key = item.link || item.id;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }
    if (compareDates(item.publishedAt, existing.publishedAt) > 0) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

function getSelectedKeywords(interests: InterestDefinition[]): Set<string> {
  const keywords = new Set<string>();
  for (const interest of interests) {
    for (const keyword of interest.keywords) {
      const normalized = keyword.toLowerCase().trim();
      if (normalized) {
        keywords.add(normalized);
      }
    }
  }
  return keywords;
}

function scoreItem(
  item: NormalizedItem,
  selectedInterests: InterestDefinition[],
  selectedKeywords: Set<string>
) {
  const haystack = `${item.title} ${item.text}`.toLowerCase();
  const matchedKeywords = Array.from(selectedKeywords).filter((keyword) => haystack.includes(keyword));
  const matchedInterests = selectedInterests
    .filter((interest) => interest.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())))
    .map((interest) => ({ id: interest.id, label: interest.label }));

  const score = matchedKeywords.length + matchedInterests.length * 2;
  return {
    ...item,
    matchedKeywords,
    matchedInterests,
    score
  };
}

function createSummary(text: string, title: string): string {
  const cleaned = normalizeText(text);
  if (!cleaned) {
    return title;
  }

  if (cleaned.length <= 240) {
    return cleaned;
  }

  const sentenceCut = cleaned.indexOf(". ", 170);
  if (sentenceCut > 0 && sentenceCut <= 240) {
    return cleaned.slice(0, sentenceCut + 1);
  }

  return `${cleaned.slice(0, 237)}...`;
}

function normalizeText(value: unknown): string {
  const text = toStringValue(value);
  return text.replace(/\s+/g, " ").trim();
}

function normalizeUrl(value: unknown): string {
  const raw = toStringValue(value);
  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    url.hash = "";
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid"
    ];
    for (const param of trackingParams) {
      url.searchParams.delete(param);
    }
    return url.toString();
  } catch {
    return raw.trim();
  }
}

function normalizeDate(value?: string): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function stripHtml(value: unknown): string {
  return toStringValue(value).replace(/<[^>]*>/g, " ");
}

function compareDates(a: string | null, b: string | null): number {
  const aTime = a ? new Date(a).getTime() : 0;
  const bTime = b ? new Date(b).getTime() : 0;
  return aTime - bTime;
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item)).join(" ");
  }
  return String(value);
}
