# Alertas Tech Personales (MVP dinámico Friki + Tech)

MVP: eliges intereses y fuentes, pulsas `Generar resumen` y recibes links con mini-resúmenes filtrados.

## Qué incluye esta fase

- Frontend en Next.js (App Router).
- Intereses dinámicos (`tech`, `friki`, `custom`) con:
  - selección en pantalla principal,
  - gestor en modal para crear/editar/eliminar,
  - sugerencias de intereses base no instalados.
- Fuentes RSS seleccionables (mezcla ES+EN) en temática tech + friki.
- Sugerencias automáticas de fuentes según:
  - intereses activos (keywords dinámicas),
  - fuentes ya seleccionadas.
- Preferencias guardadas en `localStorage` sin login ni BD.
- Migración automática de formato legacy de preferencias a `v2`.
- API `POST /api/summary` con soporte dual:
  - legacy: `interests: string[]`,
  - nuevo: `interests: InterestDefinition[]`.
- Pipeline RSS con:
  - parse + normalización + deduplicación,
  - filtro por keywords dinámicas,
  - límites por fuente y total,
  - mini-resumen heurístico.
- Caché en memoria con TTL para evitar consultar RSS en cada click.

## Ejecución local

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) (o el puerto libre que asigne Next.js).

## Estructura principal

- `src/app/page.tsx`: UI del MVP.
- `src/app/api/summary/route.ts`: endpoint para generar resumen.
- `src/lib/interests.ts`: modelo dinámico de intereses + defaults + migración + sanitización.
- `src/lib/sources.ts`: catálogo de fuentes tech/friki + motor de sugerencias.
- `src/lib/rss-pipeline.ts`: pipeline RSS (parse, dedupe, filtro dinámico, resumen, caché).

## Límites actuales

- Máximo por fuente: `20`.
- Máximo total devuelto: `50`.
- TTL de caché: `10 min`.
- Máximo de intereses por usuario: `30`.
- Máximo de keywords por interés: `12`.

## Próximo paso (Fase 2)

- Persistir preferencias en BD (usuario/email).
- Workflow diario/semanal con n8n:
  - cargar intereses guardados,
  - consultar feeds por usuario,
  - resumir con LLM,
  - enviar por email/Telegram.
- Cache persistente (Redis/KV) y tracking de items ya enviados.
