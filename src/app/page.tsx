import { CockpitPanelSelector } from "./components/cockpit-panel-selector";
import { PneumaticSchematic } from "./components/pneumatic-schematic";
import { SimulatorHeader } from "./components/simulator-header";

export default function Home() {
  return (
    <main className="simulator-shell">
      <SimulatorHeader />
      <div className="workspace-labels" aria-hidden="true">
        <span>COCKPIT</span>
        <span>SYSTEM</span>
      </div>
      <section className="simulator-workspace">
        <CockpitPanelSelector />
        <PneumaticSchematic />
      </section>
    </main>
  );
}
