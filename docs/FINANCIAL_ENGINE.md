# AlcancIA — Motor Financiero

**Principio inquebrantable:** los cálculos críticos NO dependen de la IA. El motor es
código determinístico y testeado. La IA solo interpreta y explica.

```
Financial Engine  →  JSON estructurado  →  Explicación IA  →  Usuario
```

Nunca: `Usuario → IA → cálculo inventado`.

Código: `mobile/src/engine/`. Tests: `mobile/src/engine/__tests__/` (22 tests).

## Dinero como enteros

El dinero se representa como **céntimos enteros** (`Money = { minor, currency }`).
Nunca floats. `fromMajor(742.5) → 74250`. Toda la aritmética vive en `money.ts` y
evita el clásico error `0.1 + 0.2` (tests lo verifican).

## Safe To Spend (`safeToSpend.ts`)

```
saldo_actual
- obligaciones_confirmadas (recurrentes esenciales que vencen antes del próximo ingreso)
- cuotas de deuda del periodo
- suscripciones del periodo
- gastos esenciales estimados (prorrateados del gasto real observado)
- ahorro comprometido (prorrateado por días del periodo)
- margen de seguridad
= dinero seguro para gastar
```

El resultado incluye un **desglose ordenado** (`breakdown`) con etiqueta, monto,
dirección y certeza de cada factor — así la UI siempre puede responder *"¿Cómo lo
calculamos?"* (explicabilidad, §85). El periodo va hasta el próximo ingreso esperado.

## Clima Financiero (`weather.ts`)

Deriva un estado (`calm`/`stable`/`tight`/`attention`/`stormy`) a partir del headroom
diario relativo al ingreso mensual y la presión de pagos próximos. Devuelve razones
en tono positivo o de atención — **nunca alarmista**.

## Metas (`goals.ts`)

`projectGoal` calcula progreso, restante y ETA al ritmo actual. `projectWithExtra` +
`daysSooner` alimentan el escenario "si agregas S/ X al mes, llegas N días antes".

## ¿Puedo comprarlo? (`purchase.ts`)

Simula el impacto: `antes → después`, si compromete obligaciones, y el retraso
estimado de la meta prioritaria. Veredicto `compatible` / `tight` / `compromises`.
El copy nunca dice "compra" o "no compres" — solo describe compatibilidad.

## Certeza de datos (§40)

Cada monto lleva su certeza: `real` (confirmado), `scheduled` (programado),
`estimated` (estimado), `ai`. La UI nunca mezcla una predicción con un dato real.

## Sin IA también funciona (§69)

Todo lo anterior corre sin red ni proveedor de IA. La IA mejora AlcancIA; no la
sostiene.
