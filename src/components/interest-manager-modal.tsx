"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  MAX_INTERESTS_PER_USER,
  buildCustomInterest,
  sortInterestCatalog,
  updateInterestDraft,
  type InterestDefinition
} from "@/lib/interests";

type InterestManagerModalProps = {
  interestCatalog: InterestDefinition[];
  selectedInterestIds: string[];
  interestSuggestions: InterestDefinition[];
  onClose: () => void;
  setInterestCatalog: Dispatch<SetStateAction<InterestDefinition[]>>;
  setSelectedInterestIds: Dispatch<SetStateAction<string[]>>;
};

export default function InterestManagerModal({
  interestCatalog,
  selectedInterestIds,
  interestSuggestions,
  onClose,
  setInterestCatalog,
  setSelectedInterestIds
}: InterestManagerModalProps) {
  const [managerError, setManagerError] = useState<string | null>(null);
  const [newInterestLabel, setNewInterestLabel] = useState("");
  const [newInterestKeywords, setNewInterestKeywords] = useState("");
  const [editingInterestId, setEditingInterestId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editKeywords, setEditKeywords] = useState("");

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
    const nextInterest = result.interest;

    if (!nextInterest) {
      setManagerError(result.error ?? "No se pudo crear el interés.");
      return;
    }

    setInterestCatalog((prev) => sortInterestCatalog([...prev, nextInterest]));
    setSelectedInterestIds((prev) =>
      prev.includes(nextInterest.id) ? prev : [...prev, nextInterest.id]
    );
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
    const updatedInterest = result.interest;

    if (!updatedInterest) {
      setManagerError(result.error ?? "No se pudo guardar el interés.");
      return;
    }

    setManagerError(null);
    setInterestCatalog((prev) =>
      sortInterestCatalog(
        prev.map((interest) => (interest.id === current.id ? updatedInterest : interest))
      )
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

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interest-manager-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="interest-manager-title">Gestor de intereses</h2>
          <button type="button" className="button-secondary" onClick={onClose}>
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
          <h3>
            Tu catálogo ({interestCatalog.length}/{MAX_INTERESTS_PER_USER})
          </h3>
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
