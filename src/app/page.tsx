"use client";

import { useEffect, useMemo, useState } from "react";
import { INTERESTS, isInterestKey, type InterestKey } from "@/lib/interests";
import {
  DEFAULT_SOURCE_IDS,
  SOURCES,
  isSourceId,
  suggestSources,
  type SourceId
} from "@/lib/sources";

const STORAGE_KEY = "frikifeed:preferences";

type SourcePayload = {
  id: SourceId;
  name: string;
  websiteUrl: string;
  feedUrl: string;
};

type SummaryResponse = {
  generatedAt: string;
  interests: Array<{ key: InterestKey; label: string }>;
  sources: SourcePayload[];
  suggestedSources: SourcePayload[];
  email: string | null;
  limits: {
    maxItemsPerSource: number;
    maxTotalItems: number;
  };
  stats: {
    totalCandidates: number;
    totalReturned: number;
  };
  warnings: string[];
  items: Array<{
    id: string;
    title: string;
    link: string;
    sourceId: SourceId;
    source: string;
    publishedAt: string | null;
    summary: string;
    matchedKeywords: string[];
    matchedInterests: InterestKey[];
  }>;
};

type ErrorResponse = {
  error?: string;
};

type StoredPreferences = {
  email: string;
  interests: InterestKey[];
  sources: SourceId[];
};

const interestOptions = Object.entries(INTERESTS).map(([key, config]) => ({
  key: key as InterestKey,
  label: config.label
}));

export default function HomePage() {
  const [selectedInterests, setSelectedInterests] = useState<InterestKey[]>([]);
  const [selectedSources, setSelectedSources] = useState<SourceId[]>(DEFAULT_SOURCE_IDS);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const stored = JSON.parse(raw) as StoredPreferences;
      const validInterests = sanitizeStoredInterests(stored.interests);
      const validSources = sanitizeStoredSources(stored.sources);

      setEmail(stored.email ?? "");
      setSelectedInterests(validInterests);
      setSelectedSources(validSources.length > 0 ? validSources : DEFAULT_SOURCE_IDS);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const payload: StoredPreferences = {
      email,
      interests: selectedInterests,
      sources: selectedSources
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [email, selectedInterests, selectedSources]);

  const canGenerate = selectedInterests.length > 0 && selectedSources.length > 0 && !isLoading;
  const sourceSuggestions = useMemo(
    () =>
      suggestSources({
        selectedSourceIds: selectedSources,
        selectedInterests,
        limit: 4
      }),
    [selectedInterests, selectedSources]
  );

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests: selectedInterests,
          sources: selectedSources,
          email
        })
      });

      const payload = (await response.json()) as SummaryResponse | ErrorResponse;
      if (!response.ok) {
        setSummary(null);
        const message = "error" in payload ? payload.error : null;
        setError(message ?? "Error inesperado al generar el resumen.");
        return;
      }

      setSummary(payload as SummaryResponse);
    } catch {
      setSummary(null);
      setError("No se pudo conectar con la API local.");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleInterest(interest: InterestKey) {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest]
    );
  }

  function toggleSource(sourceId: SourceId) {
    setSelectedSources((prev) =>
      prev.includes(sourceId) ? prev.filter((item) => item !== sourceId) : [...prev, sourceId]
    );
  }

  function applySuggestedSources() {
    const suggestedIds = sourceSuggestions.map((source) => source.id);
    setSelectedSources((prev) => mergeSourceIds(prev, suggestedIds));
  }

  function addOneSource(sourceId: SourceId) {
    setSelectedSources((prev) => mergeSourceIds(prev, [sourceId]));
  }

  const generatedDate = useMemo(() => {
    if (!summary?.generatedAt) {
      return null;
    }
    const date = new Date(summary.generatedAt);
    return Number.isNaN(date.getTime()) ? summary.generatedAt : date.toLocaleString("es-ES");
  }, [summary?.generatedAt]);

  return (
    <main className="page">
      <section className="hero">
        <h1>Alertas Tech Personales</h1>
        <p>
          Elige intereses y genera un resumen tech al instante con RSS + filtro por keywords + mini
          resumen.
        </p>
      </section>

      <section className="panel">
        <h2 className="section-title">Intereses</h2>
        <div className="grid">
          {interestOptions.map((option) => (
            <label className="interest" key={option.key}>
              <input
                type="checkbox"
                checked={selectedInterests.includes(option.key)}
                onChange={() => toggleInterest(option.key)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

        <h2 className="section-title">Fuentes Web (RSS)</h2>
        <p className="small">
          Elige desde qué páginas quieres sacar contenido. Puedes combinar varias.
        </p>
        <div className="source-grid">
          {SOURCES.map((source) => (
            <label className="source-card" key={source.id}>
              <input
                type="checkbox"
                checked={selectedSources.includes(source.id)}
                onChange={() => toggleSource(source.id)}
              />
              <span className="source-copy">
                <strong>{source.name}</strong>
                <span className="small">{source.description}</span>
                <a href={source.websiteUrl} target="_blank" rel="noreferrer">
                  {toDomain(source.websiteUrl)}
                </a>
              </span>
            </label>
          ))}
        </div>

        <div className="suggestion-box">
          <div className="suggestion-head">
            <strong>Sugerencias automáticas de fuentes</strong>
            <button
              type="button"
              className="button-secondary"
              onClick={applySuggestedSources}
              disabled={sourceSuggestions.length === 0}
            >
              Agregar sugeridas
            </button>
          </div>
          <p className="small">Basadas en tus intereses y en las fuentes que ya seleccionaste.</p>
          <div className="suggestion-list">
            {sourceSuggestions.map((source) => (
              <button
                type="button"
                className="suggestion-chip"
                key={`suggest-${source.id}`}
                onClick={() => addOneSource(source.id)}
              >
                + {source.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="email">Email (opcional, solo guardado local en el MVP)</label>
          <input
            id="email"
            type="email"
            placeholder="tu-email@dominio.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="actions">
          <button className="button" onClick={handleGenerate} disabled={!canGenerate}>
            {isLoading ? "Generando..." : "Generar resumen"}
          </button>
          <span className="small">
            {selectedInterests.length > 0 && selectedSources.length > 0
              ? `${selectedInterests.length} interés(es) + ${selectedSources.length} fuente(s)`
              : "Selecciona al menos un interés y una fuente"}
          </span>
        </div>

        {error ? <p className="small" style={{ color: "#b42318" }}>{error}</p> : null}

        {summary?.warnings.length ? (
          <div className="warning-list">
            <strong>Advertencias de fuentes</strong>
            <ul>
              {summary.warnings.map((warning) => (
                <li key={warning} className="small">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {summary ? (
        <>
          <section className="result-head">
            <h2>Resultados ({summary.stats.totalReturned})</h2>
            <div className="small">
              {generatedDate ? <span className="success">Generado: {generatedDate}</span> : null}
              <br />
              <span>
                Fuentes usadas: {summary.sources.length} |{" "}
                Candidatos: {summary.stats.totalCandidates} | Límite total:{" "}
                {summary.limits.maxTotalItems}
              </span>
            </div>
          </section>

          <section className="cards">
            {summary.items.length === 0 ? (
              <p className="small">
                No hubo coincidencias para las keywords actuales. Prueba con otros intereses.
              </p>
            ) : (
              summary.items.map((item) => (
                <article className="card" key={item.id}>
                  <h3>
                    <a href={item.link} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                  </h3>
                  <p className="meta">
                    {item.source}
                    {item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleString("es-ES")}` : ""}
                  </p>
                  <p>{item.summary}</p>
                  <div className="tags">
                    {item.matchedInterests.map((interest) => (
                      <span className="tag" key={`${item.id}-${interest}`}>
                        {INTERESTS[interest].label}
                      </span>
                    ))}
                  </div>
                </article>
              ))
            )}
          </section>

          {summary.suggestedSources.length > 0 ? (
            <section className="panel" style={{ marginTop: "1rem" }}>
              <strong>Más fuentes sugeridas por el backend</strong>
              <div className="suggestion-list" style={{ marginTop: "0.6rem" }}>
                {summary.suggestedSources.map((source) => (
                  <button
                    type="button"
                    className="suggestion-chip"
                    key={`api-suggest-${source.id}`}
                    onClick={() => addOneSource(source.id)}
                  >
                    + {source.name}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

function sanitizeStoredInterests(values: unknown): InterestKey[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.filter((value): value is InterestKey => typeof value === "string" && isInterestKey(value));
}

function sanitizeStoredSources(values: unknown): SourceId[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.filter((value): value is SourceId => typeof value === "string" && isSourceId(value));
}

function mergeSourceIds(base: SourceId[], incoming: SourceId[]): SourceId[] {
  const set = new Set([...base, ...incoming]);
  return SOURCES.map((source) => source.id).filter((id) => set.has(id));
}

function toDomain(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return url;
  }
}
