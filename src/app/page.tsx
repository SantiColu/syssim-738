import { EventLog } from "./components/event-log";
import { PneumaticPanel } from "./components/pneumatic-panel";
import { PneumaticSchematic } from "./components/pneumatic-schematic";
import { SimulatorHeader } from "./components/simulator-header";

export default function Home() {
  return (
    <main className="simulator-shell">
      <SimulatorHeader />
      <div className="workspace-labels" aria-hidden="true">
        <span>COCKPIT</span>
        <span>
          <b>P5</b> FORWARD OVERHEAD
        </span>
        <span>SYSTEM</span>
        <span>
          <b>NORMAL</b> FLIGHT OPERATION
        </span>
      </div>
      <section className="simulator-workspace">
        <PneumaticPanel />
        <PneumaticSchematic />
      </section>
      <EventLog />
    </main>
  );
}
