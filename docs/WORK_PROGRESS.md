# WORK_PROGRESS.md — Continuidad del trabajo (§34)

_Última actualización: 2026-09-22. Si el contexto se compacta: leer este archivo y continuar desde "Siguiente tarea"._

## Qué se auditó

- Repo completo: `mobile/` (Expo SDK 57, Expo Router, Zustand, engine financiero en minor units) y `backend/` (.NET 9 Minimal API, provider IA).
- Pantalla por pantalla: Home, Movimientos (+detalle), IA, Metas (+detalle/nueva), Familia (preview declarada), ¿Puedo comprarlo?, Deudas (lista/nueva/detalle), Suscripciones (lista/nueva), Calendario, Más/Ajustes, Onboarding, Auth (login/registro/reset local).
- Flujos: CRUD movimientos (crear/detalle/eliminar con reversión de saldo), CRUD metas (crear/aportar/eliminar), CRUD deudas (crear/pagar con transacción vinculada/eliminar), CRUD suscripciones, onboarding real vs demo (`completeOnboarding('real'|'demo')`), modo sin IA (fallback `localAnswer` en `app/(tabs)/ia.tsx`).
- Seguridad: secretos (OK, env vars), storage (SecureStore chunked + migración), auth local (SHA-256 + salt, expo-crypto).
- Assets: 35 MB de PNGs fuente movidos a `docs/design-reference/branding-source/` (el bundle solo usa .webp, 1.1 MB).

## Qué se implementó/corrigió (esta etapa)

1. Persistencia de preferencia de tema en `appStore` + `ThemeProvider` (bug P0).
2. `ErrorBoundary` global con pantalla de recuperación (`src/components/common/ErrorBoundary.tsx`, cableado en `app/_layout.tsx`).
3. Manejo de errores del store en las 4 pantallas de creación (Alert "No se pudo guardar") — antes perdían datos silenciosamente.
4. `useHomeData`: lógica extraída a la función pura `computeHomeData(snapshot, now)` en `src/features/home/homeData.ts`; progreso del hogar derivado de metas reales (antes 0.4 hardcodeado); 8 tests nuevos.
5. Tests nuevos: engine debts/subscriptions/calendar/insights/weather + store debts/subscriptions + homeData (mobile 102/102; backend 31/31).
6. Producción: `mobile/.env.example`, `runtimeVersion` en `app.json`, `backend/.gitignore` + untrack de `appsettings.Development.json`, a11y de chips en `suscripciones/nueva`.
7. Verificación en emulador: módulo Deudas completo + light mode (ver AUDIT.md); luego el entorno Expo Go se rompió (ver KNOWN_LIMITATIONS.md).

## Rediseño UX/UI (petición del usuario: "app profesional tipo banca, que se entienda qué hacer")

Decisión del usuario: mantener identidad (no rebrand), subir polish; división del dinero como resumen visual en Home; prioridad Home+guía → Welcome+headers → jerarquía banca.

1. Engine `src/engine/allocation.ts` + 13 tests: divide el ingreso mensual real en Obligaciones / Ahorro / Gastos / Libre (enteros en minor units, frecuencia normalizada, `incomeUnknown` sin ingreso, flag `overspent`).
2. Engine `src/engine/nextStep.ts` + 9 tests: calcula UN siguiente paso concreto según el estado real de la cuenta (ingreso → gastos → meta → deuda por vencer → obligaciones → simulador → IA → todo en orden).
3. `MoneyAllocationCard`: barra segmentada + leyenda con montos y %, hoja "¿Cómo lo calculamos?" que itemiza de dónde sale cada cifra.
4. `BalanceHero`: saldo disponible grande, ahorrado en metas vs gastado este mes, botón ojo para ocultar montos y 4 accesos rápidos (Registrar / Metas / ¿Lo compro? / AlcancIA).
5. `NextStepCard`: guía permanente que nunca desaparece. En Home hay UNA sola superficie de guía a la vez: `FirstStepsCard` mientras el usuario es nuevo (menos de 4 pasos) y `NextStepCard` después.
6. `PageHeader` rediseñado (filas apiladas: badge/back + acción arriba; eyebrow con barra de acento, título 28 y bajada) → mejora todas las pantallas a la vez. Nuevo `HeaderIconButton` (44px) reemplaza los botones de 40px de los modales y los iconos sueltos de `meta/[id]` y `deudas/[id]` (§50/§53).
7. `welcome.tsx` premium: hero con gradiente, mascota en anillo, 3 beneficios numerados con título+detalle, CTA bancario y nota de privacidad.
8. Home reordenado tipo banca: header → BalanceHero → Dinero seguro → División del dinero → guía → resto.

## Etapa "tipo banca" verificada en emulador (2026-09-23)

Entorno: el "Expo Go roto" era Metro con `--localhost` enlazado solo a IPv6 (`::1`) mientras `adb reverse` usa IPv4. Arrancar `npx expo start --port 8081` (sin `--localhost`) + `adb reverse tcp:8081 tcp:8081` + abrir `exp://127.0.0.1:8081`. Rutas directas: `exp://127.0.0.1:8081/--/<ruta>`.

1. Tokens: marca esmeralda AA (#0B8043, antes #22C55E 2.3:1), marca oscura esmeralda (antes violeta), token `hero` (azul→esmeralda) para cabeceras de marca. `Card` limpio (sin lavados verdes), `Screen` sin resplandor.
2. `PageHeader` compacto de una fila + títulos claros ("Mis metas", "Movimientos", "AlcancIA"…) con subtítulo instructivo. `SectionHeader` en oración.
3. Home: `HomeHero` (saludo+fecha, clima, UN número "Puedes gastar", línea que explica saldo vs apartado, "¿Cómo lo calculamos?"), `QuickActions` (gasto/ingreso/¿lo compro?/dividir), guía, mes, `UpcomingList` (3 próximos pagos), metas en carrusel `GoalTile`. Bug corregido: el hogar mostraba 60% con 0 ahorrado.
4. Welcome y `AuthShell` (login/registro/recuperación) con franja de marca + hoja blanca. Copys profesionales sin emojis.
5. Pestaña "Compartidos" (antes Familia falsa): grupos reales, gastos divididos (iguales / según ingresos / a medida), quién le debe a quién, registrar pagos, opción de llevar mi parte a Movimientos. Engine `split.ts` (redondeo exacto en céntimos) + `sharedStore` persistido cifrado.
6. Login social Google/Facebook (`expo-auth-session`), IDs por `EXPO_PUBLIC_*`; sin IDs el botón explica que no está activado. `authStore.socialSignIn`.
7. Barra de estado imperativa (`useLightStatusBar`) para pantallas con cabecera oscura.
Calidad: typecheck ✅ · lint ✅ · jest 148/148 ✅.

## Comandos importantes

```bash
# mobile (desde mobile/)
npm run typecheck && npm run lint && npx jest
npx expo-doctor
npx expo export --platform android --output-dir /tmp/export-check   # valida bundle prod

# backend (desde backend/)
dotnet build AlcancIA.sln
dotnet test --no-build        # NO matar AlcancIA.Api.exe en ejecución sin permiso: bloquea DLLs

# emulador (ver memory: emulator-verification-setup.md)
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" devices
npx expo start --port 8081    # + adb reverse tcp:8081 tcp:8081 y tcp:5080
```

## Decisiones tomadas

- Dinero siempre entero en minor units (`Money { minor, currency }`); IA nunca calcula (§38) — el contexto que se envía al backend ya viene calculado por el engine (`buildChatContext`).
- Auth local-first (un cuenta por dispositivo, hash+salt en SecureStore). No hay backend de usuarios todavía; cuando exista, migrar a PBKDF2/Argon y JWT+refresh con rotación.
- Demo vs real separados: `data/demo.ts` solo se usa en `onboarding.tsx` ("Ver ejemplo") y Familia lo declara explícitamente ("Vista previa con datos de ejemplo").
- Familia real (household compartido en backend) fuera de alcance hasta que exista backend de datos.

## Estado de calidad actual

- typecheck ✅ · lint ✅ · jest 124/124 ✅ · backend build+test ✅ · expo-doctor 21/21 ✅ · export prod ✅.
- **Nada está commiteado todavía** (el usuario debe aprobarlo). `git status` incluye además el `git rm --cached` de appsettings.Development.json y los `git mv` de branding.
- El rediseño UX/UI está verificado por typecheck/lint/tests y auditoría de código; **no en dispositivo** (Expo Go roto, ver KNOWN_LIMITATIONS.md).

## Siguiente tarea

P1 (por prioridad):
1. Verificar visualmente en dispositivo el nuevo Home, Welcome y headers cuando el cliente Expo funcione (reinstalar Expo Go compatible con SDK 57 o dev build): balance hero, barra de división, guía y accesos rápidos.
2. Backend de datos real (usuarios, households, transacciones, JWT+refresh) — hoy el backend solo expone `/health` y `/api/ai/chat`; la persistencia es local (SecureStore).
3. OCR/escaneo de boletas (§5 "ESCANEO"): no implementado; requiere expo-camera + flujo confirmar-siempre-antes-de-guardar.
4. Notificaciones locales contextuales (§20): no implementadas.
5. Presupuestos por categoría (evolución natural de `allocation.ts`: hoy el gasto es real del mes, el siguiente paso es comparar contra un presupuesto editable).
6. E2E Maestro (smoke: onboarding → crear gasto → safe to spend → puedo comprarlo) cuando el emulador vuelva a estar operativo.
