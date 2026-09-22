# AlcancIA — Arquitectura

## Stack (mobile)

- **Expo SDK 57**, React Native 0.86, **TypeScript strict** (+ `noUncheckedIndexedAccess`).
- **Expo Router** (rutas basadas en archivos, typed routes).
- **React Native Reanimated 4** (+ worklets) para animaciones en UI thread.
- **React Native Gesture Handler** para el slider y gestos.
- **Zustand** para estado (`financialStore`, `appStore`).
- **react-native-svg** para mascota y Casa Financiera.
- **Lucide** para iconografía (una sola familia).
- **Plus Jakarta Sans** vía `@expo-google-fonts`.

Selección deliberadamente mínima: solo dependencias mantenidas y necesarias.

## Estructura

```
mobile/
  app/                       # rutas (Expo Router)
    _layout.tsx              # fuentes, ThemeProvider, splash, Stack raíz
    index.tsx                # gate onboarding vs tabs
    onboarding.tsx
    (tabs)/                  # Inicio, Movimientos, AlcancIA, Metas, Familia
    puedo-compralo.tsx       # modal
    meta/[id].tsx            # detalle de meta
    dev/design-system.tsx    # galería de componentes
  src/
    theme/                   # tokens + ThemeProvider (dark/light, reduced motion)
    engine/                  # motor financiero determinístico (+ tests)
    components/
      common/                # Text, Button, Card, Chip, BottomSheet, ...
      financial/             # Money, Mascot, House, SafeToSpend, Goal, ...
      navigation/            # TabBar (botón central IA)
    features/                # hooks de pantalla (useHomeData)
    store/                   # zustand
    data/                    # demo dataset (hogar peruano)
    types/                   # dominio + money
    constants/ utils/        # categorías, fechas, formato
```

## Decisiones

- **Motor separado de la UI.** La lógica financiera es TS puro, sin imports de RN, por
  lo que se testea con un jest mínimo (node), independiente del runtime móvil.
- **Tokens, no colores.** El tema se inyecta por contexto; cambiar la marca o el modo
  es un solo lugar.
- **Money en enteros.** Ver [FINANCIAL_ENGINE.md](FINANCIAL_ENGINE.md).
- **Fechas locales.** Los strings `YYYY-MM-DD` se parsean como hora local para no
  correr el día en zonas con offset negativo (Perú UTC-5).

## Calidad

`npm run typecheck`, `npm run lint`, `npm test` pasan en verde. El bundle de Metro
(`expo export`) compila la app completa sin errores.

## Backend (planificado)

.NET 9 Web API, Clean Architecture pragmática, EF Core + PostgreSQL, JWT + refresh
tokens, FluentValidation, Serilog, OpenAPI, rate limiting, health checks. El motor
financiero se reimplementa/valida en el servidor como fuente autoritativa. Ver
[ROADMAP.md](ROADMAP.md).
