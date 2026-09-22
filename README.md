# AlcancIA

**Entiende tu dinero. Prueba tu futuro.**

AlcancIA no es una app para apuntar gastos. Es un sistema operativo financiero
para una persona, pareja o familia: convierte datos en decisiones comprensibles
y te deja **simular el futuro antes de tomarlo**.

La mayoría de apps responden *¿cuánto gasté?*. AlcancIA responde *¿cómo estoy?*,
*¿cuánto puedo gastar de verdad?* y *¿qué pasaría si…?*.

---

## Estado actual

Este repositorio contiene la **primera vertical slice funcional** del producto:
la identidad visual, el motor financiero determinístico y las experiencias hero.

### Implementado

- **Design System AlcancIA** — tokens de color (navy / violeta / mint), tipografía
  (Plus Jakarta Sans), spacing, radios, motion y springs. Dark mode como look hero
  + light mode cálido real. Nada hardcodeado en componentes.
- **Financial Engine** (determinístico, testeado — 22 tests):
  - `safeToSpend` — *Dinero seguro para gastar*, con desglose explicable ("¿Cómo lo
    calculamos?").
  - `weather` — *Clima Financiero* (nunca alarmista).
  - `goals` — proyección de metas y escenarios "con aporte extra".
  - `purchase` — simulador *¿Puedo comprarlo?* (informa, nunca ordena).
  - `insights` — hallazgos cálidos y específicos.
  - `money` — aritmética en céntimos enteros (nunca floats).
- **Pantallas**: Onboarding animado, Home (hero), ¿Puedo comprarlo?, Detalle de
  Meta con slider en vivo, Movimientos, AlcancIA (asistente), Metas, Familia, y una
  galería interna `/dev/design-system`.
- **Componentes**: mascota AlcancIA (SVG, 6 moods), Casa Financiera viva, contadores
  de dinero animados, progreso animado, slider gestual, bottom sheets, y más.
- **Accesibilidad**: reduced-motion, roles/labels, touch targets ≥44px, contraste.

### Aún no (con roadmap documentado)

Backend .NET, IA conversacional real (Gemini), OCR de comprobantes, hogares
compartidos con permisos, gamificación completa. Ver [docs/ROADMAP.md](docs/ROADMAP.md).

---

## Estructura del repo

```
AlcancIA/
  mobile/            App React Native (Expo + Expo Router + TypeScript strict)
  docs/              Documentación de producto, diseño y arquitectura
```

## Cómo ejecutar la app

Requisitos: Node 20+, y la app **Expo Go** en tu teléfono (o un emulador).

```bash
cd mobile
npm install
npx expo start
```

Escanea el QR con Expo Go. La app arranca con **datos demo** (hogar peruano
realista), así que todo es explorable sin registrarte.

## Scripts

```bash
cd mobile
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint
npm test            # jest — motor financiero
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
