"use client";

import { useFuel } from "../../simulation/fuel/fuel-context";
import type { PumpId, ValveLight } from "../../simulation/fuel/fuel-system";
import type { EngineId } from "../../simulation/fire/fire-protection";
import { gaugeCoord, Screw } from "./panel-parts";
import { AircraftToggleSwitch } from "./switches";

const LIGHT_TEXT: Record<ValveLight, string> = {
  off: "apagada",
  dim: "tenue",
  bright: "brillante",
};

/** Annunciator light: blue valve lights go dim or bright, amber ones just light. */
function FuelLight({
  lines,
  color,
  state,
  title,
}: {
  lines: [string, string];
  color: "blue" | "amber";
  state: ValveLight | boolean;
  title: string;
}) {
  const level = state === true ? "bright" : state === false ? "off" : state;
  return (
    <div className={`fuel-light ${color} ${level}`} role="status" title={title}>
      <span>{lines[0]}</span>
      <span>{lines[1]}</span>
    </div>
  );
}

/** FUEL TEMP indicator, −50 to +50 °C with 0 at the top (FCOM 12.10.1). */
function FuelTempGauge({ celsius }: { celsius: number }) {
  const clamped = Math.max(-50, Math.min(50, celsius));
  const toDeg = (value: number) => value * 3;
  const ticks = Array.from({ length: 21 }, (_, i) => -50 + i * 5);
  const point = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [gaugeCoord(60 + r * Math.cos(rad)), gaugeCoord(60 + r * Math.sin(rad))] as const;
  };
  return (
    <svg
      className="fuel-temp-gauge"
      viewBox="0 0 120 120"
      role="img"
      aria-label={`Fuel temperature ${Math.round(celsius)} degrees`}
    >
      <title>{`FUEL TEMP: ${Math.round(celsius)} °C (sensor en el tanque principal No. 1; límites −43 °C y +49 °C, FCOM L.10.9)`}</title>
      <circle cx="60" cy="60" r="58" fill="#4a4f52" stroke="#25282a" strokeWidth="2" />
      <circle cx="60" cy="60" r="52" fill="#08090a" stroke="#6c7276" strokeWidth="1.5" />
      <g stroke="#ffffff" strokeLinecap="round">
        {ticks.map((value) => {
          const major = value % 20 === 0;
          const [x1, y1] = point(toDeg(value), major ? 38 : 43);
          const [x2, y2] = point(toDeg(value), 49);
          return <line key={value} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={major ? 2 : 1} />;
        })}
      </g>
      <g fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
        {[-40, -20, 0, 20, 40].map((value) => {
          const [x, y] = point(toDeg(value), 29);
          return (
            <text key={value} x={x} y={y + 3}>
              {value > 0 ? `+${value}` : value}
            </text>
          );
        })}
        <text x="60" y="44" fontSize="5.5">
          FUEL
        </text>
        <text x="60" y="50" fontSize="5.5">
          TEMP
        </text>
        <text x="60" y="88" fontSize="8">
          °C
        </text>
      </g>
      <g
        style={{
          transform: `rotate(${toDeg(clamped)}deg)`,
          transformOrigin: "60px 60px",
          transition: "transform 0.4s ease-out",
        }}
      >
        <polygon points="58,60 60,15 62,60 60,66" fill="#ffffff" />
      </g>
      <circle cx="60" cy="60" r="7" fill="#121415" stroke="#6c7276" strokeWidth="1.5" />
    </svg>
  );
}

function PumpSwitch({ pump, label }: { pump: PumpId; label: string }) {
  const { state, indications, dispatch } = useFuel();
  const on = state.pumpSwitches[pump];
  const lit = indications.pumps[pump].lowPressureLit;
  const set = (next: boolean) => {
    if (next !== on) dispatch({ type: "setPumpSwitch", pump, on: next });
  };
  return (
    <div className={`fuel-pump fuel-pump-${pump}`}>
      <FuelLight
        lines={["LOW", "PRESSURE"]}
        color="amber"
        state={lit}
        title={`LOW PRESSURE · bomba ${label}: ${lit ? "ENCENDIDA (presión de salida baja" + (on ? ")" : " o switch en OFF)") : "apagada"}`}
      />
      <div title={`FUEL PUMP ${label}: ${on ? "ON" : "OFF"} (clic o rueda para cambiar)`}>
        <AircraftToggleSwitch
          position={on ? "DOWN" : "UP"}
          onClick={() => set(!on)}
          onWheelStep={(direction) => set(direction > 0)}
          size={34}
        />
      </div>
    </div>
  );
}

function CrossfeedSelector() {
  const { state, dispatch } = useFuel();
  const open = state.crossfeedSelector;
  return (
    <button
      type="button"
      className={`fuel-crossfeed${open ? " open" : ""}`}
      aria-pressed={open}
      aria-label={`CROSSFEED selector, ${open ? "open" : "closed"}`}
      title={`CROSSFEED: ${open ? "ABIERTO (conecta los manifolds de los motores 1 y 2)" : "CERRADO (aísla los manifolds)"}. Clic para ${open ? "cerrar" : "abrir"}`}
      onClick={() => dispatch({ type: "setCrossfeed", open: !open })}
    >
      <span className="fuel-crossfeed-bar" />
    </button>
  );
}

function EngineValveLights({ engine }: { engine: EngineId }) {
  const { indications } = useFuel();
  const n = engine === "eng1" ? 1 : 2;
  const { engineValveLight, sparValveLight } = indications.engines[engine];
  const valveTitle = (name: string, light: ValveLight) =>
    `${name} · motor ${n}: ${LIGHT_TEXT[light]} (tenue: cerrada; brillante: en tránsito o en desacuerdo con la start lever / fire switch; apagada: abierta)`;
  return (
    <div className={`fuel-valve-lights eng${n}`}>
      <FuelLight
        lines={["ENG VALVE", "CLOSED"]}
        color="blue"
        state={engineValveLight}
        title={valveTitle("ENG VALVE CLOSED", engineValveLight)}
      />
      <FuelLight
        lines={["SPAR VALVE", "CLOSED"]}
        color="blue"
        state={sparValveLight}
        title={valveTitle("SPAR VALVE CLOSED", sparValveLight)}
      />
    </div>
  );
}

/** Fuel control panel on the forward overhead (FCOM 12.10.1-3). */
export function FuelPanel() {
  const { indications } = useFuel();
  const filterTitle = (n: number, lit: boolean) =>
    `FILTER BYPASS · motor ${n}: ${lit ? "ENCENDIDA (filtro de combustible contaminado: bypass inminente)" : "apagada"}`;

  return (
    <section className="aircraft-panel fuel-panel" aria-label="Fuel control panel">
      <EngineValveLights engine="eng1" />
      <div className="fuel-temp">
        <FuelTempGauge celsius={indications.fuelTempC} />
      </div>
      <EngineValveLights engine="eng2" />

      <div className="fuel-filter-row">
        <FuelLight
          lines={["FILTER", "BYPASS"]}
          color="amber"
          state={indications.engines.eng1.filterBypassLit}
          title={filterTitle(1, indications.engines.eng1.filterBypassLit)}
        />
        <FuelLight
          lines={["VALVE", "OPEN"]}
          color="blue"
          state={indications.crossfeedLight}
          title={`Crossfeed VALVE OPEN: ${LIGHT_TEXT[indications.crossfeedLight]} (tenue: abierta; brillante: en tránsito o en desacuerdo con el selector)`}
        />
        <FuelLight
          lines={["FILTER", "BYPASS"]}
          color="amber"
          state={indications.engines.eng2.filterBypassLit}
          title={filterTitle(2, indications.engines.eng2.filterBypassLit)}
        />
      </div>

      {/* White mimic plate: feed lines, crossfeed and the six pumps */}
      <div className="fuel-mimic">
        <svg className="fuel-mimic-lines" viewBox="0 0 300 310" aria-hidden="true">
          <g fill="none" stroke="#141414" strokeWidth="6" strokeLinejoin="miter">
            {/* Engine feed lines up the sides, joined by the crossfeed */}
            <path d="M22 0 V214 M278 0 V214" />
            <path d="M22 38 H124 M176 38 H278" />
            {/* Center tank pumps */}
            <path d="M22 70 H96 V92 M278 70 H204 V92" />
            {/* Main tank pumps */}
            <path d="M22 214 H112 V232 M50 214 V232" />
            <path d="M278 214 H188 V232 M250 214 V232" />
          </g>
        </svg>
        <span className="fp-label fuel-word cross">CROSS</span>
        <span className="fp-label fuel-word feed">FEED</span>
        <CrossfeedSelector />

        <span className="fp-label fuel-word ctr-title">FUEL PUMPS</span>
        <span className="fp-label fuel-word ctr-l">L</span>
        <span className="fp-label fuel-word ctr-r">R</span>
        <span className="fp-label fuel-word ctr-off">OFF</span>
        <span className="fp-label fuel-word ctr-on">ON</span>
        <span className="fp-label fuel-word ctr-ctr">CTR</span>
        <PumpSwitch pump="ctrL" label="CTR L" />
        <PumpSwitch pump="ctrR" label="CTR R" />

        <PumpSwitch pump="aft1" label="AFT 1" />
        <PumpSwitch pump="fwd1" label="FWD 1" />
        <PumpSwitch pump="fwd2" label="FWD 2" />
        <PumpSwitch pump="aft2" label="AFT 2" />
        <span className="fp-label fuel-word aft1">AFT</span>
        <span className="fp-label fuel-word fwd1">FWD</span>
        <span className="fp-label fuel-word fwd2">FWD</span>
        <span className="fp-label fuel-word aft2">AFT</span>
        <span className="fp-label fuel-word main-off1">OFF</span>
        <span className="fp-label fuel-word main-on1">ON</span>
        <span className="fp-label fuel-word main-off2">OFF</span>
        <span className="fp-label fuel-word main-on2">ON</span>
        <span className="fp-label fuel-word main-title">
          FUEL
          <br />
          PUMPS
        </span>
        <span className="fp-label fuel-word num1">1</span>
        <span className="fp-label fuel-word num2">2</span>
      </div>

      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}
