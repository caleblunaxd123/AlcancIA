# DEPLOY.md — Cómo publicar AlcancIA

_Actualizado: 2026-09-23._ Guía para llevar el backend y la app a producción. Nada de esto se ejecuta solo: cada paso lo hace el dueño del proyecto con sus credenciales.

## 1. Backend (API .NET + PostgreSQL)

### Base de datos
Cualquier PostgreSQL 14+ administrado (Neon, Supabase, Railway, Render, Azure Database for PostgreSQL). Crea una base `alcancia` y un usuario con permisos sobre ella. Las tablas las crea la API al arrancar (migraciones automáticas).

### Imagen
```bash
docker build -t alcancia-api ./backend
```
La imagen corre como usuario no-root en el puerto **8080**, en modo `Production`, aplica migraciones al arrancar (`Database__MigrateOnStartup=true`) y confía en **un** proxy delante (`Hosting__BehindProxy=true`) para HTTPS e IP real.

### Variables de entorno (obligatorias)
La API **no arranca** si falta alguna y dice cuál (sin mostrar valores).

| Variable | Qué es | Cómo generarla |
|---|---|---|
| `ConnectionStrings__Database` | Conexión a PostgreSQL | La da tu proveedor. Usa `SSL Mode=Require`. |
| `Auth__SigningKey` | Llave de firma de sesiones (JWT) | `openssl rand -base64 64` |
| `DataProtection__MasterKey` | Cifra las llaves que cifran los datos de usuarios | `openssl rand -base64 32` (exactamente 32 bytes) |
| `Email__Username` / `Email__Password` | Cuenta de envío de códigos | Gmail + contraseña de aplicación, o un proveedor transaccional |
| `Auth__GoogleClientIds__0` | Client ID de Google de Android (release) | Google Cloud → Credenciales |

Opcionales: `Email__Host` (default `smtp.gmail.com`), `Email__Port` (587), `Email__From`, `Auth__GoogleClientIds__1` (iOS), `Cors__AllowedOrigins__0`, `Ai__Provider`/`Ai__ApiKey`/`Ai__Model` (IA externa; sin ellas usa el motor local).

> ⚠️ **Guarda `DataProtection__MasterKey` y `Auth__SigningKey` en el gestor de secretos del hosting y en un respaldo seguro.** Si pierdes la llave maestra, los datos cifrados de los usuarios no se pueden recuperar. Cambiar la llave de firma cierra todas las sesiones.

### Sondas de salud
- Liveness: `GET /health`
- Readiness (incluye la base): `GET /health/ready`

### Dominio y HTTPS
Apunta un dominio (ej. `api.alcancia.app`) al servicio y activa el certificado TLS del hosting. La API redirige HTTP→HTTPS y envía HSTS (1 año).

### Verificación después de desplegar
```bash
curl https://api.TU-DOMINIO/health/ready          # {"status":"ready"}
curl -I https://api.TU-DOMINIO/health             # Strict-Transport-Security, no-store
```

### Opción actual: Cloudflare Tunnel desde la PC (beta)
Hoy la API corre así: **`https://alcancia.lunalav.pe`** → túnel de Cloudflare `alcancia` → contenedor `alcancia-api` (imagen de producción) en `127.0.0.1:8080` → PostgreSQL `alcancia-db`. No abre puertos en el router; el certificado HTTPS lo pone Cloudflare. Es un túnel **separado** del de LunaLav (`lunalav-pc`).

- Configuración: `%USERPROFILE%/.cloudflared/alcancia.yml` (credenciales del túnel en el mismo directorio; no se suben al repo).
- Levantar la API: script que pasa los user-secrets como variables al contenedor sin mostrarlos (el contenedor tiene `--restart unless-stopped`, vuelve solo si Docker Desktop está abierto).
- Levantar el túnel:
  ```bash
  cloudflared tunnel --config %USERPROFILE%/.cloudflared/alcancia.yml run alcancia
  ```
- **Arranque automático**: tarea programada de Windows **"AlcancIA - Servidor"** (al iniciar sesión, sin permisos de administrador). Ejecuta `ops/windows/start-alcancia.ps1`: abre Docker Desktop, levanta `alcancia-db` y `alcancia-api` y el túnel. Registro: `%LOCALAPPDATA%/AlcancIA/autostart.log` y `tunnel.log`.
  - Instalar: `powershell -ExecutionPolicy Bypass -File ops/windows/register-autostart.ps1`
  - Quitar: `Unregister-ScheduledTask -TaskName 'AlcancIA - Servidor' -Confirm:$false`
- Limitación: solo funciona con la PC encendida y **con tu sesión de Windows iniciada** (la tarea corre al iniciar sesión). Para 24/7 se despliega la misma imagen en la nube y se cambia el CNAME `alcancia` en Cloudflare; la app no cambia de URL.

## 2. App (Expo EAS)

1. `npm i -g eas-cli && eas login`, luego en `mobile/`: `eas init` (crea el proyecto y agrega `extra.eas.projectId` y `owner` a `app.json`).
2. Variables por entorno en EAS (visibilidad "Plain text"; son públicas dentro de la app):
   ```bash
   eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://api.TU-DOMINIO
   eas env:create --environment production --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value <client id release>
   # repetir para "preview" (y "development" si usas builds en la nube)
   ```
   En builds de release la URL **debe** ser `https://`; si no, la app no se conecta (falla cerrada).
3. Firma Android: `eas credentials` genera y guarda el keystore de release. Copia su **SHA-1** y crea en Google Cloud un cliente OAuth Android nuevo con `com.alcancia.app` + ese SHA-1. Pon ese Client ID en EAS y en `Auth__GoogleClientIds__0` del backend.
4. Prueba interna: `eas build --platform android --profile preview` (APK instalable).
5. Tienda: `eas build --platform android --profile production` (AAB) y `eas submit --platform android --profile production` (sube a la pista *internal* como borrador).
6. iOS: requiere cuenta Apple Developer. `eas build --platform ios --profile production` y `eas submit --platform ios`. Crea además un Client ID de Google tipo iOS.

## 3. Google OAuth en producción
La pantalla de consentimiento está en modo **Testing** (solo usuarios de prueba). Antes de lanzar: Google Auth Platform → Público → **Publicar app**. Con los permisos actuales (`openid`, `email`, `profile`) no requiere verificación de Google.

## 4. Textos legales
El texto de la política y los términos vive en `mobile/src/content/legal.ts`. Antes de publicar:
- Publica el mismo texto en una URL pública (las tiendas la piden), por ejemplo `https://TU-DOMINIO/privacidad`.
- Si tratas datos de residentes en Perú a escala, evalúa la inscripción del banco de datos ante la Autoridad Nacional de Protección de Datos Personales.
