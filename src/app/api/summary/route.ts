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
  type SourceId
} from "@/lib/sources";

export const runtime = "nodejs";

type RequestBody = {
  interests?: unknown;
  sources?: string[];
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

  const sources = sanitizeSources(body.sources ?? []);
  if (sources.length === 0) {
    return NextResponse.json({ error: "Debes elegir al menos una fuente web." }, { status: 400 });
  }

  const sourceConfigs = getSourcesByIds(sources);
  const sourceSuggestions = suggestSources({
    selectedSourceIds: sources,
    selectedInterests: interests,
    limit: 4
  });

  const result = await buildSummary(interests, sources);

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

function sanitizeEmail(email?: string): string | null {
  if (!email) {
    return null;
  }
  const trimmed = email.trim();
  return trimmed.length > 0 ? trimmed : null;
}

