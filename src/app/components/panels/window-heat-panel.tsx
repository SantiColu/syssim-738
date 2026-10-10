"use client";

import {
  usePneumatic,
  type WindowHeatSwitches,
} from "../../simulation/pneumatic/pneumatic-context";
import {
  Screw,
} from "./panel-parts";
import {
  AircraftToggleSwitch,
} from "./switches";

export function WindowHeatPanel() {
  const pneumatic = usePneumatic();

  // Read window heat switches, overheats, and test status from pneumatic context
  const switches = pneumatic.switches.windowHeat;
  const overheats = pneumatic.windowOverheat;
  const testPos = pneumatic.windowHeatTest;

  // Probe Heat state from pneumatic simulation
  const {
    probeHeatSwitches,
    setProbeHeatSwitch,
    isProbeHeated,
  } = pneumatic;
  const probeA = probeHeatSwitches.a;
  const probeB = probeHeatSwitches.b;

  // Window Heat test overrides
  const isOvhtTesting = testPos === "OVHT";
  const isPwrTesting = testPos === "PWR TEST";

  // Overheat lights (amber): illuminated on genuine overheat or OVHT confidence test
  const isSideLOvhtLit = overheats.sideL || isOvhtTesting;
  const isFwdLOvhtLit = overheats.fwdL || isOvhtTesting;
  const isFwdROvhtLit = overheats.fwdR || isOvhtTesting;
  const isSideROvhtLit = overheats.sideR || isOvhtTesting;

  // ON lights (green): illuminated when window heat applied and not overheated, or during PWR TEST
  const isSideLOnLit = isPwrTesting || (switches.sideL && !isSideLOvhtLit);
  const isFwdLOnLit = isPwrTesting || (switches.fwdL && !isFwdLOvhtLit);
  const isFwdROnLit = isPwrTesting || (switches.fwdR && !isFwdROvhtLit);
  const isSideROnLit = isPwrTesting || (switches.sideR && !isSideROvhtLit);

  const toggleWindowSwitch = (key: keyof WindowHeatSwitches) => {
    pneumatic.toggleWindowHeat(key);
  };

  const setWindowSwitch = (key: keyof WindowHeatSwitches, pos: "OFF" | "ON") => {
    pneumatic.setWindowHeat(key, pos === "ON");
  };

  const triggerMomentaryTest = (pos: "OVHT" | "PWR TEST") => {
    pneumatic.triggerWindowHeatTest(pos);
  };

  const handleTestPointerDown = (pos: "OVHT" | "PWR TEST") => {
    pneumatic.setWindowHeatTest(pos);
  };

  const handleTestPointerUp = () => {
    pneumatic.setWindowHeatTest("CENTER");
  };

  return (
    <section
      className="aircraft-panel window-heat-panel"
      aria-label="Window heat and probe heat panel"
    >
      {/* Top 4 pairs of annunciators: OVERHEAT (amber) / ON (green) */}
      <div className="wh-annunciator-grid">
        {/* Column 1: L SIDE */}
        <div className="wh-annunciator-pair">
          <div
            className={`wh-annunciator amber ${isSideLOvhtLit ? "lit" : ""}`}
            title="L SIDE OVERHEAT"
          >
            OVERHEAT
          </div>
          <div
            className={`wh-annunciator green ${isSideLOnLit ? "lit" : ""}`}
            title="L SIDE ON"
          >
            ON
          </div>
        </div>

        {/* Column 2: L FWD */}
        <div className="wh-annunciator-pair">
          <div
            className={`wh-annunciator amber ${isFwdLOvhtLit ? "lit" : ""}`}
            title="L FWD OVERHEAT"
          >
            OVERHEAT
          </div>
          <div
            className={`wh-annunciator green ${isFwdLOnLit ? "lit" : ""}`}
            title="L FWD ON"
          >
            ON
          </div>
        </div>

        {/* Column 3: R FWD */}
        <div className="wh-annunciator-pair">
          <div
            className={`wh-annunciator amber ${isFwdROvhtLit ? "lit" : ""}`}
            title="R FWD OVERHEAT"
          >
            OVERHEAT
          </div>
          <div
            className={`wh-annunciator green ${isFwdROnLit ? "lit" : ""}`}
            title="R FWD ON"
          >
            ON
          </div>
        </div>

        {/* Column 4: R SIDE */}
        <div className="wh-annunciator-pair">
          <div
            className={`wh-annunciator amber ${isSideROvhtLit ? "lit" : ""}`}
            title="R SIDE OVERHEAT"
          >
            OVERHEAT
          </div>
          <div
            className={`wh-annunciator green ${isSideROnLit ? "lit" : ""}`}
            title="R SIDE ON"
          >
            ON
          </div>
        </div>
      </div>

      {/* Middle Subplate: Window Heat Controls */}
      <div className="wh-subplate">
        <div className="wh-title-row">
          <span>L</span>
          <span>WINDOW HEAT</span>
          <span>R</span>
        </div>

        <div className="wh-switches-row">
          {/* L SIDE switch */}
          <div className="wh-switch-cell">
            <span className="switch-sublabel">SIDE</span>
            <div className="relative flex items-center justify-center">
              <AircraftToggleSwitch
                position={switches.sideL ? "DOWN" : "UP"}
                circleColor="black"
                onClick={() => toggleWindowSwitch("sideL")}
                onWheelStep={(d) => setWindowSwitch("sideL", d < 0 ? "OFF" : "ON")}
                size={38}
              />
              <div className="pos-labels">
                <span
                  className="cursor-pointer"
                  onClick={() => setWindowSwitch("sideL", "OFF")}
                >
                  OFF
                </span>
                <span
                  className="cursor-pointer"
                  onClick={() => setWindowSwitch("sideL", "ON")}
                >
                  ON
                </span>
              </div>
            </div>
          </div>

          {/* L FWD switch */}
          <div className="wh-switch-cell">
            <span className="switch-sublabel">FWD</span>
            <div className="relative flex items-center justify-center">
              <AircraftToggleSwitch
                position={switches.fwdL ? "DOWN" : "UP"}
                circleColor="black"
                onClick={() => toggleWindowSwitch("fwdL")}
                onWheelStep={(d) => setWindowSwitch("fwdL", d < 0 ? "OFF" : "ON")}
                size={38}
              />
              <div className="pos-labels">
                <span
                  className="cursor-pointer"
                  onClick={() => setWindowSwitch("fwdL", "OFF")}
                >
                  OFF
                </span>
                <span
                  className="cursor-pointer"
                  onClick={() => setWindowSwitch("fwdL", "ON")}
                >
                  ON
                </span>
              </div>
            </div>
          </div>

          {/* Center TEST switch (spring-loaded to neutral) */}
          <div className="wh-switch-cell" style={{ width: "58px" }}>
            <span
              className="switch-sublabel cursor-pointer select-none hover:text-sim-accent"
              onPointerDown={() => handleTestPointerDown("OVHT")}
              onPointerUp={handleTestPointerUp}
              onClick={() => triggerMomentaryTest("OVHT")}
              title="Test Overheat (mantener o clic)"
            >
              OVHT
            </span>
            <div className="relative flex items-center justify-center">
              <AircraftToggleSwitch
                position={testPos === "OVHT" ? "UP" : testPos === "PWR TEST" ? "DOWN" : "CENTER"}
                circleColor="black"
                onClick={() =>
                  triggerMomentaryTest(testPos === "OVHT" ? "PWR TEST" : "OVHT")
                }
                onWheelStep={(d) =>
                  triggerMomentaryTest(d < 0 ? "OVHT" : "PWR TEST")
                }
                size={38}
              />
            </div>
            <span
              className="switch-sublabel cursor-pointer select-none hover:text-sim-accent whitespace-nowrap"
              style={{ marginTop: "1px" }}
              onPointerDown={() => handleTestPointerDown("PWR TEST")}
              onPointerUp={handleTestPointerUp}
              onClick={() => triggerMomentaryTest("PWR TEST")}
              title="Power Confidence Test (mantener o clic)"
            >
              PWR TEST
            </span>
          </div>

          {/* R FWD switch */}
          <div className="wh-switch-cell">
            <span className="switch-sublabel">FWD</span>
            <div className="relative flex items-center justify-center">
              <AircraftToggleSwitch
                position={switches.fwdR ? "DOWN" : "UP"}
                circleColor="black"
                onClick={() => toggleWindowSwitch("fwdR")}
                onWheelStep={(d) => setWindowSwitch("fwdR", d < 0 ? "OFF" : "ON")}
                size={38}
              />
              <div className="pos-labels">
                <span
                  className="cursor-pointer"
                  onClick={() => setWindowSwitch("fwdR", "OFF")}
                >
                  OFF
                </span>
                <span
                  className="cursor-pointer"
                  onClick={() => setWindowSwitch("fwdR", "ON")}
                >
                  ON
                </span>
              </div>
            </div>
          </div>

          {/* R SIDE switch */}
          <div className="wh-switch-cell">
            <span className="switch-sublabel">SIDE</span>
            <div className="relative flex items-center justify-center">
              <AircraftToggleSwitch
                position={switches.sideR ? "DOWN" : "UP"}
                circleColor="black"
                onClick={() => toggleWindowSwitch("sideR")}
                onWheelStep={(d) => setWindowSwitch("sideR", d < 0 ? "OFF" : "ON")}
                size={38}
              />
              <div className="pos-labels">
                <span
                  className="cursor-pointer"
                  onClick={() => setWindowSwitch("sideR", "OFF")}
                >
                  OFF
                </span>
                <span
                  className="cursor-pointer"
                  onClick={() => setWindowSwitch("sideR", "ON")}
                >
                  ON
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section: Probe Heat */}
      <div className="probe-heat-section">
        {/* Left Column: System A Probes */}
        <div className="probe-annunciator-col">
          <div
            className={`probe-annunciator amber select-none ${!isProbeHeated("captPitot") ? "lit" : ""}`}
            title="CAPT PITOT"
          >
            <span>CAPT</span>
            <span>PITOT</span>
          </div>
          <div
            className={`probe-annunciator amber select-none ${!isProbeHeated("lElevPitot") ? "lit" : ""}`}
            title="L ELEV PITOT"
          >
            <span>L ELEV</span>
            <span>PITOT</span>
          </div>
          <div
            className={`probe-annunciator amber select-none ${!isProbeHeated("lAlphaVane") ? "lit" : ""}`}
            title="L ALPHA VANE"
          >
            <span>L ALPHA</span>
            <span>VANE</span>
          </div>
          <div
            className={`probe-annunciator amber select-none ${!isProbeHeated("tempProbe") ? "lit" : ""}`}
            title="TEMP PROBE"
          >
            <span>TEMP</span>
            <span>PROBE</span>
          </div>
        </div>

        {/* Center Plate: Probe Heat Controls */}
        <div className="probe-center-plate">
          <span className="probe-header">PROBE</span>
          <div className="probe-circuits">
            <span>A</span>
            <span>B</span>
          </div>
          <span className="probe-pos-label">AUTO</span>
          <div className="probe-switches-row">
            <div className="probe-switch-cell">
              <AircraftToggleSwitch
                position={probeA === "AUTO" ? "UP" : "DOWN"}
                circleColor="black"
                onClick={() => setProbeHeatSwitch("a", probeA === "AUTO" ? "ON" : "AUTO")}
                onWheelStep={(d) => setProbeHeatSwitch("a", d < 0 ? "AUTO" : "ON")}
                size={38}
              />
            </div>
            <div className="probe-switch-cell">
              <AircraftToggleSwitch
                position={probeB === "AUTO" ? "UP" : "DOWN"}
                circleColor="black"
                onClick={() => setProbeHeatSwitch("b", probeB === "AUTO" ? "ON" : "AUTO")}
                onWheelStep={(d) => setProbeHeatSwitch("b", d < 0 ? "AUTO" : "ON")}
                size={38}
              />
            </div>
          </div>
          <span className="probe-pos-label">ON</span>
          <span className="probe-footer">HEAT</span>
        </div>

        {/* Right Column: System B Probes */}
        <div className="probe-annunciator-col">
          <div
            className={`probe-annunciator amber select-none ${!isProbeHeated("foPitot") ? "lit" : ""}`}
            title="F/O PITOT"
          >
            <span>F/O</span>
            <span>PITOT</span>
          </div>
          <div
            className={`probe-annunciator amber select-none ${!isProbeHeated("rElevPitot") ? "lit" : ""}`}
            title="R ELEV PITOT"
          >
            <span>R ELEV</span>
            <span>PITOT</span>
          </div>
          <div
            className={`probe-annunciator amber select-none ${!isProbeHeated("rAlphaVane") ? "lit" : ""}`}
            title="R ALPHA VANE"
          >
            <span>R ALPHA</span>
            <span>VANE</span>
          </div>
          <div
            className={`probe-annunciator amber select-none ${!isProbeHeated("auxPitot") ? "lit" : ""}`}
            title="AUX PITOT"
          >
            <span>AUX</span>
            <span>PITOT</span>
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
