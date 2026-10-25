"use client";

import { useFuel } from "../../simulation/fuel/fuel-context";
import type { TankId } from "../../simulation/fuel/fuel-system";

/** Tonnes with two decimals, like the FUEL QTY-KGS X 1000 readout. */
const tonnes = (kg: number) => (Math.max(0, kg) / 1000).toFixed(2);

const TANK_NAME: Record<TankId, string> = { tank1: "tanque 1", center: "tanque central", tank2: "tanque 2" };

/**
 * Upper display unit, fuel quantity only (FCOM 12.10.3-6, YW064–YW164):
 * digital quantity per tank and TOTAL, with the amber LOW, CONFIG and IMBAL
 * alerts. The rest of the engine display is not simulated, so the screen is
 * otherwise dark.
 */
export function UpperDisplayFuel() {
  const { indications } = useFuel();
  const { quantityKg, totalKg, lowAlert, configAlert, imbalAlert } = indications;

  const amber: Record<TankId, boolean> = {
    tank1: lowAlert.tank1 || imbalAlert === "tank1",
    center: configAlert,
    tank2: lowAlert.tank2 || imbalAlert === "tank2",
  };
  const alertText: Record<TankId, string | null> = {
    tank1: lowAlert.tank1 ? "LOW" : imbalAlert === "tank1" ? "IMBAL" : null,
    center: configAlert ? "CONFIG" : null,
    tank2: lowAlert.tank2 ? "LOW" : imbalAlert === "tank2" ? "IMBAL" : null,
  };
  const describe = (tank: TankId) =>
    `${TANK_NAME[tank]}: ${Math.round(quantityKg[tank])} kg${alertText[tank] ? ` · ${alertText[tank]}` : ""}`;

  return (
    <section className="upper-du" aria-label="Upper display unit, fuel quantity">
      <div
        className="du-fuel"
        role="status"
        title={`Cantidad de combustible utilizable (FQIS)
${describe("tank1")}
${describe("center")}
${describe("tank2")}
LOW: < 453 kg (hasta 567 kg) · CONFIG: motor andando, central > 726 kg y ambas bombas del central en OFF · IMBAL: diferencia > 453 kg (hasta 91 kg)`}
      >
        <span className="du-fuel-title">FUEL QTY-KGS X 1000</span>
        <div className="du-fuel-tanks">
          {(["tank1", "center", "tank2"] as const).map((tank) => (
            <div key={tank} className={`du-fuel-tank${amber[tank] ? " amber" : ""}`}>
              <span className="du-fuel-value">{tonnes(quantityKg[tank])}</span>
              <span className="du-fuel-alert">{alertText[tank] ?? ""}</span>
            </div>
          ))}
        </div>
        <div className="du-fuel-total">
          <span className="du-fuel-total-label">TOTAL</span>
          <span className="du-fuel-total-value">{(Math.max(0, totalKg) / 1000).toFixed(1)}</span>
        </div>
      </div>
    </section>
  );
}
