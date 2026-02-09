export const INTERESTS = {
  java_spring: {
    label: "Java / Spring",
    keywords: [
      "java",
      "jvm",
      "spring",
      "spring boot",
      "hibernate",
      "maven",
      "gradle"
    ]
  },
  devops: {
    label: "DevOps",
    keywords: [
      "devops",
      "kubernetes",
      "docker",
      "terraform",
      "ansible",
      "ci/cd",
      "gitops",
      "platform engineering",
      "observability"
    ]
  },
  ia: {
    label: "IA",
    keywords: [
      "ai",
      "ml",
      "llm",
      "agent",
      "rag",
      "inference",
      "openai",
      "model"
    ]
  },
  seguridad: {
    label: "Seguridad",
    keywords: [
      "security",
      "vulnerability",
      "cve",
      "zero-day",
      "xss",
      "csrf",
      "oauth",
      "encryption",
      "auth"
    ]
  }
} as const;

export type InterestKey = keyof typeof INTERESTS;

export function isInterestKey(value: string): value is InterestKey {
  return value in INTERESTS;
}

