"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  buildDefaultInterestCatalog,
  buildDefaultSelectedInterestIds,
  getInterestsByIds,
  getSuggestedBuiltInInterests,
  sanitizeInterestCatalog,
  sanitizeInterestSelection,
  sanitizeSelectedInterestIds,
  type InterestDefinition
} from "@/lib/interests";
import {
  DEFAULT_SOURCE_IDS,
  SOURCES,
  isSourceId,
  suggestSources,
  type SourceConfig,
  type SourceId
} from "@/lib/sources";

const STORAGE_KEY = "frikifeed:preferences";
const STORAGE_VERSION = 2;
const InterestManagerModal = dynamic(() => import("@/components/interest-manager-modal"));

type SourcePayload = {
  id: SourceId;
  name: string;
  websiteUrl: string;
  feedUrl: string;
};

type SummaryResponse = {
  generatedAt: string;
  interests: InterestDefinition[];
  sources: SourcePayload[];
  suggestedSources: SourcePayload[];
  email: string | null;
  limits: {
    maxItemsPerSource: number;
    maxTotalItems: number;
    maxKeywordsPerInterest: number;
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
    matchedInterests: Array<{ id: string; label: string }>;
  }>;
};

type ErrorResponse = {
  error?: string;
};

type StoredPreferencesV2 = {
  version: 2;
  email: string;
  sources: SourceId[];
  selectedInterestIds: string[];
  interestCatalog: InterestDefinition[];
};

type LegacyStoredPreferences = {
  email?: string;
  interests?: string[];
  sources?: string[];
};

type InterestsSectionProps = {
  interestCatalog: InterestDefinition[];
  selectedInterestIds: string[];
  onToggleInterest: (interestId: string) => void;
  onOpenManager: () => void;
};

type SourcesSectionProps = {
  selectedSources: SourceId[];
  sourceSuggestions: SourceConfig[];
  email: string;
  onToggleSource: (sourceId: SourceId) => void;
  onApplySuggestedSources: () => void;
  onAddOneSource: (sourceId: SourceId) => void;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

type SummaryResultsSectionProps = {
  summary: SummaryResponse;
  generatedDate: string | null;
  onAddOneSource: (sourceId: SourceId) => void;
};

export default function HomePage() {
  const [interestCatalog, setInterestCatalog] = useState<InterestDefinition[]>(() =>
    buildDefaultInterestCatalog()
  );
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>(() =>
    buildDefaultSelectedInterestIds()
  );
  const [selectedSources, setSelectedSources] = useState<SourceId[]>(DEFAULT_SOURCE_IDS);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;

      if (isStoredPreferencesV2(parsed)) {
        const sanitizedCatalog = sanitizeInterestCatalog(parsed.interestCatalog);
        const catalog = sanitizedCatalog.length > 0 ? sanitizedCatalog : buildDefaultInterestCatalog();
        const selected = sanitizeSelectedInterestIds(parsed.selectedInterestIds, catalog);
        const safeEmail = typeof parsed.email === "string" ? parsed.email : "";
        const safeSources = sanitizeStoredSources(parsed.sources);

        setInterestCatalog(catalog);
        setSelectedInterestIds(
          selected.length > 0 ? selected : buildDefaultSelectedInterestIds(catalog)
        );
        setSelectedSources(safeSources.length > 0 ? safeSources : DEFAULT_SOURCE_IDS);
        setEmail(safeEmail);
        return;
      }

      const legacy = parsed as LegacyStoredPreferences;
      const catalog = buildDefaultInterestCatalog();
      const selectedFromLegacy = sanitizeInterestSelection(legacy.interests ?? []).map(
        (interest) => interest.id
      );
      const selected = sanitizeSelectedInterestIds(selectedFromLegacy, catalog);
      const safeSources = sanitizeStoredSources(legacy.sources);
      const safeEmail = typeof legacy.email === "string" ? legacy.email : "";

      setInterestCatalog(catalog);
      setSelectedInterestIds(selected.length > 0 ? selected : buildDefaultSelectedInterestIds(catalog));
      setSelectedSources(safeSources.length > 0 ? safeSources : DEFAULT_SOURCE_IDS);
      setEmail(safeEmail);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const payload: StoredPreferencesV2 = {
      version: STORAGE_VERSION,
      email,
      sources: selectedSources,
      selectedInterestIds: sanitizeSelectedInterestIds(selectedInterestIds, interestCatalog),
      interestCatalog
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [email, selectedSources, selectedInterestIds, interestCatalog]);

  useEffect(() => {
    setSelectedInterestIds((prev) => {
      const next = sanitizeSelectedInterestIds(prev, interestCatalog);
      return sameStringArray(prev, next) ? prev : next;
    });
  }, [interestCatalog]);

  const selectedInterests = useMemo(
    () => getInterestsByIds(selectedInterestIds, interestCatalog),
    [selectedInterestIds, interestCatalog]
  );

  const sourceSuggestions = useMemo(
    () =>
      suggestSources({
        selectedSourceIds: selectedSources,
        selectedInterests,
        limit: 4
      }),
    [selectedSources, selectedInterests]
  );

  const interestSuggestions = useMemo(
    () => getSuggestedBuiltInInterests(interestCatalog, 8),
    [interestCatalog]
  );

  const canGenerate = selectedInterests.length > 0 && selectedSources.length > 0 && !isLoading;

  const handleGenerate = useCallback(async () => {
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
  }, [email, selectedInterests, selectedSources]);

  const toggleInterest = useCallback((interestId: string) => {
    setSelectedInterestIds((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId]
    );
  }, []);

  const toggleSource = useCallback((sourceId: SourceId) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
    );
  }, []);

  const applySuggestedSources = useCallback(() => {
    const suggestedIds = sourceSuggestions.map((source) => source.id);
    setSelectedSources((prev) => mergeSourceIds(prev, suggestedIds));
  }, [sourceSuggestions]);

  const addOneSource = useCallback((sourceId: SourceId) => {
    setSelectedSources((prev) => mergeSourceIds(prev, [sourceId]));
  }, []);

  const openInterestModal = useCallback(() => {
    setIsInterestModalOpen(true);
  }, []);

  const closeInterestModal = useCallback(() => {
    setIsInterestModalOpen(false);
  }, []);

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  }, []);

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
          Elige intereses y fuentes para generar un resumen RSS friki+tech con keywords dinámicas.
        </p>
      </section>

      <section className="panel">
        <InterestsSection
          interestCatalog={interestCatalog}
          selectedInterestIds={selectedInterestIds}
          onToggleInterest={toggleInterest}
          onOpenManager={openInterestModal}
        />
        <SourcesSection
          selectedSources={selectedSources}
          sourceSuggestions={sourceSuggestions}
          email={email}
          onToggleSource={toggleSource}
          onApplySuggestedSources={applySuggestedSources}
          onAddOneSource={addOneSource}
          onEmailChange={handleEmailChange}
        />

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

        {error ? (
          <p className="small" style={{ color: "#b42318" }}>
            {error}
          </p>
        ) : null}

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
        <SummaryResultsSection
          summary={summary}
          generatedDate={generatedDate}
          onAddOneSource={addOneSource}
        />
      ) : null}

      {isInterestModalOpen ? (
        <InterestManagerModal
          interestCatalog={interestCatalog}
          selectedInterestIds={selectedInterestIds}
          interestSuggestions={interestSuggestions}
          onClose={closeInterestModal}
          setInterestCatalog={setInterestCatalog}
          setSelectedInterestIds={setSelectedInterestIds}
        />
      ) : null}
    </main>
  );
}

const InterestsSection = memo(function InterestsSection({
  interestCatalog,
  selectedInterestIds,
  onToggleInterest,
  onOpenManager
}: InterestsSectionProps) {
  const selectedSet = useMemo(() => new Set(selectedInterestIds), [selectedInterestIds]);

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">Intereses</h2>
        <button type="button" className="button-secondary" onClick={onOpenManager}>
          Gestionar intereses
        </button>
      </div>
      <div className="grid">
        {interestCatalog.map((interest) => (
          <label className="interest" key={interest.id}>
            <input
              type="checkbox"
              checked={selectedSet.has(interest.id)}
              onChange={() => onToggleInterest(interest.id)}
            />
            <span>
              <strong>{interest.label}</strong>
              <br />
              <span className="small">
                {formatInterestCategory(interest.category)} · {interest.keywords.length} keywords
              </span>
            </span>
          </label>
        ))}
      </div>
    </>
  );
});

const SourcesSection = memo(function SourcesSection({
  selectedSources,
  sourceSuggestions,
  email,
  onToggleSource,
  onApplySuggestedSources,
  onAddOneSource,
  onEmailChange
}: SourcesSectionProps) {
  const selectedSet = useMemo(() => new Set(selectedSources), [selectedSources]);

  return (
    <>
      <h2 className="section-title">Fuentes Web (RSS)</h2>
      <p className="small">
        Elige desde qué páginas quieres sacar contenido. Puedes combinar tech y friki.
      </p>
      <div className="source-grid">
        {SOURCES.map((source) => (
          <label className="source-card" key={source.id}>
            <input
              type="checkbox"
              checked={selectedSet.has(source.id)}
              onChange={() => onToggleSource(source.id)}
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
            onClick={onApplySuggestedSources}
            disabled={sourceSuggestions.length === 0}
          >
            Agregar sugeridas
          </button>
        </div>
        <p className="small">Basadas en tus intereses activos y en las fuentes ya seleccionadas.</p>
        <div className="suggestion-list">
          {sourceSuggestions.map((source) => (
            <button
              type="button"
              className="suggestion-chip"
              key={`suggest-source-${source.id}`}
              onClick={() => onAddOneSource(source.id)}
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
          onChange={onEmailChange}
        />
      </div>
    </>
  );
});

const SummaryResultsSection = memo(function SummaryResultsSection({
  summary,
  generatedDate,
  onAddOneSource
}: SummaryResultsSectionProps) {
  return (
    <>
      <section className="result-head">
        <h2>Resultados ({summary.stats.totalReturned})</h2>
        <div className="small">
          {generatedDate ? <span className="success">Generado: {generatedDate}</span> : null}
          <br />
          <span>
            Fuentes usadas: {summary.sources.length} | Candidatos: {summary.stats.totalCandidates} |
            Límite total: {summary.limits.maxTotalItems}
          </span>
        </div>
      </section>

      <section className="cards">
        {summary.items.length === 0 ? (
          <p className="small">
            No hubo coincidencias para las keywords actuales. Ajusta intereses o añade nuevas keywords.
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
                  <span className="tag" key={`${item.id}-${interest.id}`}>
                    {interest.label}
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
                onClick={() => onAddOneSource(source.id)}
              >
                + {source.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
});

function formatInterestCategory(category: InterestDefinition["category"]): string {
  if (category === "tech") {
    return "Tech";
  }
  if (category === "friki") {
    return "Friki";
  }
  return "Custom";
}

function sanitizeStoredSources(values: unknown): SourceId[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const set = new Set<SourceId>();
  for (const value of values) {
    if (typeof value === "string" && isSourceId(value)) {
      set.add(value);
    }
  }
  return Array.from(set);
}

function mergeSourceIds(base: SourceId[], incoming: SourceId[]): SourceId[] {
  const set = new Set([...base, ...incoming]);
  return SOURCES.map((source) => source.id).filter((id): id is SourceId => set.has(id));
}

function toDomain(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return url;
  }
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

function isStoredPreferencesV2(value: unknown): value is StoredPreferencesV2 {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (value as StoredPreferencesV2).version === STORAGE_VERSION;
}
