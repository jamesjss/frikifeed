# Alertas Tech Personales (Fase 1 MVP)

MVP de una tarde: eliges intereses, pulsas `Generar resumen` y recibes links con mini-resúmenes filtrados.

## Qué incluye esta fase

- Frontend en Next.js (App Router).
- Intereses con checkboxes:
  - Java / Spring
  - DevOps
  - IA
  - Seguridad
- Fuentes web seleccionables (sitios RSS).
- Sugerencias automáticas de nuevas fuentes según:
  - tus intereses,
  - las fuentes que ya seleccionaste.
- Preferencias guardadas en `localStorage` (modo demo sin login ni BD).
- API `POST /api/summary` que:
  - consume solo las fuentes RSS que selecciones,
  - normaliza y deduplica items por URL/guid,
  - filtra por keywords de intereses,
  - aplica límites por fuente y total,
  - genera mini-resumen heurístico por item.
- Caché en memoria con TTL para evitar consultar RSS en cada click.

## Ejecución local

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Estructura principal

- `src/app/page.tsx`: UI del MVP.
- `src/app/api/summary/route.ts`: endpoint para generar resumen.
- `src/lib/interests.ts`: definición de intereses + keywords.
- `src/lib/sources.ts`: catálogo de fuentes + motor de sugerencias.
- `src/lib/rss-pipeline.ts`: pipeline RSS (parse, dedupe, filtro, resumen, caché).

## Límites actuales

- Máximo por fuente: `20`.
- Máximo total devuelto: `50`.
- TTL de caché: `10 min`.

## Siguiente paso (Fase 2)

- Pasar preferencias a BD (usuario o email).
- Workflow diario/semanal con n8n:
  - cargar intereses,
  - consultar feeds,
  - resumir con LLM,
  - enviar por email/Telegram.
- Cache persistente (Redis/KV) y tracking de items ya enviados.
