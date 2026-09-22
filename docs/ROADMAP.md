# AlcancIA — Roadmap

Estado: ✅ hecho · 🚧 en progreso · ⬜ pendiente

## Fase 1 — Fundaciones ✅
- ✅ Arquitectura mobile (Expo Router + TS strict)
- ✅ Design System (tokens, tipografía, motion, dark/light)
- ✅ Navegación base con botón central IA
- ✅ Onboarding animado
- ⬜ Auth real (pendiente backend)

## Fase 2 — Dinero ✅ (núcleo) / 🚧
- ✅ Financial Engine + Safe To Spend (determinístico, testeado)
- ✅ Home interactivo con datos demo
- ✅ Movimientos (lista, resumen, secciones)
- 🚧 Crear movimiento (manual / texto / voz / escaneo) — UI base
- ⬜ Recurrentes y presupuestos editables

## Fase 3 — Metas y compromisos 🚧
- ✅ Metas (lista + detalle con journey)
- ✅ Escenario "aporte extra" en vivo
- ⬜ Calendario financiero
- ⬜ Deudas (camino para salir de deuda)
- ⬜ Suscripciones (mensual → anual)

## Fase 4 — Simulación ✅ (hero) / 🚧
- ✅ ¿Puedo comprarlo? con simulación en vivo
- ✅ Sliders de escenario
- ⬜ Simulador "¿Qué pasaría si…?" completo (mudanza, préstamo, bebé…)
- ⬜ Timeline del dinero (7d–12m)

## Fase 5 — IA 🚧
- ✅ Backend .NET 9 (Domain/Application/Infrastructure/Api/Tests) con `IAiProvider`
- ✅ `GeminiAiProvider` (modelo desde config, nunca hardcodeado) + `LocalAiProvider`
- ✅ `FinancialContextBuilder` (contexto mínimo, nunca toda la BD)
- ✅ Contrato JSON validado + fallback determinístico (§68/§69)
- ✅ Prompt-injection safe (§67) — datos delimitados, sanitizados, con tests
- ✅ `POST /api/ai/chat` + `/health`, rate limiting, OpenAPI, CORS; 29 tests
- ✅ App conectada: tab AlcancIA llama al backend con fallback on-device
- ⬜ Gemini en vivo con API key real (hoy corre determinístico sin key)
- ⬜ Extracción de comprobantes (Yape/Plin/boletas) con confirmación
- ⬜ Insights generados por IA + persistencia (EF Core / conversaciones)

## Fase 6 — Familia ⬜
- 🚧 Vista de hogar (preview)
- ⬜ Invitaciones y roles
- ⬜ Privacidad real (autorización en backend, no solo UI)
- ⬜ División de gastos (proporcional / 50-50 / custom)

## Fase 7 — Gamificación 🚧
- 🚧 Casa Financiera viva
- 🚧 Clima Financiero
- ⬜ Misiones y progresión (semillas), racha semanal
- ⬜ Resumen semanal estilo story

## Fase 8 — Hardening ⬜
- ✅ Tests del motor (22)
- ⬜ Tests de componentes (RNTL) y E2E (Maestro)
- ⬜ Backend + tests de integración (Testcontainers)
- ⬜ Seguridad (OWASP API Top 10), performance, offline-first, widgets nativos

## Monetización (feature flags)
Free / Plus / Family. No bloquear datos esenciales tras premium.
