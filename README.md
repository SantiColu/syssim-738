# syssim-738

Simulador interactivo de los sistemas del **Boeing 737-800 NG** (CFM56-7B), pensado para estudiar cómo responden los sistemas del avión a los controles del overhead panel.

La aplicación muestra dos vistas sincronizadas:

- **Cockpit:** el overhead panel con sus controles operables (switches, selectores, perillas e indicadores luminosos). Admite pan, zoom, pinch y navegación por minimapa.
- **System:** el esquema del avión en planta, por capas que se superponen desde las pestañas PNEUMATIC, ECS, FIRE y FUEL. La red neumática se colorea por temperatura o por presión según el estado de las fuentes y válvulas.

El comportamiento se basa en el FCOM del 737 NG. Las referencias están en [docs/fcom/](docs/fcom/README.md).

## Sistemas simulados

| Sistema | Qué incluye |
| :--- | :--- |
| **Bleed air** | Etapas 5.ª y 9.ª del compresor, PRSOV, precoolers con fan air, APU bleed, conexión de aire de tierra, isolation valve (CLOSE / AUTO / OPEN), check valves, DUAL BLEED, BLEED TRIP OFF |
| **Air conditioning** | Pack valves, recirculation fans, panel de temperatura, equipment cooling |
| **Presurización** | Panel de altitud de cabina y panel de control de presurización |
| **Anti-ice** | Wing y engine (cowl) anti-ice, sensores de sobrecalentamiento, WING-BODY OVERHEAT |
| **Rain** | Window heat (incl. tests OVHT / PWR TEST), probe heat, limpiaparabrisas |
| **Fire protection** | Detección de overheat/fire de motores (doble lazo, OVHT DET), APU y wheel well; humo en bodegas (doble lazo, DET SELECT); botellas de motor, APU y cargo con squibs; fire switches (corte de combustible, bleed, hidráulico); tests FAULT/INOP, OVHT/FIRE, EXT y cargo; FIRE WARN / BELL CUTOUT; APU ground control panel; lavatorios |
| **Fuel** | Tanques 1, central y 2 con su cantidad; seis bombas de CA (las del central con más presión y corte automático), succión, crossfeed, spar y engine fuel shutoff valves (start levers y fire switches), filtros, scavenge jet pump y alimentación del APU; panel FUEL con LOW PRESSURE, VALVE CLOSED y FILTER BYPASS; cantidad en el upper DU con alertas LOW, CONFIG e IMBAL; MASTER CAUTION FUEL; estación de carga (panel P15, camión, transferencia en tierra con la defueling valve); indicador del NGS |

## Puesta en marcha

Requiere Node.js 20+ y [pnpm](https://pnpm.io) (`corepack enable` lo activa).

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

| Script | Descripción |
| :--- | :--- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Build de producción y servidor |
| `pnpm lint` | ESLint |
| `pnpm test` | Tests (Vitest) |
| `pnpm test:watch` | Tests en modo watch |

## Estructura

```
src/app/
├── page.tsx                      # Layout: vistas System + Cockpit
├── cockpit-panels.css            # Único CSS plano: instrumentación del cockpit
├── components/
│   ├── cockpit-view.tsx          # Lienzo del cockpit y ubicación de los paneles
│   ├── cockpit/                  # Artwork del overhead y hook de pan/zoom
│   ├── panels/                   # Un módulo por panel + piezas comunes (switches, knobs…)
│   ├── aircraft-panels.tsx       # Re-exporta los paneles
│   ├── pneumatic-network-layer.tsx  # Render de la red neumática
│   └── …                         # Capas del esquema (sensores, sondas, ventanas, wipers)
├── simulation/fire/              # Protección contra incendios: reducer puro + contexto
├── simulation/fuel/              # Combustible: reducer puro + contexto (dueño de motores/APU andando)
└── simulation/pneumatic/
    ├── main-network.ts           # Definición de la red: dibujo + nombres + semántica
    ├── migrate-legacy-network.ts # Construye y valida el grafo a partir del dibujo
    ├── solve-network.ts          # Solver: propaga presión y temperatura
    ├── runtime-state.ts          # Switches y fuentes → estado de válvulas y fuentes
    └── pneumatic-context.tsx     # Estado React y lógica de cockpit (alertas, tests)
```

## La red neumática

La red se define en [main-network.ts](src/app/simulation/pneumatic/main-network.ts) en dos capas:

1. **El dibujo:** líneas de puntos en coordenadas del esquema, con los accesorios (válvulas, precoolers…) marcados sobre ellas. De ahí se obtienen los nodos y los links.
2. **La semántica:** en `NODE_POINTS` se da un nombre estable (`eng1BleedValve`, `leftManifold`…) a cada nodo que use la simulación. Además se declara:
   - por dónde entra el flujo a cada check valve y a cada precooler,
   - qué fuentes son las fuentes de aire,
   - dónde se mezclan las etapas 5.ª y 9.ª.

El resto de la app usa los nodos a través de `PNEUMATIC_NODE.<nombre>` y nunca con IDs literales. El solver no lee coordenadas.

Si mueves un punto en el dibujo, actualiza su coordenada en `NODE_POINTS`. Si un nombre deja de caer sobre un nodo, la red falla al construirse con un error que dice cuál.

## Tests

Los tests de [src/app/simulation/pneumatic/](src/app/simulation/pneumatic/) son de dos tipos:

- **`solve-network.test.ts`:** reglas de comportamiento legibles (isolation valve en AUTO, check valves, mezcla de etapas, precooler…).
- **`solve-network.snapshot.test.ts`:** guarda el estado de **cada** nodo y link de la red en una serie de escenarios. Cualquier cambio en la solución aparece como diff. Tras un cambio intencionado en la red o el solver, revisa el diff y actualiza con `pnpm test -u`.

## Estilos

Tailwind CSS para todo, salvo la instrumentación del cockpit, que usa [cockpit-panels.css](src/app/cockpit-panels.css). Las reglas detalladas están en [AGENTS.md](AGENTS.md).
