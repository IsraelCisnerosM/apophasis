# Guía de pruebas y demo (ES)

Documento vivo para devs que quieran **probar a mano** todo lo que
Apophasis tiene hoy: las herramientas que Lucy puede llamar, los flujos
de UI generativa, y las suites automatizadas. Crece junto al producto:
cuando agregamos un buscador o ajustamos un comportamiento, anotamos
aquí qué hay que decir / hacer para gatillarlo.

> Demo en vivo: https://lucy-blob-nvfgf6doka-uc.a.run.app/
> Documentación general (instalación, scripts, arquitectura): [README.md](../README.md)

---

## Tabla de contenidos

1. [Antes de probar](#antes-de-probar)
2. [Tres formas de probar](#tres-formas-de-probar)
3. [Probar la UI generativa sin LLM](#1-probar-la-ui-generativa-sin-llm)
4. [Probar hablando con Lucy](#2-probar-hablando-con-lucy)
5. [Catálogo de herramientas y frases gatillo](#catálogo-de-herramientas-y-frases-gatillo)
6. [Suites automatizadas](#3-suites-automatizadas)
7. [Cosas a observar (señales de salud)](#cosas-a-observar-señales-de-salud)
8. [Cómo extender esta guía](#cómo-extender-esta-guía)

---

## Antes de probar

Mínimo para que el demo arranque:

```bash
bun install
cp .env.example .env.local
# Llena al menos GEMINI_API_KEY y VITE_GEMINI_API_KEY
bun run dev:all   # Vite (5173) + Bun proxy (8787)
```

Abre http://localhost:5173, dale permiso al micrófono y listo.

| Variable | ¿Qué desbloquea? |
|----------|------------------|
| `GEMINI_API_KEY` + `VITE_GEMINI_API_KEY` | Conversación con Lucy. Sin esto, nada |
| `BRAVE_API_KEY` | Lane Brave en `search_web` y todas las búsquedas de imágenes para `search_products` |
| `TAVILY_API_KEY` | Lane Tavily en `search_web` (resumen sintetizado) |
| `EXA_API_KEY` | Lane Exa en `search_web` (semántica/neural) |
| `SERPAPI_KEY` | `search_books` (fallback), `search_places` |
| `GOOGLE_BOOKS_API_KEY` | `search_books` (backend principal) |
| `GOOGLE_PLACES_API_KEY` | `search_places_google`, `search_places_nearby`, `place_details` |
| `YOUTUBE_API_KEY` | `search_video` |

Las claves opcionales **degradan suavemente**: si falta una, la
herramienta correspondiente devuelve un `[]` o un error claro y los
tests la saltan con mensaje. La app sigue corriendo.

---

## Tres formas de probar

| Vía | Para qué sirve | Cuándo usarla |
|-----|----------------|---------------|
| **UI sin LLM** (botón Test + presets) | Validar que A2UI renderiza y que el dispatcher de submit funciona | Editaste el catálogo A2UI o un renderer; no quieres gastar Gemini |
| **Conversación con Lucy** | End-to-end real: voz → Gemini → tool → UI → voz | Estás probando una herramienta nueva o el prompt; quieres "sentir" la experiencia |
| **Suites automatizadas** (`test`, `test:tools`, `validate:ui`) | Detectar regresiones objetivas en código, contratos y prompt | Antes de mergear, en CI, después de tocar el prompt o un provider |

---

## 1. Probar la UI generativa sin LLM

Útil cuando quieres iterar rápido sobre A2UI sin levantar la sesión de
Gemini ni gastar cuota.

1. Arranca `bun run dev:all` y abre la app.
2. Sin haber hablado con Lucy todavía, en la barra de **Controls**:
   - Botón **Test** (`controls.testTooltip` = "Renderiza un panel A2UI
     de prueba (sin LLM)") → renderiza un panel demo desde
     `src/a2ui/demoSurface.ts`. Confirma que se ven los componentes
     básicos (Text, Slider, ChoicePicker, Button).
   - Selector de **preset** con cuatro variantes:
     - `preset.basic` — Formulario básico (un par de inputs).
     - `preset.music` — Búsqueda de música (mood + instrumento + época + botón).
     - `preset.gallery` — Todos los primitivos juntos en una sola superficie.
     - `preset.mood` — Onda + chips multi-select.
3. Llena los campos, **presiona el botón de submit** del panel.
4. Verifica en la **ConversationSidebar** (panel derecho) que aparece
   un evento `event.submit` con el `dataModel` que enviaste.

### Qué buscar
- Cada preset debe rendear sin warnings en la consola del browser.
- Slider, ChoicePicker (mutuallyExclusive), CheckBox, TextField
  (`shortText`/`longText`/`number`/`obscured`), Text (h1..h5, body,
  caption) y Button **deben verse correctos** y reflejar el `dataModel`.
- Submit dispara una entrada en la sidebar y un toast.
- El botón **Close surface** (`surface.close`) tira el panel sin
  romper el resto de la app.

### Si algo se ve mal
- Etiqueta de botón duplicada → revisa que el `id` del Text de la
  etiqueta NO esté listado en los `children` del Column padre (es
  propiedad del Button). Está documentado en el system prompt.
- Markdown en bruto (`###`, `**`) dentro de un Text → el modelo o el
  preset están metiéndolo; usa `variant` (`h1`..`h5`) en vez.

---

## 2. Probar hablando con Lucy

Esta es la prueba "real". Lucy sigue dos reglas duras:

1. **Cada turno llama exactamente una herramienta.** Si la voz suena
   pero no ves un panel ni un resultado, algo se rompió.
2. La **primera vez** que describes algo que buscas, Lucy debe abrir
   `render_surface` ANTES de hablar.

### Setup mínimo de la sesión

1. Arranca `bun run dev:all`.
2. Click en el botón del micrófono (`controls.talk`).
3. Permite el micrófono.
4. (Opcional) Cambia voz en `VoiceSelector` (Aoede, Puck, Kore, etc.) o
   idioma EN/ES con el toggle (`controls.langTooltip`).

### Qué inspeccionar mientras hablas

- **Phase chip** (top-left): `IDLE` → `LISTENING` → `THINKING` →
  `ASKING` o `RESULT`. Si se queda atorada en `THINKING`, hay un
  toolCall que nunca recibió respuesta.
- **Conversation Sidebar** (panel derecho): muestra `event.user_speech`,
  `event.lucy_speech`, `event.render`, `event.update`, `event.submit`,
  `event.search`, `event.result`. Esta es tu fuente de verdad.
- **Transcript** (arriba): subtítulos en vivo de tú y Lucy.
- **SurfacePanel**: el panel A2UI que Lucy renderiza.
- **ResultGallery**: las tarjetas de resultados (música, video, libros,
  lugares, productos, web).
- **Console del browser**: logs `[lucy] toolCall`, `[lucy] msg`,
  `[lucy] turnComplete` — útiles cuando algo se atora.
- **Logs del Bun proxy** (terminal): cada `/api/search/*` loguea
  `query`, `provider`, `cache hit/miss`.

---

## Catálogo de herramientas y frases gatillo

Cada herramienta es un archivo en `src/lib/search/providers/` declarado
en `src/lib/search/registry.ts`. Aquí hay frases que **funcionan
cuando el prompt actual está bien** — si una deja de gatillarla, hay
una pista del sistema (prompt, declaration, ruteo) que se rompió.

> Para probar en EN sólo cambia el idioma con el toggle. La app es
> bilingüe (es-US ↔ en-US) y el system prompt cambia con ella.

### `search_music` — iTunes Search
**Browser-direct, sin clave.** Siempre disponible.

Frases ES:
- "Ando buscando una canción que medio recuerdo, melancólica con saxofón, finales de los 90."
- "Encuéntrame algo de Daft Punk."
- "Hay una canción que dice algo como 'never gonna give you up', ¿cuál es?"

Frases EN:
- "I'm trying to find a song I half-remember, something melancholy with a sax, late 90s."
- "Find me something by Daft Punk."

**Qué debe pasar:** Lucy abre un panel con sliders/choicepicker de
mood / instrumento / época, y al enviar dispara `search_music`. La
galería muestra carátulas con un preview de audio reproducible.

**Validación rápida:** al menos 1 de los 3 primeros resultados tiene
un `preview` con `kind: 'audio'`.

---

### `search_video` — YouTube Data API v3
Requiere `YOUTUBE_API_KEY`.

Frases ES:
- "Pásame el videoclip de 'Smells Like Teen Spirit'."
- "Busca tutoriales en YouTube de cómo hacer pan masa madre."
- "¿Hay videos de la conferencia de Rich Hickey 'Simple Made Easy'?"

Frases EN:
- "Show me the music video for 'Smells Like Teen Spirit'."
- "Find YouTube tutorials on sourdough bread."

**Qué debe pasar:** las tarjetas tienen miniaturas, y el `externalUrl`
es del tipo `youtube.com/watch?v=...`.

---

### `search_books` — Google Books (con fallback a SerpApi)
Requiere `GOOGLE_BOOKS_API_KEY`. Si falla, cae a `SERPAPI_KEY` con
`engine=google&udm=36`.

Frases ES:
- "Recomiéndame libros de filosofía sobre la nada."
- "Busca el libro 'Cien años de soledad'."
- "¿Qué ha escrito Yuval Noah Harari?"
- "Busca el ISBN 9780143127550."

Frases EN:
- "Recommend books about silence in philosophy."
- "Find books by Yuval Noah Harari."

**Qué debe pasar:** título + subtítulo (autor) + portada cuando
existe. El top result tiene una `description` o un `subtitle` que Lucy
pueda leer en voz alta.

**Para probar el fallback:** quita temporalmente `GOOGLE_BOOKS_API_KEY`
del `.env.local`, reinicia el server, repite la búsqueda. Debería
seguir devolviendo resultados (vía SerpApi) y la tarjeta puede verse
algo más austera (sin portada dedicada).

---

### `search_places` — Google Maps vía SerpApi
Requiere `SERPAPI_KEY`. Es el path "tradicional" para lugares.

Frases ES:
- "¿Dónde está el mejor ramen en CDMX?"
- "Busca cafés con buen wifi en Roma Norte."
- "Estudios de tatuajes en Brooklyn."

Frases EN:
- "Best ramen in Mexico City."
- "Cafés with good wifi in Roma Norte."

**Qué debe pasar:** Lucy debe pasar `location` con la ciudad/zona si
la mencionaste — eso afina mucho. Las tarjetas muestran rating,
dirección y un thumbnail de Maps. La dirección del primer resultado
debería **mencionar la ciudad** que pediste.

---

### `search_places_google` — Google Places API (New) Text Search
Requiere `GOOGLE_PLACES_API_KEY`. Mismos datos que `search_places`,
pedidos directo a Google. Lucy lo prefiere cuando va a encadenar
`place_details` después.

Frases ES:
- "Busca restaurantes japoneses en Polanco."
- "Encuentra librerías independientes en Coyoacán."

Frases EN:
- "Find Japanese restaurants in Polanco."

**Qué debe pasar:** mismo aspecto en la galería que `search_places`.
La diferencia se nota cuando le preguntas algo más sobre un resultado
puntual (ver `place_details`).

---

### `search_places_nearby` — Google Places API (New) Nearby
Requiere `GOOGLE_PLACES_API_KEY`. Lucy lo llama **solo** con `lat/lng`
explícitos — normalmente como follow-up de un resultado previo, no en
frío.

Cómo gatillarlo a propósito (avanzado):
- Primero: "Busca restaurantes en CDMX" → te da resultados con `place_id`.
- Luego: "Dame restaurantes en un radio de 500 metros de [coordenadas]
  19.4326, -99.1332" — Lucy debería llamar `search_places_nearby` con
  `lat/lng/radius_m`.

Si dices solo "lugares cerca de aquí" sin coordenadas, Lucy debería
caer en `search_places_google` con `location`, no en este.

---

### `place_details` — Google Places API (New) Place Details
Requiere `GOOGLE_PLACES_API_KEY`. Encadena después de un hit de lugares.

Flujo:
1. "Busca pizzerías en Condesa." → galería con resultados.
2. "¿La primera, está abierta ahora?" / "¿Cuál es el teléfono?" /
   "Dame la dirección y el horario."

Lucy debería llamar `place_details` con el `place_id` del primer
resultado y traer teléfono, sitio web, horario actual, nivel de
precios y rating.

---

### `search_products` — Brave Image Search
Requiere `BRAVE_API_KEY`. Devuelve **fotos de productos**, no precios.
Alimenta la animación de morph del blob.

Frases ES:
- "Muéstrame botas impermeables para montaña."
- "Quiero ver lámparas de pie art-decó."
- "Busca un Rolex Submariner."

Frases EN:
- "Show me waterproof hiking boots."
- "I want to see art-deco floor lamps."

**Qué debe pasar:** la galería se llena de imágenes limpias, el blob
empieza a morfar. **Lucy NO debería prometer precios, tiendas ni
ratings** — si lo hace, el system prompt se rompió.

---

### `search_web` — fan-out paralelo Brave + Tavily + Exa
Requiere al menos UNA clave (`BRAVE_API_KEY`, `TAVILY_API_KEY` o
`EXA_API_KEY`). Es el comodín para todo lo que no encaja en un
buscador específico.

Frases ES:
- "¿Quién es Donella Meadows?"
- "¿Qué es la teoría de juegos?"
- "Búscame artículos sobre el colapso de Silicon Valley Bank."

Frases EN:
- "Who is Donella Meadows?"
- "What is game theory?"

**Qué debe pasar:**
- La primera tarjeta puede ser un "Resumen / Summary" sintetizado por
  Tavily (cuando la lane Tavily devuelve `answer`).
- El payload incluye `provenance` con qué lanes corrieron
  (brave/tavily/exa) — útil para confirmar el fan-out.
- Resultados deduplicados por URL e intercalados (Brave primero por
  ser el índice más amplio).

**Cómo probar la degradación:** quita una clave a la vez (p. ej. solo
`TAVILY_API_KEY` puesta) y verifica en el response que `provenance`
solo lista esa lane. La galería sigue funcionando, con menos
diversidad.

---

### Herramientas de UI (no son search)

Lucy también puede llamar herramientas para construir/refinar la UI
sin buscar nada. Estas son **fundamentales** para que sienta
multimodal.

| Tool | Cuándo Lucy debe usarla |
|------|-------------------------|
| `render_surface` | Primera vez que describes algo, o pides "renderiza", "muéstrame un panel", "dame UI" |
| `update_surface` | Cuando ajustas el panel y lo envías → Lucy refina (no reemplaza) |
| `close_surface` | Cuando el panel ya no aporta y pides cerrarlo o avanzar |
| `respond_in_voice` | Saludos, "gracias", "sí/no" — **nunca** cuando acabas de describir algo a buscar |

Frases gatillo explícitas:
- "Renderiza un componente." / "Render me a component."
- "Dame un formulario para llenar."
- "Muéstrame algo." / "Show me something."
- "Cierra el panel." / "Close the surface."

---

### Routing ambiguo (caso especial)

Si dices algo deliberadamente vago como **"Ayúdame a encontrar algo de
los 80"**, Lucy NO debe adivinar el dominio. Debe abrir un
`render_surface` con un `ChoicePicker` listando: música, video, libro,
lugar, producto, web. Cuando elijas, refina o busca.

Si Lucy adivina (p. ej. asume música) sin preguntarte, el system
prompt se rompió.

---

## 3. Suites automatizadas

```bash
bun run test         # Vitest unit tests, jsdom, sin red — rápido
bun run test:tools   # Suite live: llamadas reales a upstreams (~22s, paga)
bun run validate:ui  # Eval headless: el prompt sigue produciendo A2UI bien formado
```

### `bun run test`
Tests unitarios estándar, ambiente jsdom, sin red. Se corre en cada
push y en CI. Si esto falla, regrésate antes de mergear.

### `bun run test:tools`
La suite **end-to-end con tráfico real**. Por cada tool valida:

1. **Registro** — el provider está en `SEARCH_PROVIDERS`.
2. **Contrato de input** — el handler acepta los args que Gemini emite.
3. **Schema válido** — la respuesta real pasa `SearchResultSchema.safeParse`.
4. **Lucy-ready** — el top result tiene título sin HTML crudo, es
   accionable (URL/preview/imagen) y descripción ≤ 500 chars.
5. **Edge cases** — query vacía → `[]`; `max_results` respeta el cap.

Más una aserción específica por tool (ver tabla en
[tests/README.md](../tests/README.md)).

Si te falta una clave, los tests de ese provider se saltan con un
mensaje claro: `skip: missing BRAVE_API_KEY`.

Para ver logs del proxy mientras corre:
```bash
LUCY_TEST_VERBOSE=1 bun run test:tools
```

### `bun run validate:ui`
Eval headless que arranca una sesión real de Gemini Live (en modo
texto) y confirma que el system prompt sigue produciendo superficies
A2UI bien formadas. Es el "test del prompt" — útil cuando editas las
instrucciones EN/ES o agregas/cambias declaraciones de tools.

```bash
bun run validate:ui scripts/validate-ui/scenarios/song-search-en.json
```

Cada escenario es un JSON con turnos del usuario + qué tools se
esperan. Para agregar un escenario nuevo, copia
`scripts/validate-ui/scenarios/song-search-en.json` como template.

---

## Cosas a observar (señales de salud)

Mientras pruebas a mano, estas son las señales **rápidas** de que algo
se torció:

| Síntoma | Causa probable |
|---------|----------------|
| Lucy dice "soy un agente de voz, no puedo renderizar" | El system prompt se rompió o el modelo cambió. Esto está prohibido por regla dura |
| Phase queda en `THINKING` para siempre | Un `toolCall` no recibió respuesta — revisa la consola del browser |
| Galería vacía con búsqueda obvia | Falta la API key del provider o el upstream tiró 401/429 |
| `Resumen/Summary` no aparece en `search_web` | `TAVILY_API_KEY` falta o falló. El response tendrá `provenance` sin `tavily` |
| Lucy promete precios en `search_products` | Prompt roto — esa tool **NO** trae precios |
| Etiqueta del botón duplicada | El `id` del Text de la etiqueta está listado en los `children` del padre además de en el Button |
| Markdown crudo (`###`, `**`) en pantalla | El modelo está metiendo markdown dentro de un `Text` en vez de usar `variant` |
| Lucy adivina dominio en query ambigua de los 80 | Debe abrir un `ChoicePicker` con los seis dominios. Si no, el routing del prompt se rompió |
| Repite verbalmente lo que ya cubre la UI | Regla dura del prompt — no debería pasar |

---

## Cómo extender esta guía

Cuando agregas una herramienta nueva, **agrega aquí**:

1. Una sección bajo **Catálogo de herramientas** con:
   - Nombre del tool y backend.
   - Variables de entorno requeridas.
   - 3-4 frases gatillo en ES + 1-2 en EN.
   - "Qué debe pasar" — la señal visual o de datos que confirma que
     funcionó.
2. Si el tool tiene un comportamiento "raro" (encadenarse con otro,
   solo dispararse con coordenadas, etc.), una nota explícita como
   tiene `search_places_nearby`.
3. Si introduce un nuevo modo de fallo, una fila en **Cosas a
   observar**.

Cuando ajustamos comportamiento del prompt, revisa que los ejemplos
de frases gatillo siguen funcionando en local antes de mergear — esta
guía vale solo si refleja el sistema actual.

---

## Referencias rápidas

- [README.md](../README.md) — instalación, scripts, arquitectura.
- [tests/README.md](../tests/README.md) — cómo agregar tests `test:tools`.
- [infra/README.md](../infra/README.md) — deploy a Cloud Run.
- [.env.example](../.env.example) — todas las variables documentadas.
- [src/gemini/liveSession.ts](../src/gemini/liveSession.ts) — system prompts EN + ES (la fuente de verdad de qué entiende Lucy).
- [src/lib/search/registry.ts](../src/lib/search/registry.ts) — qué providers están activos hoy.
