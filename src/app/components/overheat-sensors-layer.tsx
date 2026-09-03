"use client";

import React from "react";
import { usePneumatic } from "../simulation/pneumatic/pneumatic-context";

export interface WingBodySensorDefinition {
  id: number;
  name: string;
  zone: string;
  x: number;
  y: number;
  side: "left" | "right";
}

export interface BleedTripSensorDefinition {
  id: "eng1-upstream" | "eng1-downstream" | "eng2-upstream" | "eng2-downstream";
  name: string;
  zone: string;
  x: number;
  y: number;
  rotation: number;
  side: "left" | "right";
}

/**
 * Wing-Body Overheat Sensors:
 * Compact solid white filled dots (half radius: r=1.2px) with a dashed ring on hover.
 * Symmetrical positions:
 * - 1 & 6: Engine Strut / Nacelle
 * - 2 & 7: Inboard Wing Leading Edge Fairing
 * - 3 & 8: Air Conditioning Bay / Wing-to-Body Fairing
 * - 4: Keel Beam
 * - 5: APU Bleed Duct
 */
export const WING_BODY_OVERHEAT_SENSORS: WingBodySensorDefinition[] = [
  // Left Wing-Body Overheat sensors (activate Left WING-BODY OVERHEAT light)
  {
    id: 1,
    name: "Left Engine Strut",
    zone: "Nacelle / Pilón Motor 1",
    x: 311,
    y: 226,
    side: "left",
  },
  {
    id: 2,
    name: "Left Inboard Wing Leading Edge",
    zone: "Borde de ataque interior alar izquierdo",
    x: 338,
    y: 240,
    side: "left",
  },
  {
    id: 3,
    name: "Left-Hand Air Conditioning Bay",
    zone: "Bahía de Aire Acondicionado Izquierda (Pack L)",
    x: 357,
    y: 218,
    side: "left",
  },
  {
    id: 4,
    name: "Keel Beam",
    zone: "Viga de Quilla (Keel Beam)",
    x: 363,
    y: 332,
    side: "left",
  },
  {
    id: 5,
    name: "Bleed Duct from APU",
    zone: "Ducto de Sangrado de APU",
    x: 363,
    y: 415,
    side: "left",
  },
  // Right Wing-Body Overheat sensors (activate Right WING-BODY OVERHEAT light, symmetrical)
  {
    id: 6,
    name: "Right Engine Strut",
    zone: "Nacelle / Pilón Motor 2",
    x: 449,
    y: 226,
    side: "right",
  },
  {
    id: 7,
    name: "Right Inboard Wing Leading Edge",
    zone: "Borde de ataque interior alar derecho",
    x: 422,
    y: 240,
    side: "right",
  },
  {
    id: 8,
    name: "Right-Hand Air Conditioning Bay",
    zone: "Bahía de Aire Acondicionado Derecha (Pack R)",
    x: 403,
    y: 218,
    side: "right",
  },
];

/**
 * Bleed Trip Off Sensors:
 * Two sensors per engine, shaped as a clean solid "T" glyph flipped across the X-axis (hanging below the pipe):
 * - Upstream of Bleed Valve (PRSOV)
 * - Downstream of Precooler (after heat exchanger)
 */
export const BLEED_TRIP_SENSORS: BleedTripSensorDefinition[] = [
  // Left Engine Bleed Trip Off sensors
  {
    id: "eng1-upstream",
    name: "ENG 1 Bleed Trip Sensor (Upstream)",
    zone: "Línea de sangrado motor 1 (Antes de válvula de bleed)",
    x: 324.5,
    y: 253,
    rotation: 0,
    side: "left",
  },
  {
    id: "eng1-downstream",
    name: "ENG 1 Bleed Trip Sensor (Downstream)",
    zone: "Línea de sangrado motor 1 (Después de intercambiador de calor)",
    x: 356,
    y: 253,
    rotation: 0,
    side: "left",
  },
  // Right Engine Bleed Trip Off sensors (symmetrical)
  {
    id: "eng2-upstream",
    name: "ENG 2 Bleed Trip Sensor (Upstream)",
    zone: "Línea de sangrado motor 2 (Antes de válvula de bleed)",
    x: 436.5,
    y: 254,
    rotation: 0,
    side: "right",
  },
  {
    id: "eng2-downstream",
    name: "ENG 2 Bleed Trip Sensor (Downstream)",
    zone: "Línea de sangrado motor 2 (Después de intercambiador de calor)",
    x: 404,
    y: 254,
    rotation: 0,
    side: "right",
  },
];

/**
 * Bleed Trip Off Sensor Probe Glyph:
 * - Simple solid filled "T" shape
 * - Bottom/stem entirely solid filled (no gaps or split lines)
 * - All protruding lines (top pin, side tab) removed
 * - Flipped with respect to the X-axis (hangs down below the pipe line)
 * - Solid white in normal state, solid amber when tripped
 */
function BleedTripProbeGlyph({ isTripped }: { isTripped: boolean }) {
  const color = isTripped ? "#ffb300" : "#ffffff";

  return (
    <g className="transition-all duration-150">
      {/* Overheat pulsating glow aura */}
      {isTripped && (
        <rect
          x="-1.65"
          y="-0.2"
          width="3.3"
          height="3.4"
          rx="0.25"
          fill="none"
          stroke="#ffb300"
          strokeWidth="0.75"
          opacity="0.6"
          className="animate-pulse"
        />
      )}

      {/* Hover outline when normal */}
      {!isTripped && (
        <rect
          x="-1.6"
          y="-0.2"
          width="3.2"
          height="3.3"
          rx="0.25"
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.35"
          strokeDasharray="0.8 0.8"
          className="opacity-0 transition-opacity duration-150 group-hover:opacity-80"
        />
      )}

      {/* Solid "T" glyph flipped along X-axis (hangs down from the pipe at y=0) */}
      <path
        d="M -0.45 0 L 0.45 0 L 0.45 1.75 L 1.35 1.75 L 1.35 2.85 L -1.35 2.85 L -1.35 1.75 L -0.45 1.75 Z"
        fill={color}
        className="transition-colors duration-150"
      />
    </g>
  );
}

export function OverheatSensorsLayer() {
  const {
    overheatSensors,
    toggleOverheatSensor,
    bleedTripSensors,
    toggleBleedTripSensor,
  } = usePneumatic();

  return (
    <g
      id="pneumatic-sensors-layer"
      className="select-none"
      aria-label="Sensores de Wing-Body Overheat y Bleed Trip Off"
    >
      {/* 1. WING-BODY OVERHEAT SENSORS (compact solid white dots with dashed hover ring) */}
      {WING_BODY_OVERHEAT_SENSORS.map((sensor) => {
        const isOverheated = Boolean(overheatSensors[sensor.id]);

        const handleClick = (e: React.SyntheticEvent) => {
          e.preventDefault();
          e.stopPropagation();
          toggleOverheatSensor(sensor.id);
        };

        return (
          <g
            key={`wb-${sensor.id}`}
            data-sensor-id={`wb-${sensor.id}`}
            data-interactive="true"
            data-sensor-side={sensor.side}
            data-overheated={isOverheated}
            transform={`translate(${sensor.x} ${sensor.y})`}
            className="cursor-pointer group focus:outline-none"
            tabIndex={0}
            role="button"
            aria-pressed={isOverheated}
            aria-label={`Sensor Wing-Body Overheat ${sensor.id}: ${sensor.name}. ${isOverheated ? "Sobretemperatura activa" : "Normal"}. Click para alternar.`}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={handleClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleClick(e);
              }
            }}
          >
            <title>
              {`Sensor Wing-Body Overheat ${sensor.id}: ${sensor.name}
Zona: ${sensor.zone}
Luz de cabina asociada: WING-BODY OVERHEAT (${sensor.side === "left" ? "IZQUIERDA" : "DERECHA"})
Estado: ${isOverheated ? "¡SOBRETEMPERATURA ACTIVA!" : "NORMAL"}
(Haz clic para ${isOverheated ? "restablecer" : "simular sobretemperatura y encender luz"})`}
            </title>

            {/* Hitbox amplio transparente para facilitar el click */}
            <circle cx="0" cy="0" r="5.5" fill="transparent" />

            {/* Círculo a rayas en hover cuando está normal */}
            {!isOverheated && (
              <circle
                cx="0"
                cy="0"
                r="2.5"
                fill="none"
                stroke="#ffffff"
                strokeWidth="0.4"
                strokeDasharray="1 0.8"
                className="opacity-0 transition-opacity duration-150 group-hover:opacity-85"
              />
            )}

            {/* Círculo pulsante en ámbar cuando está en sobretemperatura */}
            {isOverheated && (
              <circle
                cx="0"
                cy="0"
                r="2.8"
                fill="none"
                stroke="#ffb300"
                strokeWidth="0.6"
                opacity="0.7"
                className="animate-pulse"
              />
            )}

            {/* Punto círculo relleno blanco por defecto (r=1.2), ámbar en sobretemperatura */}
            <circle
              cx="0"
              cy="0"
              r="1.2"
              fill={isOverheated ? "#ffb300" : "#ffffff"}
              stroke="#090d16"
              strokeWidth="0.3"
              className="transition-all duration-150 group-hover:scale-125"
            />
          </g>
        );
      })}

      {/* 2. BLEED TRIP OFF SENSORS (compact solid "T" glyph flipped along X-axis) */}
      {BLEED_TRIP_SENSORS.map((sensor) => {
        const isTripped = Boolean(bleedTripSensors[sensor.id]);

        const handleClick = (e: React.SyntheticEvent) => {
          e.preventDefault();
          e.stopPropagation();
          toggleBleedTripSensor(sensor.id);
        };

        return (
          <g
            key={`bt-${sensor.id}`}
            data-sensor-id={`bt-${sensor.id}`}
            data-interactive="true"
            data-sensor-side={sensor.side}
            data-tripped={isTripped}
            transform={`translate(${sensor.x} ${sensor.y}) rotate(${sensor.rotation})`}
            className="cursor-pointer group focus:outline-none"
            tabIndex={0}
            role="button"
            aria-pressed={isTripped}
            aria-label={`Sensor Bleed Trip: ${sensor.name}. ${isTripped ? "Disparado (Trip)" : "Normal"}. Click para alternar.`}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={handleClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleClick(e);
              }
            }}
          >
            <title>
              {`${sensor.name}
Zona: ${sensor.zone}
Luz de cabina asociada: BLEED TRIP OFF (${sensor.side === "left" ? "IZQUIERDA" : "DERECHA"})
Estado: ${isTripped ? "¡BLEED TRIP OFF DISPARADO!" : "NORMAL"}
(Haz clic para ${isTripped ? "restablecer" : "simular falla y encender luz BLEED TRIP OFF"})`}
            </title>

            {/* Hitbox amplio transparente para facilitar el click */}
            <rect
              x="-2.5"
              y="-0.5"
              width="5.0"
              height="4.5"
              fill="transparent"
            />

            {/* Símbolo técnico de sonda de bleed trip en forma de T sólida invertida */}
            <BleedTripProbeGlyph isTripped={isTripped} />
          </g>
        );
      })}
    </g>
  );
}
