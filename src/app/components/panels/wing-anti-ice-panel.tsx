"use client";

import { useState, useRef, useEffect } from "react";
import {
  usePneumatic,
} from "../../simulation/pneumatic/pneumatic-context";
import { PNEUMATIC_NODE } from "../../simulation/pneumatic/main-network";
import {
  Screw,
} from "./panel-parts";
import {
  AircraftToggleSwitch,
} from "./switches";

export function WingAntiIcePanel() {
  const {
    switches,
    setWingAntiIce,
    setEng1AntiIce,
    setEng2AntiIce,
    runtimeState,
    cowlOverpressure,
    toggleCowlOverpressure,
  } = usePneumatic();

  const isWingSwitchOn = Boolean(switches?.wingAntiIce);
  const isEng1SwitchOn = Boolean(switches?.eng1AntiIce);
  const isEng2SwitchOn = Boolean(switches?.eng2AntiIce);

  // Real valve positions in the pneumatic simulation
  const isWingLValveOpen = Boolean(runtimeState?.accessories?.[PNEUMATIC_NODE.lWingAntiIceValve]?.open);
  const isWingRValveOpen = Boolean(runtimeState?.accessories?.[PNEUMATIC_NODE.rWingAntiIceValve]?.open);
  const isEng1ValveOpen = Boolean(runtimeState?.accessories?.[PNEUMATIC_NODE.eng1CowlAntiIceValve]?.open);
  const isEng2ValveOpen = Boolean(runtimeState?.accessories?.[PNEUMATIC_NODE.eng2CowlAntiIceValve]?.open);

  // Transit indicators (bright blue during valve transition ~1200ms)
  const [wingInTransit, setWingInTransit] = useState(false);
  const [eng1InTransit, setEng1InTransit] = useState(false);
  const [eng2InTransit, setEng2InTransit] = useState(false);

  const wingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eng1TimerRef = useRef<NodeJS.Timeout | null>(null);
  const eng2TimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (wingTimerRef.current) clearTimeout(wingTimerRef.current);
      if (eng1TimerRef.current) clearTimeout(eng1TimerRef.current);
      if (eng2TimerRef.current) clearTimeout(eng2TimerRef.current);
    };
  }, []);

  const handleWingToggle = (targetState?: boolean) => {
    const nextState = targetState !== undefined ? targetState : !isWingSwitchOn;
    if (nextState === isWingSwitchOn) return;
    setWingAntiIce(nextState);
    setWingInTransit(true);
    if (wingTimerRef.current) clearTimeout(wingTimerRef.current);
    wingTimerRef.current = setTimeout(() => {
      setWingInTransit(false);
    }, 1200);
  };

  const handleEng1Toggle = (targetState?: boolean) => {
    const nextState = targetState !== undefined ? targetState : !isEng1SwitchOn;
    if (nextState === isEng1SwitchOn) return;
    setEng1AntiIce(nextState);
    setEng1InTransit(true);
    if (eng1TimerRef.current) clearTimeout(eng1TimerRef.current);
    eng1TimerRef.current = setTimeout(() => {
      setEng1InTransit(false);
    }, 1000);
  };

  const handleEng2Toggle = (targetState?: boolean) => {
    const nextState = targetState !== undefined ? targetState : !isEng2SwitchOn;
    if (nextState === isEng2SwitchOn) return;
    setEng2AntiIce(nextState);
    setEng2InTransit(true);
    if (eng2TimerRef.current) clearTimeout(eng2TimerRef.current);
    eng2TimerRef.current = setTimeout(() => {
      setEng2InTransit(false);
    }, 1000);
  };

  // Boeing FCOM 3.10.4 & 3.10.5:
  // - bright blue: valve in transit OR valve position disagrees with switch position
  // - dim blue: switch ON and valve OPEN
  // - extinguished: switch OFF and valve CLOSED
  const getValveLightClass = (
    inTransit: boolean,
    switchOn: boolean,
    valveOpen: boolean,
  ) => {
    if (inTransit || switchOn !== valveOpen) {
      return "blue bright";
    }
    if (switchOn && valveOpen) {
      return "blue dim";
    }
    return "";
  };

  return (
    <section
      className="aircraft-panel wing-anti-ice-panel"
      aria-label="Wing and engine anti-ice panel"
    >
      <div className="wai-grid">
        {/* Subtle center divider line */}
        <div className="wai-divider" />

        {/* Left Column: Wing Anti-Ice */}
        <div className="wai-column">
          <div className="wai-annunciators-wing-container">
            <div className="wai-annunciators-wing">
              <div
                className={`wai-annunciator ${getValveLightClass(wingInTransit, isWingSwitchOn, isWingLValveOpen)}`}
                title="L VALVE OPEN (Azul brillante en tránsito/desacuerdo, azul tenue abierta)"
              >
                <span>L VALVE</span>
                <span>OPEN</span>
              </div>
              <div
                className={`wai-annunciator ${getValveLightClass(wingInTransit, isWingSwitchOn, isWingRValveOpen)}`}
                title="R VALVE OPEN (Azul brillante en tránsito/desacuerdo, azul tenue abierta)"
              >
                <span>R VALVE</span>
                <span>OPEN</span>
              </div>
            </div>
          </div>

          <div className="wai-subplate">
            <span className="wai-subplate-title">WING ANTI - ICE</span>
            <span
              className="wai-pos-label cursor-pointer"
              onClick={() => handleWingToggle(false)}
            >
              OFF
            </span>
            <div className="wai-switches-row">
              <AircraftToggleSwitch
                position={isWingSwitchOn ? "DOWN" : "UP"}
                circleColor="black"
                onClick={() => handleWingToggle()}
                onWheelStep={(d) => handleWingToggle(d > 0)}
                size={38}
              />
            </div>
            <span
              className="wai-pos-label cursor-pointer"
              onClick={() => handleWingToggle(true)}
            >
              ON
            </span>
          </div>
        </div>

        {/* Right Column: Engine Anti-Ice */}
        <div className="wai-column">
          <div className="wai-annunciators-eng">
            {/* Top row: Amber COWL ANTI-ICE */}
            <div
              className={`wai-annunciator amber ${cowlOverpressure.eng1 ? "lit" : ""}`}
              onClick={() => toggleCowlOverpressure("eng1")}
              title="ENG 1 COWL ANTI-ICE (Clic para simular sobrepresión)"
            >
              <span>COWL</span>
              <span>ANTI-ICE</span>
            </div>
            <div
              className={`wai-annunciator amber ${cowlOverpressure.eng2 ? "lit" : ""}`}
              onClick={() => toggleCowlOverpressure("eng2")}
              title="ENG 2 COWL ANTI-ICE (Clic para simular sobrepresión)"
            >
              <span>COWL</span>
              <span>ANTI-ICE</span>
            </div>

            {/* Bottom row: Blue COWL VALVE OPEN */}
            <div
              className={`wai-annunciator ${getValveLightClass(eng1InTransit, isEng1SwitchOn, isEng1ValveOpen)}`}
              title="ENG 1 COWL VALVE OPEN (Azul brillante en tránsito/desacuerdo, tenue abierta)"
            >
              <span>COWL VALVE</span>
              <span>OPEN</span>
            </div>
            <div
              className={`wai-annunciator ${getValveLightClass(eng2InTransit, isEng2SwitchOn, isEng2ValveOpen)}`}
              title="ENG 2 COWL VALVE OPEN (Azul brillante en tránsito/desacuerdo, tenue abierta)"
            >
              <span>COWL VALVE</span>
              <span>OPEN</span>
            </div>
          </div>

          <div className="wai-subplate">
            <span className="wai-subplate-title">ENG ANTI - ICE</span>
            <span
              className="wai-pos-label cursor-pointer"
              onClick={() => {
                handleEng1Toggle(false);
                handleEng2Toggle(false);
              }}
            >
              OFF
            </span>
            <div className="wai-switches-row">
              <div className="wai-switch-cell">
                <AircraftToggleSwitch
                  position={isEng1SwitchOn ? "DOWN" : "UP"}
                  circleColor="black"
                  onClick={() => handleEng1Toggle()}
                  onWheelStep={(d) => handleEng1Toggle(d > 0)}
                  size={38}
                />
                <span className="wai-switch-num">
                  1
                </span>
              </div>
              <div className="wai-switch-cell">
                <AircraftToggleSwitch
                  position={isEng2SwitchOn ? "DOWN" : "UP"}
                  circleColor="black"
                  onClick={() => handleEng2Toggle()}
                  onWheelStep={(d) => handleEng2Toggle(d > 0)}
                  size={38}
                />
                <span className="wai-switch-num">
                  2
                </span>
              </div>
            </div>
            <span
              className="wai-pos-label cursor-pointer"
              onClick={() => {
                handleEng1Toggle(true);
                handleEng2Toggle(true);
              }}
            >
              ON
            </span>
          </div>
        </div>
      </div>

      {/* 4 Corner Screws */}
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}
