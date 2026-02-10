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
  buildRealRssRecommendations,
  DEFAULT_SOURCE_IDS,
  SOURCES,
  getSourcesByIds,
  isSourceId,
  suggestSources,
  type SourceConfig,
  type SourceId
} from "@/lib/sources";

const STORAGE_KEY = "frikifeed:preferences";
const STORAGE_BACKUP_KEY = "frikifeed:preferences:backup";
const STORAGE_VERSION = 3;
const SUMMARY_ENDPOINTS = ["/api/summary", "/api/digest"] as const;
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

type SourceSelectionMode = "auto" | "custom";

type StoredPreferencesV3 = {
  version: 3;
  email: string;
  sourceMode: SourceSelectionMode;
  customSources: SourceId[];
  selectedInterestIds: string[];
  interestCatalog: InterestDefinition[];
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

type SourceModeSectionProps = {
  sourceMode: SourceSelectionMode;
  selectedInterestCount: number;
  selectedSources: SourceId[];
  recommendedSources: SourceConfig[];
  customSourceSuggestions: SourceConfig[];
  email: string;
  onEnableCustomMode: () => void;
  onUseAutomaticMode: () => void;
  onToggleSource: (sourceId: SourceId) => void;
  onApplyCustomSuggestions: () => void;
  onUseRecommendedAsCustom: () => void;
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
  const [selectedSources, setSelectedSources] = useState<SourceId[]>([]);
  const [sourceMode, setSourceMode] = useState<SourceSelectionMode>("auto");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);

  useEffect(() => {
    const parsed = readStoredPreferences();
    if (!parsed) {
      setHasLoadedPreferences(true);
      return;
    }

    if (isStoredPreferencesV3(parsed)) {
      const sanitizedCatalog = sanitizeInterestCatalog(parsed.interestCatalog);
      const catalog = sanitizedCatalog.length > 0 ? sanitizedCatalog : buildDefaultInterestCatalog();
      const selected = sanitizeSelectedInterestIds(parsed.selectedInterestIds, catalog);
      const safeMode = sanitizeSourceMode(parsed.sourceMode);
      const safeCustomSources = sanitizeStoredSources(parsed.customSources);
      const safeEmail = typeof parsed.email === "string" ? parsed.email : "";

      setInterestCatalog(catalog);
      setSelectedInterestIds(
        selected.length > 0 ? selected : buildDefaultSelectedInterestIds(catalog)
      );
      setSourceMode(safeMode);
      setSelectedSources(safeCustomSources);
      setEmail(safeEmail);
      setHasLoadedPreferences(true);
      return;
    }

    if (isStoredPreferencesV2(parsed)) {
      const sanitizedCatalog = sanitizeInterestCatalog(parsed.interestCatalog);
      const catalog = sanitizedCatalog.length > 0 ? sanitizedCatalog : buildDefaultInterestCatalog();
      const selected = sanitizeSelectedInterestIds(parsed.selectedInterestIds, catalog);
      const safeEmail = typeof parsed.email === "string" ? parsed.email : "";
      const safeSources = sanitizeStoredSources(parsed.sources);
      const inferredMode: SourceSelectionMode =
        safeSources.length > 0 && !isDefaultSourceSelection(safeSources) ? "custom" : "auto";

      setInterestCatalog(catalog);
      setSelectedInterestIds(
        selected.length > 0 ? selected : buildDefaultSelectedInterestIds(catalog)
      );
      setSourceMode(inferredMode);
      setSelectedSources(safeSources);
      setEmail(safeEmail);
      setHasLoadedPreferences(true);
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
    setSourceMode(safeSources.length > 0 ? "custom" : "auto");
    setSelectedSources(safeSources);
    setEmail(safeEmail);
    setHasLoadedPreferences(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedPreferences) {
      return;
    }
    const payload: StoredPreferencesV3 = {
      version: STORAGE_VERSION,
      email,
      sourceMode,
      customSources: selectedSources,
      selectedInterestIds: sanitizeSelectedInterestIds(selectedInterestIds, interestCatalog),
      interestCatalog
    };
    persistStoredPreferences(payload);
  }, [hasLoadedPreferences, email, sourceMode, selectedSources, selectedInterestIds, interestCatalog]);

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

  const discoveredRealSources = useMemo(
    () => buildRealRssRecommendations(selectedInterests, 6),
    [selectedInterests]
  );

  const catalogRecommendedSources = useMemo(
    () =>
      suggestSources({
        selectedSourceIds: [],
        selectedInterests,
        limit: 8
      }),
    [selectedInterests]
  );

  const recommendedSources = useMemo(
    () => mergeSourceConfigs(discoveredRealSources, catalogRecommendedSources, 8),
    [discoveredRealSources, catalogRecommendedSources]
  );

  const recommendedSourceIds = useMemo(
    () =>
      recommendedSources
        .map((source) => source.id)
        .filter((sourceId): sourceId is SourceId => isSourceId(sourceId)),
    [recommendedSources]
  );

  const customSourceSuggestions = useMemo(
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

  const effectiveSourceIds = useMemo(
    () => (sourceMode === "custom" ? selectedSources : recommendedSourceIds),
    [sourceMode, selectedSources, recommendedSourceIds]
  );

  const sourceOverrides = useMemo(
    () =>
      sourceMode === "auto"
        ? recommendedSources.filter((source) => !isSourceId(source.id))
        : [],
    [sourceMode, recommendedSources]
  );

  const effectiveSources = useMemo(
    () =>
      sourceMode === "custom"
        ? getSourcesByIds(selectedSources)
        : mergeSourceConfigs(getSourcesByIds(recommendedSourceIds), sourceOverrides, 8),
    [sourceMode, selectedSources, recommendedSourceIds, sourceOverrides]
  );

  const canGenerate = selectedInterests.length > 0 && effectiveSources.length > 0 && !isLoading;

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const requestInit: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests: selectedInterests,
          sources: effectiveSourceIds,
          sourceOverrides: sourceOverrides.map((source) => ({
            id: source.id,
            name: source.name,
            websiteUrl: source.websiteUrl,
            feedUrl: source.feedUrl,
            description: source.description,
            topics: source.topics
          })),
          email
        })
      };

      const response = await requestSummaryWithFallback(requestInit);

      const rawBody = await response.text();
      const payload = parseApiPayload(rawBody);

      if (!response.ok) {
        setSummary(null);
        const message =
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : `Error ${response.status} al generar el resumen.`;
        setError(message);
        return;
      }

      if (!payload || !isSummaryResponse(payload)) {
        setSummary(null);
        setError("La API respondió con un formato inesperado.");
        return;
      }

      setSummary(payload);
    } catch (error) {
      setSummary(null);
      const detail = error instanceof Error ? error.message : "Error de red";
      setError(`No se pudo conectar con la API local. ${detail}`);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveSourceIds, email, selectedInterests, sourceOverrides]);

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

  const applyCustomSuggestions = useCallback(() => {
    const suggestedIds = customSourceSuggestions.map((source) => source.id);
    setSelectedSources((prev) => mergeSourceIds(prev, suggestedIds));
  }, [customSourceSuggestions]);

  const addOneSource = useCallback((sourceId: SourceId) => {
    setSelectedSources((prev) => mergeSourceIds(prev, [sourceId]));
  }, []);

  const enableCustomMode = useCallback(() => {
    setSourceMode("custom");
    setSelectedSources((prev) => (prev.length > 0 ? prev : recommendedSourceIds));
  }, [recommendedSourceIds]);

  const useAutomaticMode = useCallback(() => {
    setSourceMode("auto");
  }, []);

  const useRecommendedAsCustom = useCallback(() => {
    setSelectedSources(recommendedSourceIds);
  }, [recommendedSourceIds]);

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
        <SourceModeSection
          sourceMode={sourceMode}
          selectedInterestCount={selectedInterests.length}
          selectedSources={selectedSources}
          recommendedSources={recommendedSources}
          customSourceSuggestions={customSourceSuggestions}
          email={email}
          onEnableCustomMode={enableCustomMode}
          onUseAutomaticMode={useAutomaticMode}
          onToggleSource={toggleSource}
          onApplyCustomSuggestions={applyCustomSuggestions}
          onUseRecommendedAsCustom={useRecommendedAsCustom}
          onAddOneSource={addOneSource}
          onEmailChange={handleEmailChange}
        />

        <div className="actions">
          <button className="button" onClick={handleGenerate} disabled={!canGenerate}>
            {isLoading ? "Generando..." : "Generar resumen"}
          </button>
          <span className="small">
            {selectedInterests.length > 0 && effectiveSources.length > 0
              ? `${selectedInterests.length} interés(es) + ${effectiveSources.length} fuente(s) ${
                  sourceMode === "custom" ? "personalizadas" : "automáticas"
                }`
              : sourceMode === "auto" && selectedInterests.length > 0
                ? "No hay fuentes automáticas para estos intereses. Pulsa \"Personalizar fuentes\"."
              : sourceMode === "custom"
                ? "Selecciona al menos un interés y una fuente personalizada"
                : "Selecciona al menos un interés"}
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

const SourceModeSection = memo(function SourceModeSection({
  sourceMode,
  selectedInterestCount,
  selectedSources,
  recommendedSources,
  customSourceSuggestions,
  email,
  onEnableCustomMode,
  onUseAutomaticMode,
  onToggleSource,
  onApplyCustomSuggestions,
  onUseRecommendedAsCustom,
  onAddOneSource,
  onEmailChange
}: SourceModeSectionProps) {
  const selectedSet = useMemo(() => new Set(selectedSources), [selectedSources]);
  const activeSources =
    sourceMode === "custom"
      ? SOURCES.filter((source) => selectedSet.has(source.id))
      : recommendedSources;
  const hasDynamicRecommendations = recommendedSources.some((source) => !isSourceId(source.id));

  return (
    <>
      <div className="source-mode-card">
        <div className="section-head">
          <h2 className="section-title">Fuentes Web (RSS)</h2>
          {sourceMode === "custom" ? (
            <button type="button" className="button-secondary" onClick={onUseAutomaticMode}>
              Usar recomendadas
            </button>
          ) : (
            <button type="button" className="button-secondary" onClick={onEnableCustomMode}>
              Personalizar fuentes
            </button>
          )}
        </div>
        <p className="small">
          {sourceMode === "custom"
            ? "Modo personalizado: eliges exactamente qué feeds usar."
            : selectedInterestCount === 0
              ? "Modo automático recomendado: primero selecciona intereses para calcular fuentes relevantes."
              : recommendedSources.length === 0
                ? "No encontramos fuentes del catálogo alineadas a estos intereses. Usa \"Personalizar fuentes\"."
                : hasDynamicRecommendations
                  ? `Modo automático recomendado: se usarán ${recommendedSources.length} fuentes (incluye RSS detectados para tus intereses personalizados).`
                : `Modo automático recomendado: se usarán ${recommendedSources.length} fuentes alineadas a tus intereses.`}
        </p>
        <div className="source-pill-list">
          {activeSources.length === 0 ? (
            <span className="source-pill source-pill-muted">Sin recomendaciones todavía</span>
          ) : null}
          {activeSources.slice(0, 8).map((source) => (
            <span className="source-pill" key={`active-source-${source.id}`}>
              {source.name}
            </span>
          ))}
          {activeSources.length > 8 ? (
            <span className="source-pill source-pill-muted">+{activeSources.length - 8} más</span>
          ) : null}
        </div>
      </div>

      {sourceMode === "custom" ? (
        <div className="source-custom-panel">
          <div className="suggestion-head">
            <strong>Fuentes personalizadas</strong>
            <button type="button" className="button-secondary" onClick={onUseRecommendedAsCustom}>
              Restablecer recomendadas
            </button>
          </div>
          <p className="small">
            Puedes ajustar la selección manualmente. Si te lías, vuelve al modo recomendado.
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
                onClick={onApplyCustomSuggestions}
                disabled={customSourceSuggestions.length === 0}
              >
                Agregar sugeridas
              </button>
            </div>
            <p className="small">Basadas en tus intereses activos y en las fuentes ya seleccionadas.</p>
            <div className="suggestion-list">
              {customSourceSuggestions.map((source) => (
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
          {selectedSources.length === 0 ? (
            <p className="small" style={{ color: "#b42318", marginTop: "0.6rem" }}>
              No hay fuentes seleccionadas. Elige una o vuelve al modo recomendado.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="email">Email (opcional, solo guardado local en el MVP)</label>
        <input
          id="email"
          type="email"
          placeholder="tu-email@dominio.com"
          autoComplete="email"
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

function mergeSourceConfigs(
  base: SourceConfig[],
  incoming: SourceConfig[],
  limit: number
): SourceConfig[] {
  const merged: SourceConfig[] = [];
  const seenIds = new Set<string>();
  const seenFeedUrls = new Set<string>();

  for (const source of [...base, ...incoming]) {
    if (merged.length >= limit) {
      break;
    }
    if (seenIds.has(source.id) || seenFeedUrls.has(source.feedUrl)) {
      continue;
    }
    merged.push(source);
    seenIds.add(source.id);
    seenFeedUrls.add(source.feedUrl);
  }

  return merged;
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

function isStoredPreferencesV3(value: unknown): value is StoredPreferencesV3 {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (value as StoredPreferencesV3).version === STORAGE_VERSION;
}

function isStoredPreferencesV2(value: unknown): value is StoredPreferencesV2 {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (value as StoredPreferencesV2).version === 2;
}

function sanitizeSourceMode(value: unknown): SourceSelectionMode {
  return value === "custom" ? "custom" : "auto";
}

function isDefaultSourceSelection(sourceIds: SourceId[]): boolean {
  if (sourceIds.length !== DEFAULT_SOURCE_IDS.length) {
    return false;
  }
  const defaultSet = new Set(DEFAULT_SOURCE_IDS);
  return sourceIds.every((sourceId) => defaultSet.has(sourceId));
}

function readStoredPreferences(): unknown | null {
  try {
    const primary = tryParseStorage(localStorage.getItem(STORAGE_KEY));
    if (primary) {
      return primary;
    }

    const backup = tryParseStorage(localStorage.getItem(STORAGE_BACKUP_KEY));
    if (backup) {
      persistRawPreferences(JSON.stringify(backup));
      return backup;
    }
  } catch {
    return null;
  }

  return null;
}

function persistStoredPreferences(payload: StoredPreferencesV3): void {
  try {
    persistRawPreferences(JSON.stringify(payload));
  } catch {
    // Ignore storage write errors (private mode/quota) without breaking UX.
  }
}

function persistRawPreferences(raw: string): void {
  localStorage.setItem(STORAGE_KEY, raw);
  localStorage.setItem(STORAGE_BACKUP_KEY, raw);
}

function tryParseStorage(raw: string | null): unknown | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function parseApiPayload(rawBody: string): SummaryResponse | ErrorResponse | null {
  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as SummaryResponse | ErrorResponse;
  } catch {
    return null;
  }
}

function isSummaryResponse(value: SummaryResponse | ErrorResponse): value is SummaryResponse {
  return (
    "generatedAt" in value &&
    "items" in value &&
    "stats" in value &&
    "warnings" in value
  );
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  retries = 1,
  retryDelayMs = 250
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    await wait(retryDelayMs);
    return fetchWithRetry(input, init, retries - 1, retryDelayMs);
  }
}

async function requestSummaryWithFallback(init: RequestInit): Promise<Response> {
  let lastError: unknown = null;

  for (const endpoint of SUMMARY_ENDPOINTS) {
    try {
      return await fetchWithRetry(endpoint, init);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No se pudo llamar a ningun endpoint de resumen.");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
