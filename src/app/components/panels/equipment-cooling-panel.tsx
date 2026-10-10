"use client";

import { useState } from "react";
import {
  Screw,
  Placard,
} from "./panel-parts";
import {
  AircraftToggleSwitch,
} from "./switches";

export function EquipmentCoolingPanel() {
  const [supplyPos, setSupplyPos] = useState<"NORM" | "ALTN">("NORM");
  const [exhaustPos, setExhaustPos] = useState<"NORM" | "ALTN">("NORM");

  const handleSupplyWheel = (dir: number) => {
    setSupplyPos(dir < 0 ? "NORM" : "ALTN");
  };

  const handleExhaustWheel = (dir: number) => {
    setExhaustPos(dir < 0 ? "NORM" : "ALTN");
  };

  return (
    <section
      className="aircraft-panel equipment-cooling-panel"
      aria-label="Equipment cooling panel"
    >
      <div className="ap-chamfer top" />
      <div className="ap-chamfer bottom" />
      <h2>EQUIP COOLING</h2>
      <div className="ap-rule top-rule" />
      <div className="cooling-head">
        <span>SUPPLY</span>
        <span>EXHAUST</span>
      </div>
      <div className="cooling-norm">NORM</div>
      <div
        className="cooling-controls"
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginTop: "24px",
        }}
      >
        <AircraftToggleSwitch
          position={supplyPos === "NORM" ? "UP" : "DOWN"}
          onClick={() => setSupplyPos((p) => (p === "NORM" ? "ALTN" : "NORM"))}
          onWheelStep={handleSupplyWheel}
          size={54}
        />
        <AircraftToggleSwitch
          position={exhaustPos === "NORM" ? "UP" : "DOWN"}
          onClick={() => setExhaustPos((p) => (p === "NORM" ? "ALTN" : "NORM"))}
          onWheelStep={handleExhaustWheel}
          size={54}
        />
      </div>
      <div className="cooling-alt">ALTN</div>
      <div className="cooling-lights">
        <Placard color={supplyPos === "ALTN" ? "amber" : undefined}>
          OFF
        </Placard>
        <Placard color={exhaustPos === "ALTN" ? "amber" : undefined}>
          OFF
        </Placard>
      </div>
      <div className="ap-rule bottom-rule" />
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}
