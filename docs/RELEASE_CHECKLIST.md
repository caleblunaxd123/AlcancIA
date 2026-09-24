# RELEASE_CHECKLIST.md — Preparación para producción (§30)

_Actualizado: 2026-09-23. Guía paso a paso en [DEPLOY.md](DEPLOY.md)._

## Quality gates (verificados en esta versión)

- [x] `npm run typecheck` · `npm run lint` — limpios
- [x] `npx jest` — 175/175 (incluye auth y sync contra una API falsa en memoria)
- [x] `npx expo-doctor` — 21/21
- [x] `npx expo export --platform android` con URL HTTPS — bundle Hermes 6.5 MB
- [x] `dotnet build -c Release` — 0 errores, 0 advertencias
- [x] `dotnet test` — 66/66 contra PostgreSQL real (63 + 3 omitidas en SQLite)
- [x] Imagen Docker probada en modo Production: no arranca sin secretos, migra sola, redirige a HTTPS, HSTS, cabeceras de seguridad, llaves cifradas con llave maestra, usuario no-root
- [x] Verificado en emulador: registro con código por correo, onboarding, Home, cálculo, pantallas legales
- [ ] Activación en la nube de una cuenta previa y sincronización entre dos celulares, en dispositivo (pendiente con el usuario)
- [ ] E2E automatizado (Maestro) — opcional

## App

- [x] `version 1.0.0`, `versionCode 1`, `buildNumber 1`, numeración remota con `autoIncrement` (EAS)
- [x] `eas.json` con perfiles development / preview / production y variables por entorno
- [x] Release exige `EXPO_PUBLIC_API_URL` HTTPS (falla cerrada si no)
- [x] Permisos Android mínimos (bloqueados almacenamiento externo y overlay)
- [x] `ITSAppUsesNonExemptEncryption=false` (solo cifrado estándar)
- [x] Galería interna `/dev/design-system` inaccesible en release
- [x] Facebook oculto hasta tener verificación en servidor
- [x] Versión visible en Mi cuenta
- [ ] `eas init` (owner + projectId) y variables de entorno en EAS
- [ ] Keystore de release (EAS) y cliente OAuth Android con su SHA-1
- [ ] Publicar la app OAuth de Google (salir de modo Testing)

## Backend

- [x] Cuentas, sesiones rotativas, verificación por correo, sync cifrado (ver SECURITY.md)
- [x] Borrar cuenta (con código) y exportar datos
- [x] Health `/health` y readiness `/health/ready`
- [x] Rate limiting en auth, correo, sync e IA
- [x] Dockerfile + guía de variables
- [ ] Desplegar PostgreSQL + API con dominio y TLS
- [ ] Proveedor de correo transaccional con dominio propio (Gmail sirve para empezar; ~500/día)
- [ ] Monitoreo / alertas del hosting sobre `/health/ready` y logs de error

## Tiendas y legal

- [x] Política de privacidad y términos dentro de la app (Ley 29733), enlazados desde el registro y Mi cuenta
- [x] Borrado de cuenta dentro de la app (requisito de Google Play y App Store)
- [x] Descarga de datos (derecho de acceso)
- [x] Titular y RUC en `mobile/src/content/legal.ts` (Caleb Daniel Luna Solis, RUC 10750638398)
- [ ] Publicar la política y los términos en una URL pública
- [ ] Ficha de tienda: descripción, capturas, ícono 512 px, gráfico destacado, categoría "Finanzas"
- [ ] Formulario de seguridad de datos de Google Play (datos recopilados: nombre, correo, info financiera; cifrados en tránsito; el usuario puede pedir su eliminación)
- [ ] Cuenta Apple Developer para iOS

## Comandos de release

```bash
docker build -t alcancia-api ./backend          # backend
cd mobile
eas build --platform android --profile preview   # validación interna (APK)
eas build --platform android --profile production
eas submit --platform android --profile production
```
