# SECURITY.md — Postura de seguridad de AlcancIA

_Actualizado: 2026-09-23. Auditoría orientada a producción (§10/§12)._

## Modelo actual

**Offline-first con cuentas en la nube.** La app escribe siempre primero en el dispositivo (SecureStore) y sincroniza un documento por usuario con el backend. Los cálculos financieros siguen siendo del engine local (§38); el servidor solo guarda (ver `KNOWN_LIMITATIONS.md`).

## Datos en reposo (mobile)

- `financialStore` y `authStore` persisten vía `secureFinancialStorage`: **expo-secure-store** (iOS Keychain `WHEN_UNLOCKED_THIS_DEVICE_ONLY` / Android Keystore), valores chunked (1.5 KB) con migración automática desde AsyncStorage en texto plano y borrado del legacy.
- El dispositivo ya no guarda contraseñas de cuentas en la nube: solo el refresh token (SecureStore, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`); el access token vive en memoria. Las cuentas previas a la nube conservan su hash local SHA-256 + salt hasta activarse.
- Snapshot financiero nunca viaja completo al backend: `buildChatContext` envía solo agregados ya calculados (safe to spend, próximos vencimientos, totales por categoría, metas).

## Secretos (§75)

- Ninguna API key en el repo. `Ai:ApiKey` se inyecta por variables de entorno (`Ai__ApiKey`) o user-secrets; `appsettings.json` la lleva vacía.
- `.gitignore`: `.env` (mobile), `appsettings.Development.json` (backend, además des-trackeado con `git rm --cached`).
- `mobile/.env.example` documenta `EXPO_PUBLIC_API_URL` sin valores sensibles.

## Backend

- **Rate limiting** fijo por política `"ai"` sobre `/api/ai/chat` (`RequireRateLimiting`), particionado.
- **CORS** con orígenes explícitos vía `Cors:AllowedOrigins`.
- Timeout de IA configurable (`Ai:TimeoutSeconds`, default 20 s); el cliente mobile además corta a los 12 s (`AI_REQUEST_TIMEOUT_MS`).
- **Contraseñas**: PBKDF2 (`PasswordHasher` de ASP.NET Identity) con rehash automático. Política: 8–128, mayúscula, minúscula y número.
- **Sesiones**: JWT HS256 de 15 min (llave de ≥32 bytes en user-secrets/entorno) + refresh token opaco de 32 bytes, guardado como SHA-256, rotativo. Reusar un token rotado revoca toda su familia; el reclamo del token es atómico (`ExecuteUpdate … where RevokedAt is null`), probado con carreras reales en PostgreSQL. Cambio/reseteo de contraseña sube `SecurityStamp` (invalida access tokens al instante) y revoca todas las sesiones.
- **Registro y recuperación** exigen ticket de verificación de correo (Data Protection, 15 min, un solo uso, ligado a correo+propósito). La recuperación responde igual exista o no el correo (sin enumeración). El login devuelve el mismo error para correo o contraseña incorrectos.
- **Google**: el servidor valida el access token con Google (audiencia = client IDs propios, correo verificado); nunca confía en el perfil que envía la app.
- **Datos en reposo (servidor)**: el documento de cada usuario se cifra con ASP.NET Data Protection. Las llaves se guardan en la base **cifradas con AES-256-GCM bajo `DataProtection__MasterKey`**, que vive fuera de la base (secretos del hosting): un volcado de la base por sí solo no permite descifrar. Tests verifican que el texto no aparece en claro y que sin la llave maestra correcta no se puede leer. Autorización por usuario: `/api/sync` solo usa el `sub` del token (sin IDs en la ruta, sin IDOR). Límite de 2 MB por documento; reloj del cliente acotado a "ahora".
- **Rate limiting** por IP: `auth` (30/5 min), `email` (20/10 min + 1 min por correo y propósito), `sync` (60/min), `ai` (20/min).
- **Producción**: la API no arranca sin connection string, llave de firma (≥32 bytes), llave maestra (32 bytes) y correo. Redirige a HTTPS + HSTS 1 año, confía en un solo proxy (`Hosting__BehindProxy`), responde errores genéricos sin detalles internos y agrega `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` y `Cache-Control: no-store`. Imagen Docker no-root.
- **Borrado y exportación de cuenta**: `DELETE /api/auth/me` exige un ticket de código por correo (propósito `delete`) y borra en cascada usuario, sesiones y datos; `GET /api/auth/me/export` devuelve perfil + datos descifrados.
- **App en release**: exige `EXPO_PUBLIC_API_URL` https (si no, usa un host no enrutable: nunca envía credenciales por HTTP).
- **Pendiente**: rotación periódica de la llave JWT (hoy rotarla cierra todas las sesiones), WAF/anti-bot del hosting.

## Prompt injection (§12)

- Todo texto libre (pregunta, descripciones, nombres de comercio/metas) se trata como **DATA**: `PromptBuilder` serializa el contexto dentro de una valla de datos e instruye al modelo a ignorar instrucciones internas; `PromptBuilder.Sanitize` strippea el sentinel de la valla y colapsa caracteres de control, con límite de longitud (`FinancialContextBuilder.Clean`). Cubierto por tests (`PromptBuilderTests`).
- La salida del modelo se **valida estructuralmente** (`AiResponseParser` + límites de longitud) y nunca se usa para modificar finanzas: los números que ve el usuario vienen del engine determinístico (§38).

## Superficie de ataque reducida

- Sin uploads de archivos, sin webviews con contenido remoto, sin deep links entrantes sensibles (solo `scheme: alcancia`).
- La ruta interna `app/dev/design-system.tsx` debe excluirse de builds de producción (P3).
- Logs: no se imprimen contraseñas, tokens ni montos sensibles; los errores de red se registran sin cuerpos de request.

## Checklist al añadir el backend de datos

- [x] JWT corto + refresh token rotativo con detección de replay (atómico).
- [ ] Autorización por household **en servidor** (IDOR): ningún dato de otro miembro sin permiso explícito.
- [ ] DTOs de entrada validados (FluentValidation/DataAnnotations), sin mass-assignment (modelos explícitos).
- [x] HTTPS obligatorio + HSTS; tokens fuera de logs.
- [x] Migraciones EF Core revisadas (probadas en PostgreSQL real). Pendiente índice `(householdId)` al compartir.
- [ ] Borrado de cuenta y exportación de datos (§21).
