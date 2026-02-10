export type InterestCategory = "tech" | "friki" | "custom";

export type InterestDefinition = {
  id: string;
  label: string;
  keywords: string[];
  category: InterestCategory;
  isBuiltIn: boolean;
};

export const MAX_INTERESTS_PER_USER = 30;
export const MAX_KEYWORDS_PER_INTEREST = 12;

type BuiltInDefinition = Omit<InterestDefinition, "isBuiltIn">;

const BUILT_IN_INTERESTS: BuiltInDefinition[] = [
  {
    id: "java-spring",
    label: "Java / Spring",
    category: "tech",
    keywords: ["java", "jvm", "spring", "spring boot", "hibernate", "maven", "gradle"]
  },
  {
    id: "backend",
    label: "Backend",
    category: "tech",
    keywords: ["backend", "api", "microservices", "rest", "graphql", "database", "server"]
  },
  {
    id: "frontend",
    label: "Frontend",
    category: "tech",
    keywords: ["frontend", "react", "next.js", "vue", "css", "web performance", "ux"]
  },
  {
    id: "cloud",
    label: "Cloud",
    category: "tech",
    keywords: ["cloud", "aws", "azure", "gcp", "serverless", "kubernetes", "platform"]
  },
  {
    id: "devops",
    label: "DevOps",
    category: "tech",
    keywords: [
      "devops",
      "docker",
      "kubernetes",
      "terraform",
      "ansible",
      "ci/cd",
      "gitops",
      "observability"
    ]
  },
  {
    id: "ia",
    label: "IA",
    category: "tech",
    keywords: ["ai", "ml", "llm", "agent", "rag", "inference", "openai", "model"]
  },
  {
    id: "data",
    label: "Data / ML",
    category: "tech",
    keywords: ["data", "machine learning", "deep learning", "pytorch", "tensorflow", "dataset"]
  },
  {
    id: "seguridad",
    label: "Seguridad",
    category: "tech",
    keywords: [
      "security",
      "ciberseguridad",
      "vulnerability",
      "cve",
      "zero-day",
      "xss",
      "csrf",
      "auth",
      "oauth"
    ]
  },
  {
    id: "mobile",
    label: "Mobile",
    category: "tech",
    keywords: ["mobile", "android", "ios", "react native", "flutter", "swift", "kotlin"]
  },
  {
    id: "open-source",
    label: "Open Source",
    category: "tech",
    keywords: ["open source", "github", "community", "maintainer", "license", "oss"]
  },
  {
    id: "anime",
    label: "Anime",
    category: "friki",
    keywords: ["anime", "otaku", "seasonal anime", "anime trailer", "anime studio"]
  },
  {
    id: "manga",
    label: "Manga",
    category: "friki",
    keywords: ["manga", "shonen", "seinen", "mangaka", "tankobon"]
  },
  {
    id: "videojuegos",
    label: "Videojuegos",
    category: "friki",
    keywords: ["videojuegos", "gaming", "gameplay", "game release", "steam", "xbox", "playstation"]
  },
  {
    id: "cine",
    label: "Cine",
    category: "friki",
    keywords: ["cine", "movie", "film", "box office", "director", "trailer"]
  },
  {
    id: "series",
    label: "Series",
    category: "friki",
    keywords: ["series", "tv show", "streaming", "season finale", "netflix", "hbo"]
  },
  {
    id: "comics",
    label: "Comics",
    category: "friki",
    keywords: ["comics", "marvel", "dc", "graphic novel", "superhero"]
  },
  {
    id: "cultura-pop",
    label: "Cultura Pop",
    category: "friki",
    keywords: ["cultura pop", "fandom", "cosplay", "fan event", "friki", "geek culture"]
  },
  {
    id: "nintendo",
    label: "Nintendo",
    category: "friki",
    keywords: ["nintendo", "switch", "zelda", "mario", "pokemon"]
  }
];

const DEFAULT_CATALOG_IDS = [
  "java-spring",
  "backend",
  "cloud",
  "devops",
  "ia",
  "seguridad",
  "anime",
  "manga",
  "videojuegos",
  "cine",
  "series",
  "cultura-pop"
];

export const DEFAULT_SELECTED_INTEREST_IDS = [
  "java-spring",
  "devops",
  "ia",
  "seguridad",
  "anime",
  "videojuegos"
];

const LEGACY_INTEREST_MAP: Record<string, string> = {
  java_spring: "java-spring",
  devops: "devops",
  ia: "ia",
  seguridad: "seguridad",
  "java-spring": "java-spring"
};

const BUILT_IN_MAP = new Map<string, InterestDefinition>(
  BUILT_IN_INTERESTS.map((interest) => [interest.id, asBuiltIn(interest)])
);

const BUILT_IN_IDS = new Set(BUILT_IN_INTERESTS.map((interest) => interest.id));

export const BUILT_IN_INTEREST_LIBRARY: InterestDefinition[] = BUILT_IN_INTERESTS.map((interest) =>
  asBuiltIn(interest)
);

export const DEFAULT_INTEREST_CATALOG: InterestDefinition[] = DEFAULT_CATALOG_IDS.map((id) => {
  const item = BUILT_IN_MAP.get(id);
  return item ? cloneInterest(item) : null;
}).filter((item): item is InterestDefinition => item !== null);

export function buildDefaultInterestCatalog(): InterestDefinition[] {
  return DEFAULT_INTEREST_CATALOG.map(cloneInterest);
}

export function buildDefaultSelectedInterestIds(
  catalog: InterestDefinition[] = DEFAULT_INTEREST_CATALOG
): string[] {
  const ids = new Set(catalog.map((interest) => interest.id));
  const selected = DEFAULT_SELECTED_INTEREST_IDS.filter((id) => ids.has(id));
  return selected.length > 0 ? selected : catalog.slice(0, 3).map((interest) => interest.id);
}

export function normalizeInterestId(value: string): string {
  return normalizeToken(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function sanitizeInterestLabel(value: string): string {
  return compactSpaces(value).slice(0, 60);
}

export function sanitizeKeywords(
  values: unknown,
  maxKeywords = MAX_KEYWORDS_PER_INTEREST
): string[] {
  const keywords = normalizeKeywordInput(values);
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const rawKeyword of keywords) {
    const keyword = compactSpaces(rawKeyword).slice(0, 48).toLowerCase();
    const normalized = normalizeToken(keyword);
    if (!keyword || normalized.length < 2 || seen.has(normalized)) {
      continue;
    }
    deduped.push(keyword);
    seen.add(normalized);
    if (deduped.length >= maxKeywords) {
      break;
    }
  }

  return deduped;
}

export function sanitizeInterestCatalog(values: unknown): InterestDefinition[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const sanitized: InterestDefinition[] = [];
  const ids = new Set<string>();

  for (const value of values) {
    const interest = parseInterestObject(value);
    if (!interest || ids.has(interest.id)) {
      continue;
    }
    sanitized.push(interest);
    ids.add(interest.id);

    if (sanitized.length >= MAX_INTERESTS_PER_USER) {
      break;
    }
  }

  return sortInterestCatalog(sanitized);
}

export function sanitizeSelectedInterestIds(values: unknown, catalog: InterestDefinition[]): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const validIds = new Set(catalog.map((interest) => interest.id));
  const deduped = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const id = normalizeInterestId(mapLegacyInterestId(value));
    if (validIds.has(id)) {
      deduped.add(id);
    }
  }

  return Array.from(deduped);
}

export function sanitizeInterestSelection(values: unknown): InterestDefinition[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const byId = new Map<string, InterestDefinition>();

  for (const value of values) {
    if (typeof value === "string") {
      const mapped = mapLegacyInterestId(value);
      const builtIn = BUILT_IN_MAP.get(mapped);
      if (builtIn) {
        byId.set(builtIn.id, cloneInterest(builtIn));
      }
      continue;
    }

    const interest = parseInterestObject(value);
    if (interest) {
      byId.set(interest.id, interest);
    }
  }

  return Array.from(byId.values()).slice(0, MAX_INTERESTS_PER_USER);
}

export function getInterestsByIds(ids: string[], catalog: InterestDefinition[]): InterestDefinition[] {
  const map = new Map(catalog.map((interest) => [interest.id, interest]));
  const result: InterestDefinition[] = [];

  for (const id of ids) {
    const interest = map.get(id);
    if (interest) {
      result.push(cloneInterest(interest));
    }
  }

  return result;
}

export function getSuggestedBuiltInInterests(
  catalog: InterestDefinition[],
  limit = 8
): InterestDefinition[] {
  const existing = new Set(catalog.map((interest) => interest.id));
  const suggestions = BUILT_IN_INTEREST_LIBRARY.filter((interest) => !existing.has(interest.id));
  return suggestions.slice(0, limit).map(cloneInterest);
}

export function buildCustomInterest(input: {
  label: string;
  keywordsInput: unknown;
  existingCatalog: InterestDefinition[];
}): { interest?: InterestDefinition; error?: string } {
  const label = sanitizeInterestLabel(input.label);
  if (!label) {
    return { error: "El interés necesita un nombre." };
  }

  const keywords = sanitizeKeywords(input.keywordsInput);
  if (keywords.length === 0) {
    return { error: "Añade al menos una keyword para el interés." };
  }

  const existingIds = new Set(input.existingCatalog.map((interest) => interest.id));
  const baseId = normalizeInterestId(label) || `custom-${Date.now()}`;
  let nextId = baseId;
  let suffix = 2;
  while (existingIds.has(nextId)) {
    nextId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return {
    interest: {
      id: nextId,
      label,
      keywords,
      category: "custom",
      isBuiltIn: false
    }
  };
}

export function updateInterestDraft(
  current: InterestDefinition,
  input: { label: string; keywordsInput: unknown }
): { interest?: InterestDefinition; error?: string } {
  const label = sanitizeInterestLabel(input.label);
  if (!label) {
    return { error: "El interés necesita un nombre." };
  }

  const keywords = sanitizeKeywords(input.keywordsInput);
  if (keywords.length === 0) {
    return { error: "Añade al menos una keyword para el interés." };
  }

  return {
    interest: {
      ...current,
      label,
      keywords
    }
  };
}

export function sortInterestCatalog(catalog: InterestDefinition[]): InterestDefinition[] {
  const order: Record<InterestCategory, number> = {
    tech: 0,
    friki: 1,
    custom: 2
  };

  return [...catalog].sort((a, b) => {
    const byCategory = order[a.category] - order[b.category];
    if (byCategory !== 0) {
      return byCategory;
    }
    return a.label.localeCompare(b.label, "es");
  });
}

function parseInterestObject(value: unknown): InterestDefinition | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<InterestDefinition>;
  const label = sanitizeInterestLabel(item.label ?? "");
  const keywords = sanitizeKeywords(item.keywords);
  const rawId = typeof item.id === "string" && item.id.trim().length > 0 ? item.id : label;
  const id = normalizeInterestId(rawId);
  if (!id || !label || keywords.length === 0) {
    return null;
  }

  const builtIn = BUILT_IN_MAP.get(id);
  const category = isInterestCategory(item.category)
    ? item.category
    : builtIn?.category ?? "custom";

  return {
    id,
    label,
    keywords,
    category,
    isBuiltIn: Boolean(item.isBuiltIn ?? builtIn)
  };
}

function mapLegacyInterestId(value: string): string {
  const normalized = normalizeInterestId(value);
  return LEGACY_INTEREST_MAP[normalized] ?? LEGACY_INTEREST_MAP[value] ?? normalized;
}

function normalizeKeywordInput(values: unknown): string[] {
  if (Array.isArray(values)) {
    return values.flatMap((value) => (typeof value === "string" ? [value] : []));
  }
  if (typeof values === "string") {
    return values
      .split(/[,;\n]/g)
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

function compactSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeToken(value: string): string {
  return compactSpaces(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isInterestCategory(value: unknown): value is InterestCategory {
  return value === "tech" || value === "friki" || value === "custom";
}

function asBuiltIn(interest: BuiltInDefinition): InterestDefinition {
  return {
    ...interest,
    keywords: [...interest.keywords],
    isBuiltIn: true
  };
}

function cloneInterest(interest: InterestDefinition): InterestDefinition {
  return {
    ...interest,
    keywords: [...interest.keywords]
  };
}

export function isBuiltInInterestId(id: string): boolean {
  return BUILT_IN_IDS.has(id);
}

