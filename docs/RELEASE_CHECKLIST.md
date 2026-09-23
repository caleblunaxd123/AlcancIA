# RELEASE_CHECKLIST.md — Preparación para producción (§30)

_No publicar nada desde aquí; este checklist deja el lanzamiento preparado. Actualizado: 2026-09-22._

## Quality gates (estado actual)

- [x] `npm run typecheck` — limpio
- [x] `npm run lint` — limpio
- [x] `npx jest` — 102/102
- [x] `npx expo-doctor` — 21/21
- [x] `npx expo export --platform android` — bundle Hermes 6.3 MB OK
- [x] `dotnet build` + `dotnet test` — 0 warnings, 31/31
- [ ] Verificación en dispositivo físico/emulador con Expo Go SDK 57 o dev build (entorno bloqueado, ver KNOWN_LIMITATIONS #5)
- [ ] E2E Maestro smoke: onboarding → crear gasto → safe to spend → ¿puedo comprarlo?

## Configuración de la app

- [x] `slug: alcancia`, `version: 0.1.0`, `scheme: alcancia`
- [x] `runtimeVersion: { policy: "appVersion" }` (compatibilidad OTA/EAS Update)
- [x] bundleIdentifier iOS `com.alcancia.app` / package Android `com.alcancia.app`
- [x] Icon, adaptive icon (foreground/background/monochrome), splash, favicon presentes y livianos
- [x] `userInterfaceStyle: automatic` (dark mode real vía tokens)
- [ ] `owner` (cuenta Expo) y `extra.eas.projectId` al crear el proyecto EAS
- [ ] Excluir `app/dev/design-system.tsx` del bundle de producción

## Entorno y secretos

- [x] `mobile/.env.example` documentado (`EXPO_PUBLIC_API_URL`)
- [x] Sin secretos en repo; backend usa `Ai__ApiKey` por env
- [ ] Fijar `EXPO_PUBLIC_API_URL` de producción (HTTPS) en el perfil de build EAS
- [ ] Backend producción: HTTPS obligatorio + HSTS, `Cors:AllowedOrigins` acotado, `Ai:Provider` y modelo configurados por env

## Backend

- [x] Health endpoint (`GET /health`)
- [x] Rate limiting en `/api/ai/chat`
- [ ] Backend de datos (usuarios/households/transacciones) — hoy la app es local-first; publicar como "beta local" o completar backend antes (decisión de negocio)
- [ ] Error reporting/analytics (abstracción lista para enchufar; hoy no hay proveedor configurado)

## Tiendas

- [ ] Textos de tienda, screenshots, política de privacidad y términos (§30: placeholders pendientes)
- [ ] Consentimiento y borrado de cuenta documentados (§21)
- [ ] Firma de release Android (keystore fuera del repo) y certificado iOS

## Comandos de release (cuando corresponda)

```bash
cd mobile
npx eas build --platform android --profile preview   # validación interna
npx eas build --platform all --profile production
npx eas submit --platform all
```
