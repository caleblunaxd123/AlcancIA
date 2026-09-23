# SECURITY.md — Postura de seguridad de AlcancIA

_Actualizado: 2026-09-22. Auditoría orientada a producción (§10/§12)._

## Modelo actual

**Local-first.** Los datos financieros viven en el dispositivo; el backend solo ofrece `/health` y `/api/ai/chat`. No hay multiusuario ni sincronización (ver `KNOWN_LIMITATIONS.md`).

## Datos en reposo (mobile)

- `financialStore` y `authStore` persisten vía `secureFinancialStorage`: **expo-secure-store** (iOS Keychain `WHEN_UNLOCKED_THIS_DEVICE_ONLY` / Android Keystore), valores chunked (1.5 KB) con migración automática desde AsyncStorage en texto plano y borrado del legacy.
- Nunca se guardan contraseñas en claro: hash SHA-256 + salt aleatoria (16 bytes, `expo-crypto`), igual para la respuesta de recuperación. **Mejora prevista**: PBKDF2/Argon2id server-side al migrar auth al backend.
- Snapshot financiero nunca viaja completo al backend: `buildChatContext` envía solo agregados ya calculados (safe to spend, próximos vencimientos, totales por categoría, metas).

## Secretos (§75)

- Ninguna API key en el repo. `Ai:ApiKey` se inyecta por variables de entorno (`Ai__ApiKey`) o user-secrets; `appsettings.json` la lleva vacía.
- `.gitignore`: `.env` (mobile), `appsettings.Development.json` (backend, además des-trackeado con `git rm --cached`).
- `mobile/.env.example` documenta `EXPO_PUBLIC_API_URL` sin valores sensibles.

## Backend

- **Rate limiting** fijo por política `"ai"` sobre `/api/ai/chat` (`RequireRateLimiting`), particionado.
- **CORS** con orígenes explícitos vía `Cors:AllowedOrigins`.
- Timeout de IA configurable (`Ai:TimeoutSeconds`, default 20 s); el cliente mobile además corta a los 12 s (`AI_REQUEST_TIMEOUT_MS`).
- **Pendiente para producción**: forzar HTTPS (`UseHsts`/redirect), validación de tamaño máximo de payload del `question`, y auth real cuando existan endpoints de datos.

## Prompt injection (§12)

- Todo texto libre (pregunta, descripciones, nombres de comercio/metas) se trata como **DATA**: `PromptBuilder` serializa el contexto dentro de una valla de datos e instruye al modelo a ignorar instrucciones internas; `PromptBuilder.Sanitize` strippea el sentinel de la valla y colapsa caracteres de control, con límite de longitud (`FinancialContextBuilder.Clean`). Cubierto por tests (`PromptBuilderTests`).
- La salida del modelo se **valida estructuralmente** (`AiResponseParser` + límites de longitud) y nunca se usa para modificar finanzas: los números que ve el usuario vienen del engine determinístico (§38).

## Superficie de ataque reducida

- Sin uploads de archivos, sin webviews con contenido remoto, sin deep links entrantes sensibles (solo `scheme: alcancia`).
- La ruta interna `app/dev/design-system.tsx` debe excluirse de builds de producción (P3).
- Logs: no se imprimen contraseñas, tokens ni montos sensibles; los errores de red se registran sin cuerpos de request.

## Checklist al añadir el backend de datos

- [ ] JWT corto + refresh token rotativo con detección de replay.
- [ ] Autorización por household **en servidor** (IDOR): ningún dato de otro miembro sin permiso explícito.
- [ ] DTOs de entrada validados (FluentValidation/DataAnnotations), sin mass-assignment (modelos explícitos).
- [ ] HTTPS obligatorio + HSTS; cookies/tokens fuera de logs.
- [ ] Migraciones EF Core revisadas; índices en `(userId, date)`, `(householdId)`.
- [ ] Borrado de cuenta y exportación de datos (§21).
