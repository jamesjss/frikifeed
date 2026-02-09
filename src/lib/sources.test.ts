import assert from "node:assert/strict";
import test from "node:test";
import type { InterestDefinition } from "@/lib/interests";
import { SOURCES, suggestSources } from "@/lib/sources";

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

test("suggestSources usa fallback estable cuando no hay señales", () => {
  const suggestions = suggestSources({
    selectedSourceIds: [],
    selectedInterests: [],
    limit: 3
  });

  assert.deepEqual(
    suggestions.map((source) => source.id),
    SOURCES.slice(0, 3).map((source) => source.id)
  );
});
