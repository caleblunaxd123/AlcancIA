# AUDIT.md — Auditoría de AlcancIA

_Última actualización: 2026-09-22. Este documento se mantiene vivo mientras se trabaja (§34 del prompt de auditoría)._

## Estado general

| Área | Estado | Evidencia |
| --- | --- | --- |
| TypeScript strict | ✅ sin errores | `npm run typecheck` (mobile) |
| ESLint | ✅ sin errores/warnings | `npm run lint` (mobile) |
| Tests mobile | ✅ 124/124 (17 suites) | `npx jest` |
| Tests backend | ✅ 31/31 | `dotnet test --no-build` |
| Build backend | ✅ 0 warnings | `dotnet build AlcancIA.sln` |
| expo-doctor | ✅ 21/21 checks | `npx expo-doctor` |
| Export producción | ✅ bundle Hermes 6.3 MB, 9.4 MB total | `npx expo export --platform android` |
| Secretos en repo | ✅ ninguno | ApiKey solo vía env (`Ai__ApiKey`); `.env` y `appsettings.Development.json` ignorados |

## Arquitectura (resumen)

- **mobile/**: Expo SDK 57 + Expo Router (typed routes), RN 0.86, Zustand + persist, Reanimated.
  - Lógica de dominio 100% fuera de UI: `src/engine/` (money entero en minor units, safeToSpend, debts, subscriptions, calendar, goals, purchase, weather, insights, recurrence, onboarding).
  - `src/store/financialStore.ts` y `authStore.ts` persisten en **SecureStore** (Keychain/Keystore, chunked, con migración desde AsyncStorage) vía `secureFinancialStorage`.
  - Tema centralizado en `src/theme/` (tokens, dark mode real, motion tokens, `minTouchTarget`).
  - ErrorBoundary global (§71) en `app/_layout.tsx`.
- **backend/**: .NET 9, Minimal API. Endpoints reales: `GET /health`, `POST /api/ai/chat` (provider abstraction `IAiProvider`, Gemini o local). Sin EF Core/migrations todavía (ver KNOWN_LIMITATIONS).

## Hallazgos corregidos en esta auditoría

| # | Severidad | Hallazgo | Corrección |
| --- | --- | --- | --- |
| 1 | P0 | Preferencia de tema no persistía (se perdía al reiniciar) | Movida a `appStore` persistido; `ThemeProvider` la consume |
| 2 | P0 | 4 pantallas de creación (`movimiento/nuevo`, `meta/nueva`, `deudas/nueva`, `suscripciones/nueva`) ignoraban el resultado del store: si la validación fallaba hacían `router.back()` **sin guardar ni avisar** | Capturan `FinancialActionResult` y muestran `Alert.alert('No se pudo guardar', error)` |
| 3 | P1 | Home: progreso del "hogar" hardcodeado a 0.4 sin meta de emergencia (§27) | Lógica extraída a `src/features/home/homeData.ts` (pura, inyectando `now`); progreso derivado de metas reales; 8 tests nuevos |
| 4 | P1 | `appsettings.Development.json` trackeado en git (riesgo futuro §75) | `git rm --cached` + regla en `backend/.gitignore` |
| 5 | P2 | 35 MB de PNGs fuente sin usar en `mobile/assets/branding` (el bundle solo usa .webp) | Movidos con `git mv` a `docs/design-reference/branding-source/`; assets de app bajaron a 1.6 MB |
| 6 | P2 | Sin `.env.example` ni `runtimeVersion` (§30) | Creados `mobile/.env.example` y `runtimeVersion: appVersion` en `app.json` |
| 7 | P2 | Chips de presets en `suscripciones/nueva` bajo 44 px y sin `accessibilityState` (§53) | `hitSlop` + `accessibilityState={{ selected }}` |
| 8 | — | Sin ErrorBoundary global (§71) | Creado `src/components/common/ErrorBoundary.tsx` con pantalla de recuperación amigable |
| 9 | P2 | Botones de cierre/editar de 40 px en 5 modales y en `meta/[id]` / `deudas/[id]` (§50/§53 exige ≥44) | Nuevo `HeaderIconButton` (44 px, `hitSlop`, rol y etiqueta) usado en todos los headers |
| 10 | P2 | Home no respondía "¿qué hago ahora?": la única guía (`FirstStepsCard`) desaparecía tras 4 pasos | `src/engine/nextStep.ts` (9 tests) + `NextStepCard` permanente; una sola superficie de guía a la vez |
| 11 | P2 | No existía la división del dinero (gastos/ahorro/obligaciones/libre) pedida por el usuario | `src/engine/allocation.ts` (13 tests) + `MoneyAllocationCard` con hoja "¿Cómo lo calculamos?" |

## Rediseño UX/UI (2026-09-22)

Petición del usuario: que se vea y se entienda como app profesional tipo banca, y que al entrar sea obvio qué hacer. Decisión acordada: **mantener identidad** (sin rebrand), subir polish; división del dinero como **resumen visual en Home**.

- Home reordenado: header (saludo + nombre grande) → `BalanceHero` (saldo, ahorrado vs gastado, botón ojo, 4 accesos rápidos) → `SafeToSpendCard` → `MoneyAllocationCard` → guía (`FirstStepsCard` o `NextStepCard`) → resto.
- `PageHeader` compartido rediseñado (badge/back + acción arriba; eyebrow con barra de acento, título 28, bajada): sube la jerarquía de **todas** las pantallas a la vez.
- `welcome.tsx` premium: gradiente, mascota en anillo, 3 beneficios numerados con título+detalle, CTA y nota de privacidad.
- Todo el dinero sigue saliendo del engine en enteros (minor units); la UI no calcula nada (§37/§38).
- Verificado con typecheck, lint, jest 124/124 y export de producción. **No verificado en dispositivo** por el bloqueo de Expo Go (ver KNOWN_LIMITATIONS.md).

## Cobertura de tests añadida/verificada

- Engine: money, safeToSpend (breakdown, clamp, obligaciones fuera de periodo), debts (amortización, MAX_MONTHS, pago ≤ interés, ahorro por pago extra), subscriptions (normalización semanal/quincenal/anual), calendar (clamp fin de mes, income solo en su mes, agrupado), purchase, recurrence, goals, onboarding, **insights (nuevo, 7)**, **weather (nuevo, 8)**.
- Stores: financialStore CRUD de metas/movimientos/deudas/suscripciones, `payDebt` descuenta saldo y clampea a 0.
- Backend: parser de respuestas IA, endpoints de chat, validación de salida estructurada.

## Verificación en dispositivo (emulator-5554)

- Verificados en dispositivo real: Home (dark/light), simulador "¿Puedo comprarlo?", onboarding, flujo completo de Deudas (slider de escenario, pago 2400→1900, meses 11→8, totales de lista).
- **Bloqueo de entorno**: Expo Go del emulador se auto-actualizó y ya no carga el bundle de SDK 57 (`ProtocolException` en multipart). No es un bug de la app. Remedio: reinstalar Expo Go compatible con SDK 57 o usar dev build. Detalle en `KNOWN_LIMITATIONS.md`.

## Pendientes clasificados (§32)

Ver `WORK_PROGRESS.md` (siguiente tarea) y `KNOWN_LIMITATIONS.md` (P1/P2 restantes: backend de datos, OCR, familia real, notificaciones).
