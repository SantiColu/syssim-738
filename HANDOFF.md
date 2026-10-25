# HANDOFF — Fire Protection (FCOM cap. 8)

Checkpoints del trabajo sobre el sistema de protección contra incendios. Si la
sesión se corta, retomar desde el último checkpoint.

## Alcance acordado con el usuario

- Avión simulado: **-800 del bloque YW001–YW164** (Ryanair FCOM). Implica:
  - Cargo fire con **1 botella** (YC496–YW164; la de 2 botellas + timer 60 min es YA573 = EI-SEV, el único -700).
  - **Start levers con luz roja** de fuego (YF685–YF695, YW001–YW164).
  - Lavatorio **KIDDE** (reset automático, sin indicación en cabina).
- Fire switch: hacer lo que dice el FCOM y el avión real (cerrar fuel/spar/hyd/bleed,
  disparar generador, inhibir reverser, armar squibs; APU: fuel, bleed, inlet door, gen).
  Lo que no está modelado (eléctrico, hidráulico, reversers) queda como estado interno.
- APU Ground Control Panel (FCOM 8.10.8, pdf p. 1360): en la vista SYSTEM, sobre el
  MLG well, **oculto hasta que se abre** (integrado de forma creativa).
- Ubicación de botellas: buscar fuente del -800 y guardar PDF en `docs/`.
- Sin audio: campana/bocina representadas visualmente.
- No commitear ni pushear. Builds de Next: mínimos y nunca dos a la vez.

## Decisiones tomadas sin consultar (para revisión)

- **Flota**: el único -700 del FCOM es EI-SEV (tab YA573, FCOM 0.1 y 1.40.34). Todo lo demás
  (YC496–YW164) es -800. Para un único avión coherente se tomó el bloque YW (start levers con luz,
  lavatorio KIDDE, 1 botella de cargo).
- **Estado aire/tierra**: el simulador no lo tiene; se asume **en tierra** (la bocina de fuego de APU
  en el pozo del tren suena "on the ground only").
- **AC power**: se asume disponible (la luz WHEEL WELL en el test OVHT/FIRE requiere AC).
- **Extinción**: el FCOM no dice que el agente apague el fuego. Decisión del simulador: al descargar
  una botella en un recinto, el fuego de ese recinto se apaga (los detectores vuelven a normal). Se
  puede reinyectar para simular reignición (y las luces de cargo pueden re-iluminarse, FCOM 8.20.6).
- **EXT TEST 1/2**: posición 1 prueba el squib 1 de cada botella de motor (el que va al ENG 1) +
  squib de APU; posición 2 el squib 2 (ENG 2) + APU (Ferreira ATA26: squib 1 = ENG 1, squib 2 = ENG 2).
  Un squib disparado pierde continuidad y su luz verde ya no enciende.
- **Rotación de la manija**: L dispara la botella izquierda, R la derecha, hacia el motor de esa
  manija (FCOM 8.20.3; Ferreira: ENG 1 clockwise → R bottle).
- **Test OVHT/FIRE con un lazo fallado**: no ilumina las indicaciones de ese motor (FCOM NP.21: "If an
  engine fire warning switch and an ENG OVERHEAT light do not illuminate, a detection loop is inoperative").
- **Cargo**: lazo A = DC bus 1, lazo B = DC bus 2 (el FCOM sólo dice "DC bus 1 and DC bus 2"). Fila
  superior de detectores del esquema 8.20.7 = lazo A, inferior = lazo B. DISCH dispara el squib de
  cada compartimiento armado (si se arman los dos, la botella descarga a ambos).
- **Demoras de descarga**: botellas de motor/APU 2.5 s ("a few seconds"); cargo 6 s ("up to 30 s").
- **Retardo de 4 s al soltar el TEST de cargo** ("may occur"): no implementado.
- **HORN CUTOUT** silencia campana y bocina y deja fija la luz de APU; FIRE WARN/BELL CUTOUT apagan
  FIRE WARN, campana y bocina.
- **Lavatorios**: A (proa izq.), D y E (popa izq./der.) según FCOM 1.40.35 (p. 1095). El extintor
  térmico apaga el fuego (decisión del simulador); un segundo fuego con el extintor vacío sigue.
- **Arquitectura**: `FireProvider` va por ENCIMA de `PneumaticProvider` (el neumático lee las manijas
  para cerrar bleed valves y apagar motor/APU). El apagado de motor/APU se hace con el patrón
  "ajustar estado durante el render" (como MasterCautionProvider), no con efectos.

- **Capa SYSTEM (rutas no documentadas, elegidas plausibles)**: tubería de botellas de motor desde el
  pozo izquierdo por el costado del fuselaje, borde de ataque y pylon (ENG 2 cruza el pozo); tubería
  de cargo a la bodega de popa por la pared derecha; detectores y toberas de cargo en una franja del
  techo a la derecha; botella de APU a estribor y firewall en STA 1156; válvula de combustible de APU
  en el firewall a la izquierda; spar/engine fuel/hyd valves en posiciones aproximadas.
- **Válvulas de combustible en la vista**: el estado de cortes de combustible no existe sin start
  levers operables; se dibujan abiertas sólo con el motor andando y la manija adentro (la start lever
  en CUTOFF también las cierra en el avión real). La hidráulica sigue sólo a la manija. La de APU y la
  inlet door, abiertas sólo con APU andando y sin corte.
- **Atajos de "fuego en el recinto"** (llamitas en motores, APU, wheel well y bodegas): no son
  componentes, son un atajo para inyectar la falla.
- **Agente extintor** dibujado en violeta (acento de la paleta), fuera de las escalas de temp/presión.
- **Fire switch**: click para tirar (si está trabada tiembla y pulsa el OVRD), botones L/R para rotar
  (vuelve al centro a ~1 s), click de nuevo para empujarla.
- **BOTTLE DISCHARGE del P28**: el alambre de seguridad se rompe en el primer uso.
- **Lavatorio**: el extintor térmico actúa 3 s después de iniciado el fuego.
- **Botones ENG/APU del header**: con combustible cortado, el tooltip explica por qué no arrancan.

## Pendientes / ideas

- A zoom 100% la capa FIRE se ve tenue frente a PNEUMATIC (líneas finas); se lee bien al hacer zoom.
- `AircraftPushButton` tiene un tooltip fijo: BELL CUTOUT y cargo TEST muestran un hover genérico.
- Warning de hidratación preexistente en `PolarLabel` (no relacionado).

## Checkpoints

- [x] 1. Lógica `src/app/simulation/fire/fire-protection.ts` + tests (reducer puro)
- [x] 2. `fire-context.tsx` + integración con neumático (bleed valves, motor/APU) y master caution (OVHT/DET, FIRE WARN)
- [x] 3. Tab FIRE (`system-tab-context.tsx`)
- [x] 4. Paneles de cockpit: `panels/fire-protection-panel.tsx`, `cargo-fire-panel.tsx`,
  `engine-start-levers.tsx`, `apu-ground-control-panel.tsx` (+ slots en `cockpit-view.tsx`, CSS en
  `cockpit-panels.css`, FIRE_HANDLES estáticos quitados del artwork). Decisiones: el alambre de
  seguridad del BOTTLE DISCHARGE se rompe al primer uso; start levers fijas en IDLE en su propia placa.
- [x] 5. Capa SYSTEM: `components/fire-protection-layer.tsx` (sub-capa bajo PNEUMATIC/ECS + capa
  superior), integrada en `pneumatic-schematic.tsx` con su leyenda (la barra de leyenda ahora se
  desplaza con la rueda). `lower-lobe-layer.tsx` exporta `stationToY` y límites de recintos.
- [x] 6. APU Ground Control Panel: escotilla "P28" en el pozo derecho (su luz destella aunque esté
  cerrado) → popover que sigue el pan/zoom; se cierra con × o Esc.
- [x] 7. Fuentes externas -800 en `docs/fire-sources/` (ver `NOTAS-investigacion.md`)
- [x] 8. Verificación: 103 tests, lint, tsc y **un** `pnpm build` OK; prueba E2E en navegador (fuego
  motor 1 → FIRE WARN + manija iluminada → pull: motor 1 se apaga y su bleed se cierra → rotar L:
  botella L descarga, L BOTTLE DISCHARGE, fuego apagado).

## Herramientas de verificación (scratchpad de la sesión, se pierde al cerrar)

- Dev server compartido en el puerto 3123 (`pnpm dev --port 3123`).
- `node <scratchpad>/tools/shot.mjs out.png '<json steps>'`: captura con Playwright + Chrome.
