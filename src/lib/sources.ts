import type { InterestDefinition } from "@/lib/interests";

export type SourceConfig = {
  id: string;
  name: string;
  websiteUrl: string;
  feedUrl: string;
  description: string;
  topics: string[];
  relatedSourceIds: string[];
};

export type SourceId = string;

export const SOURCES: SourceConfig[] = [
  {
    id: "hn-front",
    name: "Hacker News",
    websiteUrl: "https://news.ycombinator.com",
    feedUrl: "https://hnrss.org/frontpage",
    description: "Noticias de ingeniería, startups y cultura hacker.",
    topics: ["backend", "frontend", "cloud", "devops", "ia", "seguridad", "open-source"],
    relatedSourceIds: ["lobsters", "devops-com", "towards-data", "vidaextra"]
  },
  {
    id: "lobsters",
    name: "Lobsters",
    websiteUrl: "https://lobste.rs",
    feedUrl: "https://lobste.rs/rss",
    description: "Comunidad técnica con foco en software y arquitectura.",
    topics: ["backend", "open-source", "devops", "seguridad"],
    relatedSourceIds: ["hn-front", "devops-com", "krebsonsecurity"]
  },
  {
    id: "infoq-java",
    name: "InfoQ Java",
    websiteUrl: "https://www.infoq.com/java/",
    feedUrl: "https://feed.infoq.com/java",
    description: "Java enterprise, Spring y arquitectura backend.",
    topics: ["java-spring", "backend", "cloud", "devops"],
    relatedSourceIds: ["spring-blog", "baeldung"]
  },
  {
    id: "spring-blog",
    name: "Spring Blog",
    websiteUrl: "https://spring.io/blog",
    feedUrl: "https://spring.io/blog.atom",
    description: "Novedades oficiales de Spring Framework y Boot.",
    topics: ["java-spring", "backend", "seguridad"],
    relatedSourceIds: ["infoq-java", "baeldung"]
  },
  {
    id: "baeldung",
    name: "Baeldung",
    websiteUrl: "https://www.baeldung.com",
    feedUrl: "https://feeds.feedburner.com/Baeldung",
    description: "Tutoriales prácticos de backend, Java y seguridad.",
    topics: ["java-spring", "backend", "seguridad", "mobile"],
    relatedSourceIds: ["infoq-java", "spring-blog"]
  },
  {
    id: "devops-com",
    name: "DevOps.com",
    websiteUrl: "https://devops.com",
    feedUrl: "https://devops.com/feed/",
    description: "Artículos sobre CI/CD, cloud y plataforma.",
    topics: ["devops", "cloud", "seguridad", "open-source"],
    relatedSourceIds: ["kubernetes-blog", "hn-front", "krebsonsecurity"]
  },
  {
    id: "kubernetes-blog",
    name: "Kubernetes Blog",
    websiteUrl: "https://kubernetes.io/blog/",
    feedUrl: "https://kubernetes.io/feed.xml",
    description: "Actualizaciones cloud-native y ecosistema Kubernetes.",
    topics: ["cloud", "devops", "seguridad", "open-source"],
    relatedSourceIds: ["devops-com", "lobsters"]
  },
  {
    id: "towards-data",
    name: "Towards Data Science",
    websiteUrl: "https://towardsdatascience.com",
    feedUrl: "https://towardsdatascience.com/feed",
    description: "Machine learning y aplicaciones de IA.",
    topics: ["ia", "data", "backend"],
    relatedSourceIds: ["ml-mastery", "hn-front"]
  },
  {
    id: "ml-mastery",
    name: "Machine Learning Mastery",
    websiteUrl: "https://machinelearningmastery.com",
    feedUrl: "https://machinelearningmastery.com/feed/",
    description: "Guías prácticas de modelado y experimentación ML.",
    topics: ["ia", "data"],
    relatedSourceIds: ["towards-data", "hn-front"]
  },
  {
    id: "krebsonsecurity",
    name: "Krebs on Security",
    websiteUrl: "https://krebsonsecurity.com",
    feedUrl: "https://krebsonsecurity.com/feed/",
    description: "Investigación de ciberseguridad y amenazas reales.",
    topics: ["seguridad", "ciberseguridad"],
    relatedSourceIds: ["the-hacker-news", "devops-com"]
  },
  {
    id: "the-hacker-news",
    name: "The Hacker News",
    websiteUrl: "https://thehackernews.com",
    feedUrl: "https://feeds.feedburner.com/TheHackersNews",
    description: "Noticias rápidas de vulnerabilidades y seguridad.",
    topics: ["seguridad", "ciberseguridad"],
    relatedSourceIds: ["krebsonsecurity", "devops-com"]
  },
  {
    id: "anime-news-network",
    name: "Anime News Network",
    websiteUrl: "https://www.animenewsnetwork.com",
    feedUrl: "https://www.animenewsnetwork.com/all/rss.xml",
    description: "Noticias de anime, manga y lanzamientos.",
    topics: ["anime", "manga", "cultura-pop"],
    relatedSourceIds: ["myanimelist-news", "vidaextra"]
  },
  {
    id: "myanimelist-news",
    name: "MyAnimeList News",
    websiteUrl: "https://myanimelist.net/news",
    feedUrl: "https://myanimelist.net/rss/news.xml",
    description: "Actualidad del ecosistema anime y manga.",
    topics: ["anime", "manga"],
    relatedSourceIds: ["anime-news-network"]
  },
  {
    id: "vidaextra",
    name: "VidaExtra",
    websiteUrl: "https://www.vidaextra.com",
    feedUrl: "https://www.vidaextra.com/index.xml",
    description: "Videojuegos y cultura gamer en español.",
    topics: ["videojuegos", "cultura-pop", "nintendo"],
    relatedSourceIds: ["hobbyconsolas", "nintendolife", "gamesradar"]
  },
  {
    id: "hobbyconsolas",
    name: "HobbyConsolas",
    websiteUrl: "https://www.hobbyconsolas.com",
    feedUrl: "https://www.hobbyconsolas.com/rss",
    description: "Videojuegos, cine, series y entretenimiento geek.",
    topics: ["videojuegos", "cine", "series", "comics", "cultura-pop"],
    relatedSourceIds: ["vidaextra", "gamesradar", "espinof"]
  },
  {
    id: "gamesradar",
    name: "GamesRadar",
    websiteUrl: "https://www.gamesradar.com",
    feedUrl: "https://www.gamesradar.com/feeds/all/",
    description: "Gaming, cine y series con enfoque internacional.",
    topics: ["videojuegos", "cine", "series", "comics"],
    relatedSourceIds: ["hobbyconsolas", "nintendolife", "comingsoon"]
  },
  {
    id: "nintendolife",
    name: "Nintendo Life",
    websiteUrl: "https://www.nintendolife.com",
    feedUrl: "https://www.nintendolife.com/feeds/latest",
    description: "Novedades de Nintendo Switch y franquicias clásicas.",
    topics: ["nintendo", "videojuegos", "cultura-pop"],
    relatedSourceIds: ["vidaextra", "gamesradar"]
  },
  {
    id: "eurogamer",
    name: "Eurogamer",
    websiteUrl: "https://www.eurogamer.net",
    feedUrl: "https://www.eurogamer.net/rss",
    description: "Cobertura global de gaming, hardware y lanzamientos.",
    topics: ["videojuegos", "cultura-pop"],
    relatedSourceIds: ["gamesradar", "kotaku"]
  },
  {
    id: "kotaku",
    name: "Kotaku",
    websiteUrl: "https://kotaku.com",
    feedUrl: "https://kotaku.com/rss",
    description: "Noticias y opinión de videojuegos y cultura internet.",
    topics: ["videojuegos", "cultura-pop", "anime"],
    relatedSourceIds: ["eurogamer", "gamesradar"]
  },
  {
    id: "espinof",
    name: "Espinof",
    websiteUrl: "https://www.espinof.com",
    feedUrl: "https://www.espinof.com/index.xml",
    description: "Noticias de cine, series y streaming en español.",
    topics: ["cine", "series", "cultura-pop"],
    relatedSourceIds: ["comingsoon", "hobbyconsolas"]
  },
  {
    id: "comingsoon",
    name: "ComingSoon",
    websiteUrl: "https://www.comingsoon.net",
    feedUrl: "https://www.comingsoon.net/feed/",
    description: "Trailers y novedades de cine, series y cómic.",
    topics: ["cine", "series", "comics", "cultura-pop"],
    relatedSourceIds: ["espinof", "gamesradar"]
  }
];

export const DEFAULT_SOURCE_IDS: SourceId[] = [
  "hn-front",
  "devops-com",
  "towards-data",
  "krebsonsecurity",
  "anime-news-network",
  "vidaextra",
  "espinof",
  "gamesradar"
];

const SOURCE_MAP = new Map(SOURCES.map((source) => [source.id, source]));
const SOURCE_IDS = new Set(SOURCES.map((source) => source.id));

export function isSourceId(value: string): value is SourceId {
  return SOURCE_IDS.has(value);
}

export function sanitizeSourceIds(values: string[]): SourceId[] {
  const deduped = Array.from(new Set(values));
  return deduped.filter((value): value is SourceId => isSourceId(value));
}

export function getSourcesByIds(sourceIds: SourceId[]): SourceConfig[] {
  const result: SourceConfig[] = [];
  for (const id of sourceIds) {
    const source = SOURCE_MAP.get(id);
    if (source) {
      result.push(source);
    }
  }
  return result;
}

type SuggestSourcesInput = {
  selectedSourceIds: SourceId[];
  selectedInterests: InterestDefinition[];
  limit?: number;
};

export function suggestSources(input: SuggestSourcesInput): SourceConfig[] {
  const { selectedSourceIds, selectedInterests, limit = 4 } = input;
  const selectedSet = new Set(selectedSourceIds);
  const selectedSources = getSourcesByIds(selectedSourceIds);
  const selectedTokens = buildInterestTokens(selectedInterests);
  const selectedTopicTokens = buildSelectedTopicTokens(selectedSources);
  const relatedSourceIds = buildRelatedSourceIds(selectedSources);

  const scored = SOURCES.filter((source) => !selectedSet.has(source.id))
    .map((source) => {
      let score = 0;
      const sourceTokens = new Set(source.topics.map(normalizeToken));
      const sourceText = normalizeToken(`${source.name} ${source.description} ${source.topics.join(" ")}`);

      for (const token of selectedTokens) {
        if (sourceTokens.has(token)) {
          score += 4;
        } else if (token.length >= 4 && sourceText.includes(token)) {
          score += 1;
        }
      }

      if (hasTokenOverlap(sourceTokens, selectedTopicTokens)) {
        score += 2;
      }

      const relatedFromSelected = relatedSourceIds.has(source.id);
      const relatedToSelected = source.relatedSourceIds.some((sourceId) => selectedSet.has(sourceId));
      if (relatedFromSelected) {
        score += 6;
      }
      if (relatedToSelected) {
        score += 3;
      }

      return { source, score };
    })
    .filter(({ score }) => score > 0);

  if (scored.length === 0) {
    return SOURCES.filter((source) => !selectedSet.has(source.id)).slice(0, limit);
  }

  return scored
    .sort((a, b) => b.score - a.score || a.source.name.localeCompare(b.source.name, "es"))
    .slice(0, limit)
    .map(({ source }) => source);
}

function buildInterestTokens(interests: InterestDefinition[]): Set<string> {
  const tokens = new Set<string>();

  for (const interest of interests) {
    tokens.add(normalizeToken(interest.id));
    tokens.add(normalizeToken(interest.label));

    for (const keyword of interest.keywords) {
      tokens.add(normalizeToken(keyword));
    }
  }

  return tokens;
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSelectedTopicTokens(selectedSources: SourceConfig[]): Set<string> {
  const tokens = new Set<string>();
  for (const source of selectedSources) {
    for (const topic of source.topics) {
      tokens.add(normalizeToken(topic));
    }
  }
  return tokens;
}

function buildRelatedSourceIds(selectedSources: SourceConfig[]): Set<string> {
  const relatedIds = new Set<string>();
  for (const source of selectedSources) {
    for (const relatedId of source.relatedSourceIds) {
      relatedIds.add(relatedId);
    }
  }
  return relatedIds;
}

function hasTokenOverlap(base: Set<string>, incoming: Set<string>): boolean {
  for (const token of base) {
    if (incoming.has(token)) {
      return true;
    }
  }
  return false;
}
