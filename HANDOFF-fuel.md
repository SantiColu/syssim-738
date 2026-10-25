# HANDOFF — Fuel (FCOM cap. 12)

Checkpoints del trabajo sobre el sistema de combustible. Si la sesión se corta, retomar desde el
último checkpoint. El `HANDOFF.md` de fire queda como está.

## Alcance

- Seguir la línea de FIRE: reducer puro + contexto, paneles de cockpit, capa SYSTEM con su tab y
  leyenda, fuentes y resumen de estudio en `docs/fuel-sources/`.
- Fuente principal: FCOM Ryanair rev. 30, cap. 12 (págs. PDF 1849–1866) + 7.20.7 (Engine Fuel
  System), 7.30.1 (APU Fuel Supply), L.10.9 (limitaciones), NP.21 y SP.12. Pre-investigación del
  usuario en `../combustible/` (tanques, capacidades, ubicación de equipos y diagrama en planta, que
  usa el mismo marco de coordenadas que la vista SYSTEM).
- Avión: el mismo -800 del bloque YW. Donde el FCOM distingue sub-flotas de combustible se toma
  **YW064–YW164** (indicación de cantidad digital con TOTAL, que es además lo que muestra
  `docs/Cockpit.jpg`) y NGS instalado (YK885–YW164).
- No commitear ni pushear. Builds de Next: como mucho uno al final, nunca dos a la vez.

## Decisiones tomadas sin consultar (para revisión)

- **El sistema de combustible es dueño del estado "andando" de motores y APU.**
  - `PneumaticProvider` lo lee de `useFuel()`.
  - Los botones ENG 1/2 y APU de SYSTEM hacen la secuencia de arranque (start lever a IDLE) o de
    corte (CUTOFF), y no arrancan si el combustible está cortado. El motivo va en el tooltip.
  - Se sacó de `pneumatic-context` el corte por fire switch: ahora lo hace el reducer de fuel.
- **Start levers del cockpit operables.** CUTOFF apaga el motor; IDLE abre la spar valve pero no
  arranca un motor detenido (la ENG VALVE CLOSED queda brillante, como en SP.12).
- **Estado inicial "listo para rodar"**: los dos motores andando, las 6 bombas en ON, principales
  llenos y 3000 kg en el central (L.10.9).
- **Valores que no da el FCOM** (fuentes en el resumen):
  - consumo en ralentí 0,113 kg/s (ICAO databank, CFM56-7B26);
  - APU ~160 kg/h y scavenge ~200 kg/h (b737.org.uk);
  - inicio del scavenge con el tanque 1 en 1990 kg, corte automático de las bombas del central a
    los 15 s y transferencia de 9071 kg/h por bomba (JCT-0151);
  - recorrido de las válvulas con motor de CC: 2 s (elección propia).
- **Recall de MASTER CAUTION.** Una sola LOW PRESSURE de un principal enciende MASTER CAUTION solo
  con recall (`recallOnly` y `updateAcknowledged` en `master-caution.ts`, con su test).
- **Plan view.**
  - Se extrajeron `plan-view-glyphs.tsx` (válvula, labels, `controlProps`…) y
    `plan-view-popover.tsx` (popover anclado) de la capa FIRE, para compartirlos con FUEL. El
    popover del P28 los usa.
  - Las válvulas de combustible de FIRE (spar, engine y APU fuel shutoff) usan la geometría de la
    capa FUEL. Con FUEL activa las dibuja solo FUEL.
  - La APU fuel shutoff pasó de la cola al larguero trasero de la sección central, con acceso por el
    pozo izquierdo (JCT, en `../combustible/investigacion/03`).
- **Controles extra en SYSTEM, solo en la vista FUEL**:
  - FUEL TRUCK (manguera presurizada en el receptáculo);
  - FUEL ×1/10/60 (acelera los caudales; los timers de válvulas y bombas no se escalan).
- **Interacción.**
  - La puerta del panel de carga está abierta mientras su popover está abierto, y eso energiza el
    P15.
  - La cantidad de cada tanque se ajusta con − / + como si fuera una falla inyectada.
- **NGS siempre apagado** (el avión está en tierra). Solo se elige la luz del indicador.

## Pendientes / ideas

- **No simulado:**
  - buses eléctricos (todo alimentado);
  - parpadeo de LOW PRESSURE por actitud;
  - defueling a presión (succión del camión);
  - override manual de las fueling valves;
  - tiempo de recorrido de la engine fuel shutoff valve.

## Revisión posterior (segunda sesión)

- **Hydration mismatch.** Se redondean a 0,01 las coordenadas trigonométricas de los relojes
  (`gaugeCoord` en `panel-parts.tsx`), incluidos los de temperatura y cabina, que ya existían.
- **Leyenda.** COLOR, AIR SOURCE y los accesorios neumáticos solo aparecen con PNEUMATIC o ECS. Con
  FIRE o FUEL solas se agrega una única entrada SHUTOFF.
- **Popover del NGS.** Título más corto e indicador de 250 px de ancho.
- **Animaciones de flujo.**
  - El manifold se modela como una línea (spar 1 → crossfeed → spar 2) con fuentes y consumos. El
    sentido de cada tramo sale del caudal neto (`manifoldSegmentFlows`).
  - El motor va spar → filtro → engine valve → inyectores, sin tramos superpuestos.
  - El header de carga sale del receptáculo hacia cada válvula abierta.
- **Scavenge jet pump.**
  - Tobera en el extremo interior, alimentada por la descarga de la FWD 1.
  - Succión del central por el costado y descarga por el difusor al tanque 1.
  - Se detiene con el tanque 1 lleno, para no perder combustible (test agregado).

- **NGS en la red neumática.**
  - Se movió de la columna esquemática (a popa del pozo del tren) a la bahía de packs izquierda,
    en el mismo punto que la capa FUEL (369, 245).
  - Toma aire del ducto izquierdo (junction 351, 253) a través de una `ngsShutoffValve`, cerrada
    porque el NGS se apaga en tierra (FCOM 12.20.1). El NGS queda sin presión.
  - Snapshot actualizado. Se compararon los estados de todos los nodos en los 19 escenarios y solo
    cambian los del NGS; los ids de los links se renumeraron.
- **Transición entre capas, como los packs con ECS.**
  - Con FUEL, la red oculta el bloque NGS y su último tramo. FUEL dibuja el módulo y, con PNEUMATIC,
    el ducto desde la válvula (bajo la red y coloreado como ella).
  - Con ECS, la red oculta el bloque y la válvula del NGS: los packs llenan la bahía.
  - `hiddenNodes` ahora también oculta válvulas.

## Checkpoints

- [x] 1. Fuentes en `docs/fuel-sources/` (extractos FCOM, databank EASA)
- [x] 2. Lógica `src/app/simulation/fuel/fuel-system.ts` + tests (reducer puro)
- [x] 3. `fuel-context.tsx` + integración: motores/APU (dueño del estado "andando"), fire (fire switch
  cierra spar/engine valves y APU SOV), master caution (FUEL), header ENG/APU
- [x] 4. Paneles de cockpit: panel FUEL (overhead), cantidad en el upper DU, start levers operables,
  panel de carga P15 y luces del NGS (popovers en SYSTEM)
- [x] 5. Capa SYSTEM FUEL + tab + leyenda; reconciliar las válvulas de combustible de la capa FIRE
- [x] 6. Resumen de estudio `docs/fuel-sources/RESUMEN-sistema-fuel.md` y README
- [x] 7. Verificación: tests, lint, tsc, **un** build y prueba E2E en navegador
