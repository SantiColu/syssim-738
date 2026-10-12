"use client";

import { useRef, useState, type PointerEvent } from "react";
import { useOutflowValve } from "../../simulation/ecs/outflow-valve-store";
import type { OutflowSwitch, PressurizationMode } from "../../simulation/ecs/outflow-valve";
import {
  Screw,
  Placard,
  ValvePositionIndicator,
} from "./panel-parts";
import {
  DigitalDisplay,
} from "./digital-display";
import {
  ScallopedKnob,
  PointerKnob,
} from "./knobs";
import {
  AircraftToggleSwitch,
} from "./switches";

export function LandingScaleTable() {
  return (
    <svg
      viewBox="0 0 326 46"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        userSelect: "none",
      }}
      aria-label="Cabin and Flight Altitude schedule table"
    >
      {/* Black Background Card */}
      <rect x="0" y="0" width="326" height="46" rx="4" fill="#000000" />

      {/* Main Continuous Horizontal Line (from left edge up to vertical line 6) */}
      <line x1="6" y1="22" x2="286" y2="22" stroke="white" strokeWidth="1.6" />

      {/* Vertical Lines */}
      {/* 1. After CAB ALT / FLT ALT (full height) */}
      <line x1="56" y1="6" x2="56" y2="40" stroke="white" strokeWidth="1.6" />
      {/* 2. After LAND ALT (tick down to y = 28) */}
      <line x1="104" y1="6" x2="104" y2="28" stroke="white" strokeWidth="1.6" />
      {/* 3. Between 2000 & 4000 */}
      <line x1="150" y1="6" x2="150" y2="28" stroke="white" strokeWidth="1.6" />
      {/* 4. Between 4000 & 6000 */}
      <line x1="195" y1="6" x2="195" y2="28" stroke="white" strokeWidth="1.6" />
      {/* 5. Between 6000 & 8000 */}
      <line x1="240" y1="6" x2="240" y2="28" stroke="white" strokeWidth="1.6" />
      {/* 6. After 8000 */}
      <line x1="286" y1="6" x2="286" y2="28" stroke="white" strokeWidth="1.6" />

      {/* Text Elements */}
      <g
        fill="white"
        fontFamily="monospace"
        fontWeight="bold"
        fontSize="9.5"
        textAnchor="middle"
      >
        {/* Top Row: Centered in cells between vertical lines */}
        <text x="31" y="16">
          CAB ALT
        </text>
        <text x="80" y="16">
          LAND ALT
        </text>
        <text x="127" y="16">
          2000
        </text>
        <text x="172.5" y="16">
          4000
        </text>
        <text x="217.5" y="16">
          6000
        </text>
        <text x="263" y="16">
          8000
        </text>

        {/* Bottom Row: FLT ALT on left, and Flight Levels centered directly under the vertical lines */}
        <text x="31" y="37">
          FLT ALT
        </text>
        <text x="104" y="37">
          &lt;FL160
        </text>
        <text x="150" y="37">
          FL220
        </text>
        <text x="195" y="37">
          FL260
        </text>
        <text x="240" y="37">
          FL320
        </text>
        <text x="286" y="37">
          FL410
        </text>
      </g>
    </svg>
  );
}

const MODES: PressurizationMode[] = ["AUTO", "ALTN", "MAN"];
/** How long a mouse wheel step holds the spring-loaded valve switch over. */
const VALVE_SWITCH_WHEEL_HOLD_MS = 300;

export function CabinAltitudeControlPanel() {
  const { mode: currentMode, switchPosition: valvePos, position: valvePosition, setMode, setSwitch } = useOutflowValve();
  const modeIndex = MODES.indexOf(currentMode);
  const wheelRelease = useRef<number | null>(null);
  const [fltAlt, setFltAlt] = useState<number>(10000);
  const [landAlt, setLandAlt] = useState<number>(500);
  const [fltKnobAngle, setFltKnobAngle] = useState<number>(0);
  const [landKnobAngle, setLandKnobAngle] = useState<number>(0);

  const modeAngles = [-35, 0, 35];

  const handleModeStep = (direction: number) => {
    setMode(MODES[direction > 0 ? Math.min(2, modeIndex + 1) : Math.max(0, modeIndex - 1)]);
  };

  const handleModeClick = () => {
    setMode(MODES[(modeIndex + 1) % 3]);
  };

  const handleFltWheel = (direction: number) => {
    // direction > 0 (scroll up) -> +500 ft
    // direction < 0 (scroll down) -> -500 ft
    setFltAlt((prev) => Math.max(0, Math.min(42000, prev + direction * 500)));
    setFltKnobAngle((prev) => prev + direction * 20);
  };

  const handleLandWheel = (direction: number) => {
    // direction > 0 (scroll up) -> +50 ft
    // direction < 0 (scroll down) -> -50 ft
    setLandAlt((prev) =>
      Math.max(-1000, Math.min(14000, prev + direction * 50)),
    );
    setLandKnobAngle((prev) => prev + direction * 20);
  };

  // The valve switch is spring-loaded to the centre: it stays over only while
  // held (pointer down), then springs back to OFF.
  const holdValveSwitch = (position: OutflowSwitch) => (e: PointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSwitch(position);
  };
  const releaseValveSwitch = () => setSwitch("OFF");
  const valveReleaseHandlers = {
    onPointerUp: releaseValveSwitch,
    onPointerCancel: releaseValveSwitch,
    onLostPointerCapture: releaseValveSwitch,
  };
  // Pressing the switch's left half pushes it to CLOSE, the right half to OPEN
  const holdValveSwitchBySide = (e: PointerEvent<HTMLElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    holdValveSwitch(e.clientX < box.left + box.width / 2 ? "CLOSE" : "OPEN")(e);
  };

  const handleValveWheel = (direction: number) => {
    // direction < 0 is scroll up -> CLOSE (UP)
    // direction > 0 is scroll down -> OPEN (DOWN)
    setSwitch(direction < 0 ? "CLOSE" : "OPEN");
    if (wheelRelease.current !== null) window.clearTimeout(wheelRelease.current);
    wheelRelease.current = window.setTimeout(releaseValveSwitch, VALVE_SWITCH_WHEEL_HOLD_MS);
  };

  // Needle from CLOSE (-1) to OPEN (1)
  const needlePosition = valvePosition * 2 - 1;

  return (
    <section
      className="aircraft-panel cabin-control-panel"
      aria-label="Cabin altitude control panel"
    >
      <div className="cabin-control-panel-content">
        <div className="mode-lights">
          <Placard>
            AUTO
            <br />
            FAIL
          </Placard>
          <Placard>
            OFF SCHED
            <br />
            DESCENT
          </Placard>
          <Placard color={currentMode === "ALTN" ? "green" : undefined}>
            ALTN
          </Placard>
          <Placard color={currentMode === "MAN" ? "green" : undefined}>
            MANUAL
          </Placard>
        </div>
        <div className="control-divider" />
        <div className="control-horizontal" />
        <span className="auto-title">AUTO</span>
        <span className="manual-title">MANUAL</span>
        <div className="flight-display">
          <DigitalDisplay value={fltAlt} />
          <label>FLT ALT</label>
          <ScallopedKnob
            angle={fltKnobAngle}
            onWheelStep={handleFltWheel}
            onClick={() => handleFltWheel(1)}
            size={52}
          />
        </div>
        <div className="landing-display">
          <DigitalDisplay value={landAlt} />
          <label>LAND ALT</label>
          <ScallopedKnob
            ring
            angle={landKnobAngle}
            onWheelStep={handleLandWheel}
            onClick={() => handleLandWheel(1)}
            size={52}
          />
        </div>
        <div className="valve-meter">
          <ValvePositionIndicator position={needlePosition} />
          <span>VALVE</span>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "48px",
              marginTop: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Vertical C L O S E on the left */}
            <div
              style={{
                position: "absolute",
                left: "-12px",
                display: "flex",
                flexDirection: "column",
                lineHeight: "1.1",
                fontSize: "12px",
                fontWeight: "bold",
                color: "white",
                textAlign: "center",
                cursor: "pointer",
                touchAction: "none",
              }}
              onPointerDown={holdValveSwitch("CLOSE")}
              {...valveReleaseHandlers}
            >
              <span>C</span>
              <span>L</span>
              <span>O</span>
              <span>S</span>
              <span>E</span>
            </div>

            {/* Horizontal toggle switch, spring-loaded to the centre */}
            <div
              style={{ display: "inline-flex", touchAction: "none" }}
              onPointerDown={holdValveSwitchBySide}
              {...valveReleaseHandlers}
            >
              <AircraftToggleSwitch
                position={
                  valvePos === "CLOSE"
                    ? "UP"
                    : valvePos === "OPEN"
                      ? "DOWN"
                      : "CENTER"
                }
                orientation="horizontal"
                circleColor="light"
                onWheelStep={handleValveWheel}
                size={48}
              />
            </div>

            {/* Vertical O P E N on the right */}
            <div
              style={{
                position: "absolute",
                right: "-12px",
                display: "flex",
                flexDirection: "column",
                lineHeight: "1.1",
                fontSize: "12px",
                fontWeight: "bold",
                color: "white",
                textAlign: "center",
                cursor: "pointer",
                touchAction: "none",
              }}
              onPointerDown={holdValveSwitch("OPEN")}
              {...valveReleaseHandlers}
            >
              <span>O</span>
              <span>P</span>
              <span>E</span>
              <span>N</span>
            </div>
          </div>
        </div>
        <div
          className="alt-mode"
          style={{
            position: "absolute",
            top: "258px",
            right: "22px",
            textAlign: "center",
          }}
        >
          {/* Mode Labels */}
          <div
            style={{
              position: "relative",
              width: "124px",
              height: "38px",
              margin: "0 auto 0 auto",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                top: "0px",
                fontWeight: "bold",
                fontSize: "14px",
                color: "white",
              }}
            >
              ALTN
            </span>
            <span
              style={{
                position: "absolute",
                left: "8px",
                top: "16px",
                fontWeight: "bold",
                fontSize: "14px",
                color: "white",
              }}
            >
              AUTO
            </span>
            <span
              style={{
                position: "absolute",
                right: "8px",
                top: "16px",
                fontWeight: "bold",
                fontSize: "14px",
                color: "white",
              }}
            >
              MAN
            </span>
          </div>
          {/* Mode Selector Knob with 3 Alignment Tick Lines */}
          <div
            style={{
              position: "relative",
              width: "90px",
              height: "90px",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                overflow: "visible",
              }}
              viewBox="0 0 90 90"
            >
              {/* Line to AUTO (-35 deg from top center) */}
              <line
                x1="25"
                y1="16"
                x2="20"
                y2="7"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              {/* Line to ALTN (0 deg / vertical) */}
              <line
                x1="45"
                y1="11"
                x2="45"
                y2="2"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              {/* Line to MAN (+35 deg from top center) */}
              <line
                x1="65"
                y1="16"
                x2="70"
                y2="7"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
            <PointerKnob
              angle={modeAngles[modeIndex]}
              onWheelStep={handleModeStep}
              onClick={handleModeClick}
              size={90}
            />
          </div>
        </div>
        <div className="landing-scale">
          <LandingScaleTable />
        </div>
        <Screw className="s1" />
        <Screw className="s2" />
        <Screw className="s3" />
        <Screw className="s4" />
      </div>
    </section>
  );
}
