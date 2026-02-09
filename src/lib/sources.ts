import type { InterestKey } from "@/lib/interests";

export type SourceConfig = {
  id: string;
  name: string;
  websiteUrl: string;
  feedUrl: string;
  description: string;
  interests: InterestKey[];
  relatedSourceIds: string[];
};

export type SourceId = string;

export const SOURCES: SourceConfig[] = [
  {
    id: "hn-front",
    name: "Hacker News",
    websiteUrl: "https://news.ycombinator.com",
    feedUrl: "https://hnrss.org/frontpage",
    description: "Noticias y lanzamientos tech en general.",
    interests: ["java_spring", "devops", "ia", "seguridad"],
    relatedSourceIds: ["lobsters", "devops-com", "towards-data"]
  },
  {
    id: "lobsters",
    name: "Lobsters",
    websiteUrl: "https://lobste.rs",
    feedUrl: "https://lobste.rs/rss",
    description: "Comunidad técnica con foco en ingeniería de software.",
    interests: ["java_spring", "devops", "ia", "seguridad"],
    relatedSourceIds: ["hn-front", "devops-com", "krebsonsecurity"]
  },
  {
    id: "infoq-java",
    name: "InfoQ Java",
    websiteUrl: "https://www.infoq.com/java/",
    feedUrl: "https://feed.infoq.com/java",
    description: "Arquitectura, JVM y ecosistema Java.",
    interests: ["java_spring"],
    relatedSourceIds: ["spring-blog", "baeldung"]
  },
  {
    id: "spring-blog",
    name: "Spring Blog",
    websiteUrl: "https://spring.io/blog",
    feedUrl: "https://spring.io/blog.atom",
    description: "Novedades oficiales de Spring Framework y Spring Boot.",
    interests: ["java_spring"],
    relatedSourceIds: ["infoq-java", "baeldung"]
  },
  {
    id: "baeldung",
    name: "Baeldung",
    websiteUrl: "https://www.baeldung.com",
    feedUrl: "https://feeds.feedburner.com/Baeldung",
    description: "Tutoriales prácticos de Java, Spring y backend.",
    interests: ["java_spring"],
    relatedSourceIds: ["infoq-java", "spring-blog"]
  },
  {
    id: "devops-com",
    name: "DevOps.com",
    websiteUrl: "https://devops.com",
    feedUrl: "https://devops.com/feed/",
    description: "Prácticas DevOps, plataforma y entrega continua.",
    interests: ["devops", "seguridad"],
    relatedSourceIds: ["kubernetes-blog", "hn-front", "krebsonsecurity"]
  },
  {
    id: "kubernetes-blog",
    name: "Kubernetes Blog",
    websiteUrl: "https://kubernetes.io/blog/",
    feedUrl: "https://kubernetes.io/feed.xml",
    description: "Actualizaciones del ecosistema Kubernetes y cloud native.",
    interests: ["devops", "seguridad"],
    relatedSourceIds: ["devops-com", "lobsters"]
  },
  {
    id: "towards-data",
    name: "Towards Data Science",
    websiteUrl: "https://towardsdatascience.com",
    feedUrl: "https://towardsdatascience.com/feed",
    description: "Artículos de IA, ML y data engineering.",
    interests: ["ia"],
    relatedSourceIds: ["ml-mastery", "hn-front"]
  },
  {
    id: "ml-mastery",
    name: "Machine Learning Mastery",
    websiteUrl: "https://machinelearningmastery.com",
    feedUrl: "https://machinelearningmastery.com/feed/",
    description: "Guías técnicas de machine learning orientadas a práctica.",
    interests: ["ia"],
    relatedSourceIds: ["towards-data", "hn-front"]
  },
  {
    id: "krebsonsecurity",
    name: "Krebs on Security",
    websiteUrl: "https://krebsonsecurity.com",
    feedUrl: "https://krebsonsecurity.com/feed/",
    description: "Análisis de incidentes y tendencias de ciberseguridad.",
    interests: ["seguridad"],
    relatedSourceIds: ["the-hacker-news", "devops-com", "lobsters"]
  },
  {
    id: "the-hacker-news",
    name: "The Hacker News",
    websiteUrl: "https://thehackernews.com",
    feedUrl: "https://feeds.feedburner.com/TheHackersNews",
    description: "Alertas y noticias de seguridad ofensiva/defensiva.",
    interests: ["seguridad"],
    relatedSourceIds: ["krebsonsecurity", "devops-com"]
  }
];

export const DEFAULT_SOURCE_IDS: SourceId[] = [
  "hn-front",
  "infoq-java",
  "devops-com",
  "towards-data",
  "krebsonsecurity"
];

const sourceMap = new Map(SOURCES.map((source) => [source.id, source]));
const sourceIdSet = new Set(SOURCES.map((source) => source.id));

export function isSourceId(value: string): value is SourceId {
  return sourceIdSet.has(value);
}

export function sanitizeSourceIds(values: string[]): SourceId[] {
  const deduped = Array.from(new Set(values));
  return deduped.filter((value): value is SourceId => isSourceId(value));
}

export function getSourcesByIds(sourceIds: SourceId[]): SourceConfig[] {
  const result: SourceConfig[] = [];
  for (const id of sourceIds) {
    const source = sourceMap.get(id);
    if (source) {
      result.push(source);
    }
  }
  return result;
}

type SuggestSourcesInput = {
  selectedSourceIds: SourceId[];
  selectedInterests: InterestKey[];
  limit?: number;
};

export function suggestSources(input: SuggestSourcesInput): SourceConfig[] {
  const { selectedSourceIds, selectedInterests, limit = 4 } = input;
  const selectedSet = new Set(selectedSourceIds);
  const selectedSources = getSourcesByIds(selectedSourceIds);
  const weights = new Map<InterestKey, number>();

  for (const interest of selectedInterests) {
    weights.set(interest, (weights.get(interest) ?? 0) + 4);
  }

  for (const source of selectedSources) {
    for (const interest of source.interests) {
      weights.set(interest, (weights.get(interest) ?? 0) + 2);
    }
  }

  const scored = SOURCES.filter((source) => !selectedSet.has(source.id))
    .map((source) => {
      let score = 0;

      for (const interest of source.interests) {
        score += weights.get(interest) ?? 0;
      }

      const relatedFromSelected = selectedSources.some((item) =>
        item.relatedSourceIds.includes(source.id)
      );
      const relatedToSelected = source.relatedSourceIds.some((id) => selectedSet.has(id));
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
    .sort((a, b) => b.score - a.score || a.source.name.localeCompare(b.source.name))
    .slice(0, limit)
    .map(({ source }) => source);
}

