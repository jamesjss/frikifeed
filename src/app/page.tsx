"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MAX_INTERESTS_PER_USER,
  buildCustomInterest,
  buildDefaultInterestCatalog,
  buildDefaultSelectedInterestIds,
  getInterestsByIds,
  getSuggestedBuiltInInterests,
  sanitizeInterestCatalog,
  sanitizeInterestSelection,
  sanitizeSelectedInterestIds,
  sortInterestCatalog,
  updateInterestDraft,
  type InterestDefinition
} from "@/lib/interests";
import {
  DEFAULT_SOURCE_IDS,
  SOURCES,
  isSourceId,
  suggestSources,
  type SourceId
} from "@/lib/sources";

const STORAGE_KEY = "frikifeed:preferences";
const STORAGE_VERSION = 2;

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

export default function HomePage() {
  const [interestCatalog, setInterestCatalog] = useState<InterestDefinition[]>(() =>
    buildDefaultInterestCatalog()
  );
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>(() =>
    buildDefaultSelectedInterestIds(buildDefaultInterestCatalog())
  );
  const [selectedSources, setSelectedSources] = useState<SourceId[]>(DEFAULT_SOURCE_IDS);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [newInterestLabel, setNewInterestLabel] = useState("");
  const [newInterestKeywords, setNewInterestKeywords] = useState("");
  const [editingInterestId, setEditingInterestId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editKeywords, setEditKeywords] = useState("");

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

  function toggleInterest(interestId: string) {
    setSelectedInterestIds((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId]
    );
  }

  function toggleSource(sourceId: SourceId) {
    setSelectedSources((prev) =>
      prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
    );
  }

  function applySuggestedSources() {
    const suggestedIds = sourceSuggestions.map((source) => source.id);
    setSelectedSources((prev) => mergeSourceIds(prev, suggestedIds));
  }

  function addOneSource(sourceId: SourceId) {
    setSelectedSources((prev) => mergeSourceIds(prev, [sourceId]));
  }

  function createInterest() {
    setManagerError(null);
    if (interestCatalog.length >= MAX_INTERESTS_PER_USER) {
      setManagerError(`Has llegado al máximo de ${MAX_INTERESTS_PER_USER} intereses.`);
      return;
    }

    const result = buildCustomInterest({
      label: newInterestLabel,
      keywordsInput: newInterestKeywords,
      existingCatalog: interestCatalog
    });

    if (!result.interest) {
      setManagerError(result.error ?? "No se pudo crear el interés.");
      return;
    }

    setInterestCatalog((prev) => sortInterestCatalog([...prev, result.interest!]));
    setSelectedInterestIds((prev) => [...prev, result.interest!.id]);
    setNewInterestLabel("");
    setNewInterestKeywords("");
  }

  function startEditInterest(interestId: string) {
    const interest = interestCatalog.find((item) => item.id === interestId);
    if (!interest) {
      return;
    }
    setManagerError(null);
    setEditingInterestId(interest.id);
    setEditLabel(interest.label);
    setEditKeywords(interest.keywords.join(", "));
  }

  function cancelEditInterest() {
    setEditingInterestId(null);
    setEditLabel("");
    setEditKeywords("");
  }

  function saveEditInterest() {
    if (!editingInterestId) {
      return;
    }
    const current = interestCatalog.find((interest) => interest.id === editingInterestId);
    if (!current) {
      return;
    }

    const result = updateInterestDraft(current, {
      label: editLabel,
      keywordsInput: editKeywords
    });

    if (!result.interest) {
      setManagerError(result.error ?? "No se pudo guardar el interés.");
      return;
    }

    setManagerError(null);
    setInterestCatalog((prev) =>
      sortInterestCatalog(prev.map((interest) => (interest.id === current.id ? result.interest! : interest)))
    );
    cancelEditInterest();
  }

  function removeInterest(interestId: string) {
    const interest = interestCatalog.find((item) => item.id === interestId);
    if (!interest) {
      return;
    }

    const shouldConfirm = window.confirm(
      selectedInterestIds.includes(interestId)
        ? `¿Eliminar "${interest.label}" del catálogo? También se desactivará en la selección actual.`
        : `¿Eliminar "${interest.label}" del catálogo?`
    );
    if (!shouldConfirm) {
      return;
    }

    setManagerError(null);
    setInterestCatalog((prev) => prev.filter((item) => item.id !== interestId));
    setSelectedInterestIds((prev) => prev.filter((id) => id !== interestId));
    if (editingInterestId === interestId) {
      cancelEditInterest();
    }
  }

  function addSuggestedInterest(interestId: string) {
    const suggested = interestSuggestions.find((interest) => interest.id === interestId);
    if (!suggested) {
      return;
    }

    setManagerError(null);
    setInterestCatalog((prev) => sortInterestCatalog([...prev, suggested]));
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
          Elige intereses y fuentes para generar un resumen RSS friki+tech con keywords dinámicas.
        </p>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2 className="section-title">Intereses</h2>
          <button type="button" className="button-secondary" onClick={() => setIsInterestModalOpen(true)}>
            Gestionar intereses
          </button>
        </div>
        <div className="grid">
          {interestCatalog.map((interest) => (
            <label className="interest" key={interest.id}>
              <input
                type="checkbox"
                checked={selectedInterestIds.includes(interest.id)}
                onChange={() => toggleInterest(interest.id)}
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

        <h2 className="section-title">Fuentes Web (RSS)</h2>
        <p className="small">
          Elige desde qué páginas quieres sacar contenido. Puedes combinar tech y friki.
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
          <p className="small">Basadas en tus intereses activos y en las fuentes ya seleccionadas.</p>
          <div className="suggestion-list">
            {sourceSuggestions.map((source) => (
              <button
                type="button"
                className="suggestion-chip"
                key={`suggest-source-${source.id}`}
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
                No hubo coincidencias para las keywords actuales. Ajusta intereses o añade nuevas
                keywords.
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

      {isInterestModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsInterestModalOpen(false)}>
          <section className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h2>Gestor de intereses</h2>
              <button type="button" className="button-secondary" onClick={() => setIsInterestModalOpen(false)}>
                Cerrar
              </button>
            </div>

            <p className="small">
              Crea, edita, elimina y recupera intereses. Máximo {MAX_INTERESTS_PER_USER} intereses.
            </p>

            {managerError ? (
              <p className="small" style={{ color: "#b42318" }}>
                {managerError}
              </p>
            ) : null}

            <div className="modal-section">
              <h3>Tu catálogo ({interestCatalog.length}/{MAX_INTERESTS_PER_USER})</h3>
              <div className="manage-list">
                {interestCatalog.map((interest) =>
                  editingInterestId === interest.id ? (
                    <div className="manage-item editing" key={`edit-${interest.id}`}>
                      <div className="manage-main">
                        <input
                          className="modal-input"
                          value={editLabel}
                          onChange={(event) => setEditLabel(event.target.value)}
                          placeholder="Nombre del interés"
                        />
                        <input
                          className="modal-input"
                          value={editKeywords}
                          onChange={(event) => setEditKeywords(event.target.value)}
                          placeholder="keywords separadas por coma"
                        />
                      </div>
                      <div className="manage-actions">
                        <button type="button" className="button-secondary" onClick={saveEditInterest}>
                          Guardar
                        </button>
                        <button type="button" className="button-secondary" onClick={cancelEditInterest}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="manage-item" key={interest.id}>
                      <div className="manage-main">
                        <strong>{interest.label}</strong>
                        <span className="small">
                          {formatInterestCategory(interest.category)} · {interest.keywords.length} keywords
                          {interest.isBuiltIn ? " · base" : " · custom"}
                        </span>
                        <span className="small">{interest.keywords.join(", ")}</span>
                      </div>
                      <div className="manage-actions">
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => startEditInterest(interest.id)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => removeInterest(interest.id)}
                        >
                          {interest.isBuiltIn ? "Quitar" : "Eliminar"}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="modal-section">
              <h3>Crear interés personalizado</h3>
              <div className="modal-form">
                <input
                  className="modal-input"
                  value={newInterestLabel}
                  onChange={(event) => setNewInterestLabel(event.target.value)}
                  placeholder="Nombre (ej: Warhammer)"
                />
                <input
                  className="modal-input"
                  value={newInterestKeywords}
                  onChange={(event) => setNewInterestKeywords(event.target.value)}
                  placeholder="keywords (ej: warhammer, 40k, space marine)"
                />
                <button
                  type="button"
                  className="button-secondary"
                  onClick={createInterest}
                  disabled={interestCatalog.length >= MAX_INTERESTS_PER_USER}
                >
                  Crear interés
                </button>
              </div>
            </div>

            <div className="modal-section">
              <h3>Intereses sugeridos no instalados</h3>
              {interestSuggestions.length === 0 ? (
                <p className="small">Ya tienes todos los intereses base disponibles.</p>
              ) : (
                <div className="suggestion-list">
                  {interestSuggestions.map((interest) => (
                    <button
                      type="button"
                      className="suggestion-chip"
                      key={`suggest-interest-${interest.id}`}
                      onClick={() => addSuggestedInterest(interest.id)}
                    >
                      + {interest.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

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

