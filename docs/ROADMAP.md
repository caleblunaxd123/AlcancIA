# AlcancIA — Roadmap

Estado: ✅ hecho · 🚧 en progreso · ⬜ pendiente

## Fase 1 — Fundaciones ✅
- ✅ Arquitectura mobile (Expo Router + TS strict)
- ✅ Design System (tokens, tipografía, motion, dark/light)
- ✅ Navegación base con botón central IA
- ✅ Onboarding real que captura datos del usuario (§26) + "explorar con ejemplo"
- ✅ Primer uso guiado: tarjeta "Primeros pasos" en Home (§33)
- ✅ Persistencia financiera cifrada en Keychain/Keystore (SecureStore), con migración local
- ✅ Cuenta local segura: registro, login, logout y recuperación en dispositivo
- ⬜ Auth remota verificable (correo/OAuth), sesiones de servidor y sincronización

## Fase 2 — Dinero ✅ (núcleo) / 🚧
- ✅ Financial Engine + Safe To Spend (determinístico, testeado)
- ✅ Home interactivo personalizado con los datos del usuario
- ✅ Movimientos (lista, resumen, secciones)
- ✅ Movimientos: crear, ver, editar con recálculo de saldo y eliminar/revertir
- 🚧 Registro por texto / voz / escaneo (manual listo; NLP en Fase 5)
- ✅ Proyección de recurrencias semanales, quincenales, mensuales y anuales
- ✅ Edición segura de movimientos, metas, deudas y suscripciones
- ⬜ Presupuestos configurables por categoría

## Fase 3 — Metas y compromisos 🚧
- ✅ Metas (lista + detalle con journey)
- ✅ CRUD de metas: crear, aportar, eliminar
- ✅ Escenario "aporte extra" en vivo
- ✅ Calendario financiero con recurrencias proyectadas
- ✅ Deudas con pagos validados, saldo enlazado y reversión
- ✅ Suscripciones con frecuencia y próxima renovación

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
- ✅ `POST /api/ai/chat` + `/health`, límites de payload/respuesta, rate limiting, OpenAPI, CORS; 31 tests
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
- ✅ Misiones y progresión (semillas), rachas consecutivas y estados mensuales
- ⬜ Resumen semanal estilo story

## Fase 8 — Hardening 🚧
- ✅ 94 tests mobile + 31 tests backend
- ✅ Expo Doctor 21/21, export Android, assets WebP optimizados
- ✅ Validaciones de entrada, almacenamiento seguro y contexto de IA sanitizado
- ⬜ Tests de componentes (RNTL) y E2E (Maestro)
- ⬜ Backend + tests de integración (Testcontainers)
- 🚧 Seguridad OWASP, performance y offline-first
- ⬜ Auth/autorización, observabilidad, pentest y widgets nativos

## Monetización (feature flags)
Free / Plus / Family. No bloquear datos esenciales tras premium.
