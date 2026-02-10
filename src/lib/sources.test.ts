import assert from "node:assert/strict";
import test from "node:test";
import type { InterestDefinition } from "@/lib/interests";
import { buildRealRssRecommendations, suggestSources } from "@/lib/sources";

const selectedInterests: InterestDefinition[] = [
  {
    id: "ia",
    label: "IA",
    keywords: ["llm", "agent"],
    category: "tech",
    isBuiltIn: true
  }
];

test("suggestSources excluye fuentes seleccionadas y prioriza relacionadas", () => {
  const selectedSourceIds = ["hn-front"];
  const suggestions = suggestSources({
    selectedSourceIds,
    selectedInterests,
    limit: 4
  });

  assert.equal(suggestions.length, 4);
  assert.equal(
    suggestions.some((source) => selectedSourceIds.includes(source.id)),
    false
  );

  const relatedToHn = new Set(["lobsters", "devops-com", "towards-data", "vidaextra"]);
  assert.equal(
    suggestions.some((source) => relatedToHn.has(source.id)),
    true
  );
});

test("suggestSources devuelve vacío cuando no hay señales", () => {
  const suggestions = suggestSources({
    selectedSourceIds: [],
    selectedInterests: [],
    limit: 3
  });

  assert.deepEqual(suggestions, []);
});

test("buildRealRssRecommendations crea feeds reales para intereses custom", () => {
  const customInterest: InterestDefinition = {
    id: "cafeteras",
    label: "Cafeteras",
    keywords: ["cafe", "espresso", "barista"],
    category: "custom",
    isBuiltIn: false
  };

  const recommendations = buildRealRssRecommendations([customInterest], 3);

  assert.equal(recommendations.length, 3);
  assert.equal(
    recommendations.every((source) => source.feedUrl.startsWith("https://")),
    true
  );
  assert.equal(
    recommendations.some((source) => source.feedUrl.includes("news.google.com/rss/search")),
    true
  );
  assert.equal(
    recommendations.some((source) => source.feedUrl.includes("bing.com/news/search")),
    true
  );
});

test("buildRealRssRecommendations ignora intereses no custom", () => {
  const recommendations = buildRealRssRecommendations(selectedInterests, 4);
  assert.deepEqual(recommendations, []);
});
