"use client";

import React, { useState } from "react";
import {
  WindowHeatSwitches,
  usePneumatic,
} from "../simulation/pneumatic/pneumatic-context";

interface WindowConfig {
  key: keyof WindowHeatSwitches;
  id: string;
  name: string;
  cadPath: string;
  number: string;
}

const WINDOW_CONFIGS: WindowConfig[] = [
  {
    key: "fwdL",
    id: "cad-window-l-fwd",
    name: "L FWD WINDSHIELD",
    number: "No. 1",
    cadPath:
      "m45.354 2295.9-18.927 35.15-6.9827 12.967-0.37304 0.56542-0.46828 0.48945-0.54803 0.39798-0.61039 0.29405-0.6531 0.1799-0.67465 0.060851h-42.182l-0.70526-0.06652-0.68069-0.19654-0.63156-0.3205-0.56126-0.43276-0.47017-0.52951-0.36321-0.60813-0.2434-0.6652-0.1149-0.69921 0.017386-0.70828 0.14929-0.69241 0.2759-0.65235 55.82-103.67 0.019653-0.036548 0.013104-0.024268 0.017469-0.032285 0.008734-0.016127 0.08592-0.12926 0.11456-0.1724 0.057283-0.086234 0.12888-0.19415 0.054161-0.055574 0.072181-0.074132 0.036079-0.037085 0.21646-0.22263 0.1083-0.11137 0.19049-0.13427 0.25398-0.17913 0.12699-0.089495 0.63534-0.29027 0.67842-0.16894 0.077481-0.004422 0.10331-0.005937 0.051662-0.002983 0.15501-0.008991 0.31024-0.018108 0.076978 0.009816 0.10264 0.01305 0.051326 0.006516 0.30807 0.039077 0.15415 0.019604 7.6315 1.7009 2.1805 0.48602 1.6354 0.36454 2.1805 0.48609 1.0903 0.24306 22.944 5.1137 0.66293 0.21354 0.61266 0.33184 0.54123 0.43805 0.45165 0.53027 0.34658 0.60397 0.23017 0.65726 0.10545 0.68825-0.022677 0.69657-0.15005 0.67994-0.2725 0.64139-25.449 47.263 Z",
  },
  {
    key: "fwdR",
    id: "cad-window-r-fwd",
    name: "R FWD WINDSHIELD",
    number: "No. 1",
    cadPath:
      "m45.354 2408.2-18.927-35.15-6.9827-12.967-0.37304-0.56542-0.46828-0.48945-0.54803-0.39798-0.61039-0.29405-0.6531-0.17991-0.67465-0.06085h-42.182l-0.70526 0.06652-0.68069 0.19654-0.63156 0.3205-0.56126 0.43276-0.47017 0.52951-0.36321 0.60813-0.2434 0.6652-0.1149 0.69921 0.017386 0.70828 0.14929 0.69241 0.2759 0.65235 55.82 103.67 0.019653 0.036548 0.013104 0.024269 0.017469 0.032285 0.008734 0.016127 0.08592 0.12926 0.11456 0.1724 0.057283 0.086234 0.12888 0.19415 0.054161 0.055574 0.072181 0.074132 0.036079 0.037085 0.21646 0.22263 0.1083 0.11137 0.19049 0.13427 0.25398 0.17913 0.12699 0.089495 0.63534 0.29027 0.67842 0.16894 0.077481 0.004422 0.10331 0.005937 0.051662 0.002982 0.15501 0.008992 0.31024 0.018108 0.076978-0.009816 0.10264-0.013051 0.051326-0.006515 0.30807-0.039077 0.15415-0.019604 14.718-3.2806 22.944-5.1137 0.66293-0.21354 0.61266-0.33184 0.54123-0.43805 0.45165-0.53027 0.34658-0.60397 0.23017-0.65726 0.10545-0.68825-0.022677-0.69657-0.15005-0.67994-0.2725-0.64139-25.449-47.263 Z",
  },
  {
    key: "sideL",
    id: "cad-window-l-side",
    name: "L SIDE WINDOW",
    number: "No. 2",
    cadPath:
      "m83.973 2236.6-33.698-7.5107-0.68258-0.22186-0.62854-0.34734-0.55143-0.45959-0.45468-0.55597-0.34129-0.63118-0.21581-0.68523-0.082016-0.71282 0.053669-0.71584 0.1886-0.69317 0.31597-0.64441 0.432-0.57298 0.53291-0.48113 0.61417-0.37191 52.77-25.441 0.65688-0.24454 0.6909-0.11906 0.7011 0.010582 0.68712 0.13984 0.64932 0.26419 0.58923 0.38022 24.526 19.249 0.53783 0.51553 0.42633 0.61077 0.2982 0.68258 0.15836 0.72756 0.01285 0.74532-0.1338 0.73247-0.27477 0.69279-0.40554 0.62513-0.52006 0.53329-0.61455 0.42104-0.68523 0.29216-43.598 13.703-0.21441 0.047343-0.28612 0.063223-0.14312 0.031544-0.14635 0.006297-0.19504 0.008349-0.097516 0.004139-0.073145 0.003084-0.097554 0.004078-0.048793 0.002022-0.072567-0.009589-0.096764-0.012816-0.048385-0.006418-0.29043-0.038532-0.14534-0.019196 Z",
  },
  {
    key: "sideR",
    id: "cad-window-r-side",
    name: "R SIDE WINDOW",
    number: "No. 2",
    cadPath:
      "m83.973 2467.6-33.698 7.5107-0.68258 0.22186-0.62854 0.34734-0.55143 0.45959-0.45468 0.55597-0.34129 0.63118-0.21581 0.68523-0.082016 0.71282 0.053669 0.71584 0.1886 0.69316 0.31597 0.64441 0.432 0.57298 0.53291 0.48113 0.61417 0.37191 52.77 25.441 0.65688 0.24454 0.6909 0.11906 0.7011-0.010583 0.68712-0.13984 0.64932-0.26419 0.58923-0.38022 24.526-19.249 0.53783-0.51553 0.42633-0.61077 0.2982-0.68258 0.15836-0.72756 0.01285-0.74532-0.1338-0.73247-0.27477-0.69279-0.40554-0.62513-0.52006-0.53329-0.61455-0.42104-0.68523-0.29216-43.598-13.703-0.21441-0.047343-0.28612-0.063224-0.14312-0.031544-0.14635-0.006296-0.19504-0.008349-0.097516-0.004139-0.073145-0.003084-0.097554-0.004078-0.048793-0.002022-0.072567 0.009589-0.096764 0.012816-0.33882 0.04495-0.14534 0.019196 Z",
  },
];

export function FlightDeckWindowsLayer() {
  const {
    switches,
    windowOverheat,
    windowHeatTest,
    toggleWindowOverheat,
  } = usePneumatic();

  const [hoveredWindowKey, setHoveredWindowKey] = useState<
    keyof WindowHeatSwitches | null
  >(null);

  const isOvhtTesting = windowHeatTest === "OVHT";
  const isPwrTesting = windowHeatTest === "PWR TEST";

  const handleWindowClick = (
    key: keyof WindowHeatSwitches,
    e?: React.SyntheticEvent,
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Toggle overheat condition for this window
    toggleWindowOverheat(key);
  };

  const getWindowStyle = (
    isHeated: boolean,
    isOvht: boolean,
    isHovered: boolean,
  ) => {
    if (isOvht) {
      return {
        fill: "#ff3b30",
        fillOpacity: isHovered ? 0.95 : 0.82,
        stroke: isHovered ? "#ffffff" : "#ff453a",
        strokeWidth: isHovered ? 14 : 10,
        filter: "drop-shadow(0 0 10px rgba(255, 59, 48, 0.95))",
        cursor: "pointer",
        pointerEvents: "all" as const,
        transition: "all 0.15s ease-out",
      };
    }
    if (isHeated) {
      return {
        fill: "#ffaa00",
        fillOpacity: isHovered ? 0.9 : 0.75,
        stroke: isHovered ? "#ffffff" : "#ffe066",
        strokeWidth: isHovered ? 12 : 9,
        filter: "drop-shadow(0 0 8px rgba(255, 170, 0, 0.9))",
        cursor: "pointer",
        pointerEvents: "all" as const,
        transition: "all 0.15s ease-out",
      };
    }
    return {
      fill: isHovered ? "rgba(0, 240, 255, 0.25)" : "rgba(35, 45, 55, 0.45)",
      fillOpacity: isHovered ? 0.6 : 0.45,
      stroke: isHovered ? "#00f0ff" : "#525e68",
      strokeWidth: isHovered ? 10 : 7,
      cursor: "pointer",
      pointerEvents: "all" as const,
      transition: "all 0.15s ease-out",
    };
  };

  const hoveredConfig = WINDOW_CONFIGS.find((c) => c.key === hoveredWindowKey);
  void hoveredConfig;

  return (
    <g
      id="flight-deck-windows-layer"
      data-interactive="true"
      data-window-heat="true"
      aria-label="Capas de calefacción de ventanas de cabina"
      style={{ pointerEvents: "auto" }}
    >
      <defs>
        {/* Eliminate browser focus ring/bounding box when window is clicked */}
        <style>{`
          #flight-deck-windows-layer g:focus,
          #flight-deck-windows-layer *:focus,
          #flight-deck-windows-layer g:focus-visible,
          #flight-deck-windows-layer *:focus-visible {
            outline: none !important;
            box-shadow: none !important;
          }
        `}</style>
        {/* Heating conductive grid pattern */}
        <pattern
          id="fd-window-heat-grid"
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="10"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.3"
          />
        </pattern>
      </defs>

      {/* 
        Electrically heated flight deck windows per Boeing 737-800 FCOM:
        - Window No. 1 (FWD): Captain and First Officer forward windshields.
        - Window No. 2 (SIDE): Captain and First Officer middle side windows.
        Clicking on a window toggles the OVERHEAT fault condition.
      */}
      <g
        transform="matrix(0 .089414 .089414 0 169.7 53.1)"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: "auto" }}
      >
        {WINDOW_CONFIGS.map((win) => {
          const isSwitchOn = switches.windowHeat[win.key];
          const isOverheated = windowOverheat[win.key] || isOvhtTesting;
          const isHeated =
            isPwrTesting || (isSwitchOn && !isOverheated && !isOvhtTesting);
          const isHovered = hoveredWindowKey === win.key;

          return (
            <g
              key={win.key}
              id={`group-${win.id}`}
              data-interactive="true"
              data-window-heat="true"
              data-window-key={win.key}
              role="button"
              tabIndex={-1}
              aria-label={`Ventana ${win.name} (${win.number})`}
              className="cursor-pointer outline-none focus:outline-none focus:ring-0 select-none"
              style={{ pointerEvents: "all", outline: "none" }}
              onMouseEnter={() => setHoveredWindowKey(win.key)}
              onMouseLeave={() => setHoveredWindowKey(null)}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => handleWindowClick(win.key, e)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleWindowClick(win.key, e);
                }
              }}
            >
              {/* Invisible generous hitbox with 50-unit stroke width to make clicking effortless */}
              <path
                d={win.cadPath}
                fill="transparent"
                stroke="transparent"
                strokeWidth={50}
                style={{ pointerEvents: "all", cursor: "pointer" }}
              />

              {/* Visible rendered window element */}
              <path
                id={win.id}
                d={win.cadPath}
                style={getWindowStyle(isHeated, isOverheated, isHovered)}
              />
            </g>
          );
        })}
      </g>

      {/* Interactive Tooltip on hover */}
      {/*
      {hoveredConfig && (
        <g
          transform="translate(380 44)"
          className="pointer-events-none transition-opacity duration-150"
        >
          <rect
            x="-125"
            y="-9"
            width="250"
            height="14"
            rx="3"
            fill="rgba(15, 20, 25, 0.95)"
            stroke={
              windowOverheat[hoveredConfig.key] || isOvhtTesting
                ? "#ff3b30"
                : switches.windowHeat[hoveredConfig.key]
                  ? "#ffaa00"
                  : "#00f0ff"
            }
            strokeWidth="1"
          />
          <text
            x="0"
            y="1.5"
            textAnchor="middle"
            fill="#ffffff"
            fontFamily="Arial, sans-serif"
            fontSize="7"
            fontWeight="bold"
            letterSpacing="0.06em"
          >
            {`${hoveredConfig.name} (${hoveredConfig.number}): ${
              windowOverheat[hoveredConfig.key] || isOvhtTesting
                ? "¡OVERHEAT! (Clic para restablecer)"
                : switches.windowHeat[hoveredConfig.key]
                  ? "CALEFACCIÓN ACTIVA (Clic para sobrecalentar)"
                  : "CALOR APAGADO (Clic para simular sobrecalentamiento)"
            }`}
          </text>
        </g>
      )}
      */}
    </g>
  );
}
