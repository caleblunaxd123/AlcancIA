# AlcancIA — Lenguaje de diseño

Dirección: **naturaleza + crecimiento + hogar + inteligencia**. Fintech premium con
el *delight* de Duolingo, la calidez de Headspace y la limpieza de Apple — pero con
identidad propia. Dark mode es el look hero.

Fuente de verdad en código: `mobile/src/theme/`. Los componentes **nunca**
hardcodean colores; consumen tokens vía `useTheme()`.

## Color

Primitivas en `palette.ts`; tokens semánticos en `tokens.ts` (dark + light).

| Rol | Dark | Sentido |
|-----|------|---------|
| `background.primary` | navy `#071526` | lienzo "money night" |
| `surface.primary` | navy elevado | tarjetas |
| `brand.primary` | violeta `#9370FF` | inteligencia / IA |
| `money.positive` | mint `#42E0B5` | dinero positivo, crecimiento |
| `status.warning` | ámbar suave | "pon atención" |
| `status.danger` | coral suave | solo crítico real |

Regla: el rojo agresivo se evita salvo situaciones realmente críticas.

## Tipografía

**Plus Jakarta Sans**. Escala en `typography.ts`: `display`, `title`, `subtitle`,
`h3`, `body`, `caption`, `label`, y variantes monetarias (`moneyLarge`,
`moneyMedium`, `moneySmall`, `displayMoney`).

El componente `<Money>` estiliza el símbolo más pequeño y las decimales atenuadas
para un acabado premium: **S/** `742`.50

## Espaciado, radios, elevación

Grid base de 4pt (`spacing.ts`). Radios altos (cards `xl` = 20). Sombras
restringidas — profundidad, no oscuridad.

## Motion (`motion.ts`)

Duraciones centralizadas: `fast` 140ms, `normal` 220ms, `slow` 360ms,
`celebration` 620ms. Springs: `soft`, `snappy`, `celebration`.

Reglas:
- La animación sirve a feedback, jerarquía, progreso, celebración o transición —
  nunca decoración constante.
- Microinteracciones 150–350ms; celebraciones más largas.
- Nunca bloquear la interacción esperando animaciones. Objetivo 60 FPS (UI thread
  vía Reanimated).
- Se respeta **reduced motion** del sistema (`theme.reducedMotion`).

## Componentes clave

`Text`, `Icon` (Lucide), `Card` (variantes default/highlight/insight/success/goal),
`Button`, `Chip`, `BottomSheet`, `EmptyState`, `Money`, `MoneyCounter`,
`AnimatedProgress`, `ScenarioSlider`, `AlcanciaMascot`, `FinancialHouse`,
`FinancialWeather`, `SafeToSpendCard`, `GoalCard`, `InsightCard`, `TransactionRow`.

Galería viva: ruta `/dev/design-system` en la app.

## Mascota

Alcancía rosa, moderna, tierna sin ser infantil, con badge **IA**. Implementada como
una fachada de componente (`AlcanciaMascot`) con 6 moods (`neutral`, `happy`,
`thinking`, `celebrating`, `warning`, `sleeping`) y micro-animaciones sutiles
(breathing, floating). Los estados principales consumen arte 3D propio desde
`mobile/assets/branding/`; las pantallas nunca importan el archivo directamente,
por lo que nuevos moods o Rive pueden incorporarse sin cambiar la API pública.

## Ilustración de producto

- `FinancialHouse` combina una escena 3D original con datos vivos de salud,
  progreso y clima. La imagen aporta profundidad; el estado nunca se hornea en el
  bitmap.
- `GoalCover` tiene arte 3D original para los nueve tipos: vivienda, viaje, auto,
  estudios, emergencia, boda, tecnología, mascota y personalizada. Todos usan un
  drift cinematográfico sutil, entrada animada y una línea de luz vinculada al
  progreso real. Reduced Motion elimina el movimiento ambiental.
- `MissionCard` utiliza estados visuales propios de la mascota y progreso derivado
  de movimientos/metas. Las misiones reclamadas se persisten y pasan a
  “Completadas”.
- El asistente combina quick prompts, conversación libre, respuestas financieras
  enriquecidas y fallback determinístico local cuando el backend no está disponible.
- Los assets finales viven en `mobile/assets/branding/`; las referencias de arte
  se conservan solo en `docs/design-reference/` y no se usan como screenshots en
  la interfaz.

## Accesibilidad

Labels y roles, contraste suficiente, texto escalable, touch targets ≥44px, no
depender solo del color, reduced motion, dark/light, haptics desactivables.
