# Boeing 737-800 Flight Crew Operations Manual (FCOM) - Referencias Técnicas

Esta carpeta contiene la documentación oficial del manual de operaciones de la tripulación de vuelo (FCOM) del Boeing 737 NG (-700 / -800), utilizada como especificación técnica y de ingeniería para la simulación de sistemas en **syssim-738**.

---

## 📁 Archivos Disponibles

| Archivo | Contenido | Páginas | Tamaño | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| [`ryanair-737-700-800-fcom-rev-30.pdf`](ryanair-737-700-800-fcom-rev-30.pdf) | **FCOM Completo (Rev 30)** | 1.952 págs. | ~22.2 MB | Manual completo que abarca Procedimientos Normales, Suplementarios, Rendimiento y la descripción completa de los 15 sistemas de la aeronave. |
| [`B737-FCOM-Chapter-02-Air-Systems.pdf`](B737-FCOM-Chapter-02-Air-Systems.pdf) | **Capítulo 2: Air Systems** | 46 págs. | ~1.0 MB | Extracto enfocado en sangrado de motor (*Bleed Air*), aire acondicionado, control de temperatura por zonas y presurización de cabina. |
| [`B737-FCOM-Chapter-03-Anti-Ice-Rain.pdf`](B737-FCOM-Chapter-03-Anti-Ice-Rain.pdf) | **Capítulo 3: Anti-Ice, Rain** | 16 págs. | ~360 KB | Extracto enfocado en calefacción de ventanas (*Window Heat*), sondas (*Probe Heat*), antihielo de motores (*Engine TAI*), alas (*Wing Anti-Ice*) y limpiaparabrisas. |

---

## 📚 Estructura General del FCOM Completo

El manual maestro (`ryanair-737-700-800-fcom-rev-30.pdf`) se divide en:
1. **Limitations** (Límites operacionales del avión)
2. **Normal Procedures** (Listas de chequeo y flujos normales de cabina)
3. **Supplementary Procedures** (Procedimientos en condiciones especiales)
4. **Performance Dispatch / Inflight** (Tablas y cálculos de rendimiento)
5. **Systems Description**:
   - `01`: Airplane General, Emergency Equipment, Doors, Windows
   - `02`: **Air Systems** *(Neumática, A/C, Presurización)*
   - `03`: **Anti-Ice, Rain** *(Protección contra hielo y lluvia)*
   - `04`: Automatic Flight *(Autopilot, Flight Director, Autothrottle)*
   - `05`: Communications
   - `06`: Electrical System *(Generadores, APU, Buses AC/DC, Batería)*
   - `07`: Engines, APU *(CFM56-7B, arranque, controles de empuje, reversas)*
   - `08`: Fire Protection *(Detección y extinción en motores, APU, bodegas)*
   - `09`: Flight Controls *(Mandos primarios y secundarios, spoilers, flaps/slats)*
   - `10`: Flight Instruments, Displays *(PFD, ND, CDS)*
   - `11`: Flight Management, Navigation *(FMC, CDU, LNAV, VNAV)*
   - `12`: Fuel *(Bombas, tanques, válvulas de corte y crossfeed)*
   - `13`: Hydraulics *(Sistemas A, B y Standby, PTU, LGTU)*
   - `14`: Landing Gear *(Tren de aterrizaje, frenos, autobrake, antiskid)*
   - `15`: Warning Systems *(GPWS, TCAS, Master Caution, avisos sonoros)*

---

## 📑 Resumen de los Capítulos Activos en Simulación

### 1. Capítulo 2: Air Systems
- **Sección 2.10 — Controls and Indicators**:
  - `2.10.1`: Bleed Air Controls and Indicators (panel overhead delantero, medidor de presión de ducto, luces `DUAL BLEED`, `BLEED TRIP OFF`, `WING-BODY OVERHEAT`, interruptores de sangrado e `ISOLATION VALVE`).
  - `2.10.5`: Air Conditioning Controls and Indicators (selectores de temperatura de cabina, luces `DUCT OVERHEAT`, `PACK TRIP OFF`, interruptores `PACK`, `RECIRC FAN`).
  - `2.10.11`: Equipment Cooling Panel (`NORM`/`ALTN`, luces `OFF`).
  - `2.10.12`: Cabin Altitude Panel (altímetro de cabina / presión diferencial, variómetro de cabina, switch `ALT HORN CUTOUT`).
  - `2.10.13`: Cabin Pressurization Panel (indicadores `FLT ALT`, `LAND ALT`, selector de modo `AUTO`/`ALTN`/`MAN`, válvula de escape de salida `OUTFLOW VALVE`).
- **Sección 2.20 — Bleed Air System Description**:
  - `2.20.1`: Alimentación del sistema (etapas 5ª y 9ª del compresor), válvulas de sangrado de motor, sensores de disparo (`Bleed Trip Sensors`).
  - `2.20.2`: Válvula de aislamiento (`Isolation Valve`), APU Bleed, lógica de la luz `DUAL BLEED`.
  - `2.20.3`: Esquema del sistema neumático de sangrado (`Bleed Air System Schematic`).
  - `2.20.5`: Protección contra sobrecalentamiento en ala y fuselaje (`Wing-Body Overheat Ducts and Lights`).
- **Sección 2.30 / 2.31 — Air Conditioning System Description**:
  - Packs de aire acondicionado, compuertas de aire de impacto (`Ram Air Doors`), ciclo de refrigeración (ACM).
  - Distribución y control de temperatura por zonas (`Trim Air`, `Zone Temp`, ventiladores de recirculación).
  - Refrigeración de equipos electrónicos (E&E bay).
- **Sección 2.40 — Pressurization System Description**:
  - Controladores automáticos duales y modo manual de presurización.
  - Válvula de salida (`Outflow Valve`), válvula de escape exterior (`Overboard Exhaust Valve`), perfiles de altitud de cabina vs altitud de avión.

### 2. Capítulo 3: Anti-Ice and Rain
- **Sección 3.10 — Controls and Indicators**:
  - `3.10.1`: Window Heat Panel (calefacción de ventanillas L/R, indicadores de estado y prueba `PWR TEST`/`OVHT`).
  - `3.10.2`: Controles de aire para desempañado y pies; panel de selectores de limpiaparabrisas (`Windshield Wipers`: `PARK`, `INT`, `LOW`, `HIGH`).
  - `3.10.3`: Probe Heat Panel (sondas Pitot, ángulo de ataque Alpha Vane, sensor de temperatura total TAT).
  - `3.10.4`: Engine Anti-Ice Panel (interruptores `ENG ANTI-ICE`, luces `COWL ANTI-ICE` y `COWL VALVE OPEN`).
  - `3.10.5`: Wing Anti-Ice Panel (interruptor `WING ANTI-ICE`, luces `L/R VALVE OPEN`, indicación TAI en CDS).
- **Sección 3.20 — System Description**:
  - `3.20.1`: Diagrama general de componentes antihielo en la aeronave.
  - `3.20.2`: Operación y esquemas eléctricos de calefacción de ventanas.
  - `3.20.4`: Lógica de operación de limpiaparabrisas (intervalos de 7s en intermitente).
  - `3.20.5`: Operación de sondas y calentamiento de toberas de motor (Engine Cowl Lip).
  - `3.20.6`: Operación de antihielo de alas (`Wing Anti-Ice`), lógica de prueba en tierra, corte por sobretemperatura/empuje y disparo a `OFF` al despegue (lift-off).

---

## 🔗 Vinculación con los Componentes del Simulador

Los sistemas modelados en código se apoyan en estos capítulos:
- [`runtime-state.ts`](../../src/app/simulation/pneumatic/runtime-state.ts) — Lógica de válvulas de sangrado, aislamiento (CLOSE/AUTO/OPEN), APU y bleed trip (FCOM Cap. 2).
- [`pneumatic-context.tsx`](../../src/app/simulation/pneumatic/pneumatic-context.tsx) — Alertas DUAL BLEED, sobrecalentamiento wing-body, tests de window heat y probe heat (FCOM Caps. 2 y 3).
- [`pneumatic-panel.tsx`](../../src/app/components/pneumatic-panel.tsx) — Panel overhead neumático y de acondicionamiento de aire (FCOM Cap. 2).
- [`panels/`](../../src/app/components/panels/) — Instrumentación física, perillas, selectores e indicadores luminosos (FCOM Caps. 2 y 3).
- [`overheat-sensors-layer.tsx`](../../src/app/components/overheat-sensors-layer.tsx) — Sensores de sobrecalentamiento Cowl, Wing y Bleed trip (FCOM Caps. 2 y 3).
- [`flight-deck-windows-layer.tsx`](../../src/app/components/flight-deck-windows-layer.tsx) — Control de calor de ventanillas de cabina (FCOM Cap. 3).
- [`air-data-probes-layer.tsx`](../../src/app/components/air-data-probes-layer.tsx) — Calefacción de tubos Pitot y tomas estáticas (FCOM Cap. 3).
- [`windshield-wipers-layer.tsx`](../../src/app/components/windshield-wipers-layer.tsx) — Ciclos de limpiaparabrisas (FCOM Cap. 3).
