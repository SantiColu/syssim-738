# Agrupación de sistemas en la vista de sistema

Decisión de diseño (octubre 2026): cómo se reparten los sistemas del 737 NG en pestañas para que, en la **vista en planta**, los elementos de un grupo no se solapen.

## Criterio

- La unidad base son los **capítulos del FCOM**.
- En una misma pestaña solo conviven capítulos que ocupan **zonas distintas** del avión. Los que compiten por la misma zona van en pestañas separadas.
- Todo se dibuja **en planta**. No se usa la vista lateral para repartir sistemas.

El conflicto principal está en las **alas y el centro del fuselaje**. Ahí se cruzan bleed y packs (2), controles de vuelo (9), combustible (12), hidráulico (13) y tren (14).

## Pestañas

| Pestaña | Capítulos FCOM | Contenido en planta |
| :--- | :--- | :--- |
| **AIR** | 2 Air Systems + 3 Anti-Ice, Rain | Bleed, packs, distribución, presurización, anti-ice, sondas, ventanas, wipers |
| **FIRE** | 8 Fire Protection | Detección y extinción: góndolas, APU, bodegas fwd/aft, wheel well, lavabos |
| **HYDRAULICS** | 13 Hydraulics + 9 Flight Controls + 14 Landing Gear | Red A / B / Standby; superficies, tren y frenos como consumidores |
| **FUEL** | 12 Fuel | Tanques, bombas, crossfeed, alimentación a motores y APU |
| **ELEC** | 6 Electrical | Diagrama de buses, **no** en planta (los cables recorren todo el avión) |
| *(global)* | 7 Engines, APU | Barra de controles y estado compartido, sin pestaña propia |
| *(solo cockpit)* | 4, 5, 10, 11, 15 | Sin vista de sistema; viven en los paneles |

El capítulo 1 (puertas, equipos de emergencia) queda sin asignar por ahora.

## Motores y APU: estado global

Los motores y la APU son la fuente de varios sistemas: bleed (AIR), generadores (ELEC) y bombas (HYDRAULICS). Por eso no pertenecen a ninguna pestaña:

- **Simulación:** el estado de motores y APU (encendido; más adelante N1/N2) es un módulo compartido que leen todos los sistemas.
- **UI:** los controles ENG 1 / ENG 2 / APU / GND AIR del panel de sistema son globales y se ven en todas las pestañas.
- **Dibujo:** cada pestaña dibuja el motor como fuente de *su* sistema. En AIR son las etapas 5.ª/9.ª y el fan air; en HYDRAULICS, las bombas; en ELEC, los generadores.

Una pestaña ENGINES dedicada solo tendría sentido si se simula el arranque en detalle (N2, EGT, secuencia del starter).

## Conexiones entre pestañas

Cada pestaña dibuja solo su sistema. Lo que viene de otro grupo aparece como un **puerto** en el borde. En AIR, por ejemplo, el motor es un bloque fuente; en otra pestaña, ese mismo punto es una salida "→ AIR".

La alimentación eléctrica no se dibuja como cable. Cada consumidor muestra un indicador de alimentado / sin alimentar, y el detalle está en ELEC.

## Capas dentro de una pestaña

Dentro de cada pestaña hay capas; en AIR, por ejemplo: Bleed / Packs / Presurización / Anti-ice / Rain. Al activar una, el resto se **atenúa** en vez de ocultarse, porque los sistemas están conectados. La simulación siempre corre completa: las capas solo deciden qué se resalta.

## AIR: carriles en el fuselaje

El esquema no es a escala, así que el fuselaje se reparte por carriles para que bleed y distribución no se pisen:

- **Carril izquierdo** (donde hoy baja el ducto del APU, x≈363 en `main-network.ts`): bleed, es decir, manifold, APU y aire de tierra.
- **Carril derecho:** distribución. Mix manifold, ductos a cabina y recirculación.
- **Extremos:** presurización. La outflow valve va atrás; la overboard exhaust valve y el E&E cooling, adelante. Conviene reservarles espacio en la nariz, donde ya están sondas y ventanas.

## Estado

- **Acordado:** el criterio, la lista de pestañas, los motores y la APU como estado global, y FIRE separado.
- **Pendiente:** renombrar la pestaña PNEUMATIC a AIR, sacar el estado de motores y APU a un módulo compartido y reservar el carril de distribución. No bloquea el trabajo en ECS.
