import { NextRequest, NextResponse } from "next/server";
import { buildSummary, MAX_ITEMS_PER_SOURCE, MAX_TOTAL_ITEMS } from "@/lib/rss-pipeline";
import {
  MAX_KEYWORDS_PER_INTEREST,
  sanitizeInterestSelection,
  type InterestDefinition
} from "@/lib/interests";
import {
  getSourcesByIds,
  sanitizeSourceIds,
  suggestSources,
  type SourceConfig,
  type SourceId
} from "@/lib/sources";

export const runtime = "nodejs";

type RequestBody = {
  interests?: unknown;
  sources?: string[];
  sourceOverrides?: unknown;
  email?: string;
};

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const interests = sanitizeInterests(body.interests);
  if (interests.length === 0) {
    return NextResponse.json(
      { error: "Debes elegir al menos un interés válido con keywords." },
      { status: 400 }
    );
  }

  const sourceIds = sanitizeSources(body.sources ?? []);
  const sourceOverrides = sanitizeSourceOverrides(body.sourceOverrides);
  const sourceConfigs = mergeSourceConfigs(getSourcesByIds(sourceIds), sourceOverrides);

  if (sourceConfigs.length === 0) {
    return NextResponse.json({ error: "Debes elegir al menos una fuente web." }, { status: 400 });
  }

  const sourceSuggestions = suggestSources({
    selectedSourceIds: sourceIds,
    selectedInterests: interests,
    limit: 4
  });

  const result = await buildSummary(interests, sourceConfigs);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    interests,
    sources: sourceConfigs.map((source) => ({
      id: source.id,
      name: source.name,
      websiteUrl: source.websiteUrl,
      feedUrl: source.feedUrl
    })),
    suggestedSources: sourceSuggestions.map((source) => ({
      id: source.id,
      name: source.name,
      websiteUrl: source.websiteUrl,
      feedUrl: source.feedUrl
    })),
    email: sanitizeEmail(body.email),
    limits: {
      maxItemsPerSource: MAX_ITEMS_PER_SOURCE,
      maxTotalItems: MAX_TOTAL_ITEMS,
      maxKeywordsPerInterest: MAX_KEYWORDS_PER_INTEREST
    },
    stats: {
      totalCandidates: result.totalCandidates,
      totalReturned: result.items.length
    },
    warnings: result.warnings,
    items: result.items
  });
}

function sanitizeInterests(values: unknown): InterestDefinition[] {
  return sanitizeInterestSelection(values);
}

function sanitizeSources(values: string[]): SourceId[] {
  return sanitizeSourceIds(values);
}

function sanitizeSourceOverrides(values: unknown): SourceConfig[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const result: SourceConfig[] = [];
  const seenIds = new Set<string>();
  const seenFeedUrls = new Set<string>();

  for (const value of values) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const source = value as Partial<SourceConfig>;
    const id = sanitizeNonEmptyText(source.id);
    const name = sanitizeNonEmptyText(source.name);
    const websiteUrl = sanitizeHttpUrl(source.websiteUrl);
    const feedUrl = sanitizeHttpUrl(source.feedUrl);
    const description = sanitizeText(source.description, 160);

    if (!id || !name || !websiteUrl || !feedUrl) {
      continue;
    }
    if (seenIds.has(id) || seenFeedUrls.has(feedUrl)) {
      continue;
    }

    result.push({
      id,
      name,
      websiteUrl,
      feedUrl,
      description,
      topics: sanitizeTopics(source.topics),
      relatedSourceIds: []
    });
    seenIds.add(id);
    seenFeedUrls.add(feedUrl);
  }

  return result;
}

function sanitizeTopics(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const topics: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = sanitizeText(value, 48).toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    topics.push(normalized);
    seen.add(normalized);
    if (topics.length >= 8) {
      break;
    }
  }
  return topics;
}

function sanitizeHttpUrl(value: unknown): string {
  const text = sanitizeNonEmptyText(value);
  if (!text) {
    return "";
  }
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return url.toString();
  } catch {
    return "";
  }
}

function sanitizeNonEmptyText(value: unknown): string {
  const text = sanitizeText(value, 160);
  return text.length > 0 ? text : "";
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function mergeSourceConfigs(base: SourceConfig[], overrides: SourceConfig[]): SourceConfig[] {
  const merged: SourceConfig[] = [];
  const seenIds = new Set<string>();
  const seenFeedUrls = new Set<string>();

  for (const source of [...base, ...overrides]) {
    if (seenIds.has(source.id) || seenFeedUrls.has(source.feedUrl)) {
      continue;
    }
    merged.push(source);
    seenIds.add(source.id);
    seenFeedUrls.add(source.feedUrl);
  }

  return merged;
}

function sanitizeEmail(email?: string): string | null {
  if (!email) {
    return null;
  }
  const trimmed = email.trim();
  return trimmed.length > 0 ? trimmed : null;
}
