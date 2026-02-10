import assert from "node:assert/strict";
import test from "node:test";
import type { InterestDefinition } from "@/lib/interests";
import { __rssPipelineTestables } from "@/lib/rss-pipeline";

const interests: InterestDefinition[] = [
  {
    id: "ia",
    label: "IA",
    keywords: ["llm", "agent"],
    category: "tech",
    isBuiltIn: true
  },
  {
    id: "seguridad",
    label: "Seguridad",
    keywords: ["cve"],
    category: "tech",
    isBuiltIn: true
  }
];

test("scoreItem puntúa keywords e intereses encontrados", () => {
  const selectedKeywords = Array.from(__rssPipelineTestables.getSelectedKeywords(interests));
  const interestMatchers = __rssPipelineTestables.buildInterestMatchers(interests);
  const scored = __rssPipelineTestables.scoreItem(
    {
      id: "item-1",
      title: "Nuevo agent para detectar CVE críticas",
      link: "https://example.com/post",
      sourceId: "hn-front",
      source: "Hacker News",
      publishedAt: null,
      text: "Este post explica un LLM de seguridad para revisar CVE y automatizar alertas."
    },
    interestMatchers,
    selectedKeywords
  );

  assert.equal(scored.score, 7);
  assert.deepEqual(scored.matchedKeywords, ["llm", "agent", "cve"]);
  assert.deepEqual(
    scored.matchedInterests.map((interest) => interest.id),
    ["ia", "seguridad"]
  );
});

test("scoreItem devuelve score 0 cuando no hay matches", () => {
  const selectedKeywords = Array.from(__rssPipelineTestables.getSelectedKeywords(interests));
  const interestMatchers = __rssPipelineTestables.buildInterestMatchers(interests);
  const scored = __rssPipelineTestables.scoreItem(
    {
      id: "item-2",
      title: "Actualización de cocina molecular",
      link: "https://example.com/food",
      sourceId: "hn-front",
      source: "Hacker News",
      publishedAt: null,
      text: "Recetas avanzadas para fermentación y pan artesanal."
    },
    interestMatchers,
    selectedKeywords
  );

  assert.equal(scored.score, 0);
  assert.deepEqual(scored.matchedKeywords, []);
  assert.deepEqual(scored.matchedInterests, []);
});

test("toStringValue no rompe con objetos no convertibles", () => {
  const uncoercibleObject = {
    toString() {
      return {} as unknown as string;
    },
    valueOf() {
      return {} as unknown as number;
    }
  };

  assert.doesNotThrow(() => __rssPipelineTestables.toStringValue(uncoercibleObject));
  assert.equal(__rssPipelineTestables.toStringValue(uncoercibleObject), "");
});

test("toStringValue extrae texto de objetos RSS comunes", () => {
  const rssTextObject = { _: "Kotaku feed item" };
  assert.equal(__rssPipelineTestables.toStringValue(rssTextObject), "Kotaku feed item");
});
