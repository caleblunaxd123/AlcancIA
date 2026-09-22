# AlcancIA — IA

La IA **interpreta y explica**; nunca calcula ni decide. El motor determinístico
es la única fuente de números (§38/§42).

```
Motor (mobile)  →  contexto mínimo JSON  →  Backend  →  IAiProvider  →  contrato JSON  →  App
```

## Backend (.NET 9)

`backend/` — Clean Architecture pragmática:

- **Domain** — `AiResponse` (contrato), `FinancialContext`, enums.
- **Application** — `IAiProvider`, `AiOptions`, `PromptBuilder`, `AiResponseParser`,
  `FinancialContextBuilder`, `DeterministicResponder`, `ChatService`.
- **Infrastructure** — `GeminiAiProvider`, `LocalAiProvider`, DI/selección.
- **Api** — minimal API: `POST /api/ai/chat`, `GET /health`, OpenAPI, rate limiting, CORS.

29 tests (xUnit) cubren parser, injection, context builder, responder, fallback y
el endpoint (integración con `WebApplicationFactory`).

## Provider abstraction (§41)

`IAiProvider` es intercambiable. Se selecciona por configuración; el modelo **nunca**
está hardcodeado:

```env
Ai__Enabled=true
Ai__Provider=gemini
Ai__Model=gemini-2.0-flash   # ejemplo — se cambia sin tocar código
Ai__ApiKey=...
```

Sin `ApiKey`/`Model`, se usa `LocalAiProvider` (determinístico). Cambiar de modelo o
proveedor es solo configuración.

## Contrato de respuesta (§68)

```json
{
  "summary": "string",
  "impactLevel": "low|medium|high",
  "facts": ["string"],
  "recommendations": ["string"],
  "calculationIds": ["string"]
}
```

`AiResponseParser` valida esto; tolera fences markdown y prosa alrededor. Cualquier
desvío → `null` → respuesta determinística.

## Fallback y disponibilidad (§69)

`ChatService` siempre entrega una respuesta válida:
1. Sin modelo → responder determinístico (`source: "local"`).
2. Modelo cae / responde fuera de contrato / timeout → fallback (`source: "fallback"`,
   `usedFallback: true`).

La app además tiene su propio fallback on-device si el backend es inalcanzable.

## Seguridad de prompt (§66/§67)

`PromptBuilder` trata **todo** el contenido del usuario (pregunta, comercios,
descripciones) como DATOS dentro de un bloque delimitado; el system prompt ordena
ignorar instrucciones que aparezcan ahí. `Sanitize` elimina el centinela del fence,
neutraliza caracteres de control y acota la longitud. Tests verifican que una
inyección no puede forjar el delimitador ni cambiar las reglas.

## Ejecutar el backend

```bash
cd backend
dotnet run --project AlcancIA.Api --urls http://localhost:5080
# Emulador Android: adb reverse tcp:5080 tcp:5080
```

La app apunta a `http://127.0.0.1:5080` (configurable con `EXPO_PUBLIC_API_URL`).
