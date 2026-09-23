# KNOWN_LIMITATIONS.md — Limitaciones conocidas

_Actualizado: 2026-09-22._

## P1 — Funcionalidad core incompleta

1. **Sin backend de datos.** La persistencia es 100% local (SecureStore del dispositivo). El backend .NET solo expone `GET /health` y `POST /api/ai/chat`. No hay: cuentas multi-dispositivo, sincronización, JWT/refresh, households compartidos, EF Core/migrations. Consecuencia: perder el dispositivo = perder los datos; el flujo AUTH del prompt (registro/login entre dispositivos) es local-first por diseño actual.
1b. **Login con Google/Facebook requiere credenciales del dueño del proyecto.** Implementado con `expo-auth-session`; se activa al definir `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` y `EXPO_PUBLIC_FACEBOOK_APP_ID` (ver `mobile/.env.example`). En Android el Client ID de Google exige package `com.alcancia.app` + SHA-1, así que se prueba con dev build (`npx expo run:android`), no en Expo Go. El perfil social solo abre la cuenta local del dispositivo; cuando exista backend, el token/ID token debe verificarse en el servidor.
2. **Familia compartida entre dispositivos no existe todavía.** La pestaña "Compartidos" ya divide gastos de verdad, pero los grupos viven en el celular del dueño (las otras personas no tienen cuenta ni ven el grupo). Invitaciones, roles y permisos necesitan backend; ahí debe vivir la autorización.
2a. (histórico) **Familia era una vista previa.** `app/(tabs)/familia.tsx` lo declara en pantalla ("Vista previa con datos de ejemplo", miembros hardcodeados Caleb/Yesenia). No existe invitación real, roles ni permisos; cuando haya backend, la autorización debe vivir ahí (nunca solo en el frontend).
3. **Escaneo OCR no implementado.** No hay ruta de boleta/voucher/Yape/Plin. El tipo `Transaction.source` ya contempla `'receipt' | 'yape' | 'plin'` y el detalle los muestra. Al implementarlo: extraer → mostrar → **confirmación explícita** → recién crear movimiento; tratar el texto OCR como DATA (defensa anti prompt-injection, §12).
4. **Notificaciones no implementadas.** Sin permisos, recordatorios ni deep links de notificación.

## P2 — UX / calidad

5. **Verificación en dispositivo bloqueada (entorno).** Expo Go del emulador-5554 se auto-actualizó y ya no carga el bundle de SDK 57 (okhttp `ProtocolException` en multipart; el client queda en "Loading…" eterno). No es un bug de la app: `expo export` y `expo-doctor` pasan. Remedio: reinstalar Expo Go compatible con SDK 57 o generar un dev build (`npx expo run:android`). Pendientes de verificar en UI: `/calendario`, `/suscripciones`, flujo auth.
6. **Hash de contraseña local con SHA-256+salt** (expo-crypto). Aceptable para auth local-first; al migrar a backend usar PBKDF2/Argon2id server-side.
7. **Movimientos: sin edición in-place.** Existe crear/detalle/eliminar (con reversión correcta de saldo, metas y deudas). Editar = eliminar + crear. Sin búsqueda/filtros/paginación todavía (SectionList por día; razonable para el volumen actual).
8. **Sin E2E (Maestro).** Unitarios e integración cubren engine/stores/backend; los smoke flows E2E esperan al entorno del emulador.

## P3 — Nice-to-have

9. Ruta interna `app/dev/design-system.tsx` visible en el bundle; excluirla de builds de producción cuando se configure EAS.
10. `docs/design-reference/branding-source/` (35 MB de PNGs fuente) vive en el repo; considerar Git LFS o un archive externo si el tamaño molesta.
11. Exportación/eliminación de cuenta (§21): hoy "cerrar sesión" y reset local existen en Ajustes; exportar datos (JSON) y borrado definitivo llegarán con el backend.

## Supuestos deliberados

- La IA **nunca** es fuente de verdad matemática (§38): todo cálculo viene del engine determinístico local; el backend/modelo solo interpreta contexto ya calculado (`buildChatContext`).
- La app funciona sin IA (§69): el chat cae a `localAnswer` determinístico ante cualquier fallo de red/timeout y la UI informa la fuente.
- Modo demo separado del modo real: `completeOnboarding('demo' | 'real')`; ninguna pantalla productiva depende del dataset demo sin declararlo.
