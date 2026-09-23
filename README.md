# AlcancIA

**Entiende tu dinero. Prueba tu futuro.**

AlcancIA no es una app para apuntar gastos. Es un sistema operativo financiero
para una persona, pareja o familia: convierte datos en decisiones comprensibles
y te deja **simular el futuro antes de tomarlo**.

La mayoría de apps responden *¿cuánto gasté?*. AlcancIA responde *¿cómo estoy?*,
*¿cuánto puedo gastar de verdad?* y *¿qué pasaría si…?*.

---

## Estado actual

Este repositorio contiene una **vertical slice funcional y ejecutable** del producto:
identidad visual, operaciones financieras locales, recurrencias, misiones y asistente
con backend opcional.

### Implementado

- **Design System AlcancIA** — modo claro cálido, tipografía Plus Jakarta Sans,
  superficies accesibles, motion reducido cuando el sistema lo solicita y assets
  WebP optimizados. Cada tipo de meta tiene una ilustración propia.
- **Financial Engine** (determinístico y testeado):
  - `safeToSpend` — *Dinero seguro para gastar*, con desglose explicable ("¿Cómo lo
    calculamos?").
  - `weather` — *Clima Financiero* (nunca alarmista).
  - `goals` — proyección de metas y escenarios "con aporte extra".
  - `purchase` — simulador *¿Puedo comprarlo?* (informa, nunca ordena).
  - `insights` — hallazgos cálidos, específicos y basados en ventanas temporales.
  - `recurrence` — proyección semanal, quincenal, mensual y anual con manejo de fin de mes.
  - `money` — aritmética en céntimos enteros (nunca floats).
- **Pantallas**: onboarding, Home, ¿Puedo comprarlo?, metas y aportes, movimientos,
  calendario, deudas, suscripciones, misiones, asistente, Familia (preview) y la
  galería interna `/dev/design-system`.
- **Componentes**: mascota AlcancIA (SVG, 6 moods), Casa Financiera viva, contadores
  de dinero animados, progreso animado, slider gestual, bottom sheets, y más.
- **Integridad local**: aportes y pagos son operaciones atómicas, validan saldo y
  crean movimientos reversibles enlazados. Los datos financieros se guardan en
  Keychain/Keystore mediante SecureStore (con migración desde AsyncStorage).
- **Accesibilidad**: reduced-motion, roles/labels, estados de error, modales
  semánticos, sliders operables y touch targets ≥44px.
- **Cuentas en la nube**: registro con código por correo, login, Google (verificado
  en servidor), recuperación por correo y cambio de contraseña que cierra las demás
  sesiones. Sesiones JWT + refresh rotativo; contraseñas con PBKDF2 en el servidor.
- **Sincronización offline-first**: la app funciona sin internet y respalda tus datos
  cifrados en el servidor; al entrar desde otro celular los ves igual. Las cuentas
  creadas antes se activan en la nube con un código, sin perder datos.
- **Edición segura**: movimientos manuales, metas, deudas y suscripciones pueden
  actualizarse sin perder progreso ni desbalancear el saldo. Operaciones enlazadas
  permanecen protegidas.
- **Calidad verificada**: 94 pruebas mobile y 31 pruebas backend, TypeScript strict,
  lint, Expo Doctor (21/21) y export Android exitoso.

### Pendiente para producción

Hogares compartidos con autorización de servidor, merge de sincronización por
entidad, borrado/exportación de cuenta, HTTPS y despliegue, OCR de comprobantes, telemetría/crash reporting y
credenciales reales del proveedor de IA. Ver [docs/ROADMAP.md](docs/ROADMAP.md).

---

## Estructura del repo

```
AlcancIA/
  mobile/            App React Native (Expo + Expo Router + TypeScript strict)
  backend/           API .NET 9 — cuentas, sync cifrado e IA (EF Core + PostgreSQL)
  docs/              Documentación de producto, diseño y arquitectura
```

## Cómo ejecutar el backend

```bash
docker compose up -d db                      # PostgreSQL local en 127.0.0.1:5440
cd backend
# Secretos locales (una vez; se guardan fuera del repo):
dotnet user-secrets set "ConnectionStrings:Database" "Host=127.0.0.1;Port=5440;Database=alcancia;Username=alcancia;Password=alcancia_local_dev" --project AlcancIA.Api
dotnet user-secrets set "Auth:SigningKey" "<64+ caracteres aleatorios>" --project AlcancIA.Api
dotnet user-secrets set "Email:Username" "tu-cuenta@gmail.com" --project AlcancIA.Api
dotnet user-secrets set "Email:Password" "<contraseña de aplicación>" --project AlcancIA.Api
dotnet user-secrets set "Auth:GoogleClientIds:0" "<client id de Android>" --project AlcancIA.Api
dotnet ef database update --project AlcancIA.Infrastructure --startup-project AlcancIA.Api
dotnet run --project AlcancIA.Api --urls http://0.0.0.0:5080
```

Endpoints: `/api/auth/*` (registro, login, Google, refresh, logout, recuperación, perfil),
`/api/email/*` (códigos), `/api/sync` (datos cifrados) y `/api/ai/chat` (ver
[docs/AI.md](docs/AI.md)). Para el emulador Android: `adb reverse tcp:5080 tcp:5080`.
Tests: `dotnet test` usa SQLite en memoria; con
`ALCANCIA_TEST_PG="Host=127.0.0.1;Port=5440;Username=alcancia;Password=alcancia_local_dev"`
corre todo contra PostgreSQL real, incluidas las pruebas de concurrencia.

## Cómo ejecutar la app

Requisitos: Node 20+, y la app **Expo Go** en tu teléfono (o un emulador).

```bash
cd mobile
npm install
npx expo start
```

Escanea el QR con Expo Go. La app arranca con **datos demo** (hogar peruano
realista), así que todo es explorable sin registrarte. En Android Emulator también
puedes usar `adb reverse tcp:8081 tcp:8081` y abrir la URL de Expo.

## Scripts

```bash
cd mobile
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint
npm test            # jest — motor, stores, misiones y servicios
```

## Documentación

- [docs/PRODUCT.md](docs/PRODUCT.md) — visión y diferenciadores
- [docs/DESIGN_LANGUAGE.md](docs/DESIGN_LANGUAGE.md) — lenguaje visual y design system
- [docs/FINANCIAL_ENGINE.md](docs/FINANCIAL_ENGINE.md) — cómo se calcula el dinero
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — arquitectura y decisiones
- [docs/ROADMAP.md](docs/ROADMAP.md) — fases del producto

## Principios que no se negocian

1. **La IA nunca hace la matemática financiera.** El motor determinístico calcula;
   la IA solo interpreta y explica.
2. **AlcancIA informa, el usuario decide.** Nunca "compra" / "no compres".
3. **Sin vergüenza.** La gamificación motiva y celebra; nunca juzga la deuda ni los
   bajos ingresos.
4. **Todo debe funcionar sin IA.** Si el proveedor de IA cae, la app sigue viva.
