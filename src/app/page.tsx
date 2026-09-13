import { CockpitView } from "./components/cockpit-view";
import { SimulatorHeader } from "./components/simulator-header";
import { SystemPanel } from "./components/system-panel";
import { PneumaticProvider } from "./simulation/pneumatic/pneumatic-context";

export default function Home() {
  return (
    <PneumaticProvider>
      <main className="flex h-dvh min-h-screen flex-col overflow-y-auto bg-sim-bg bg-[linear-gradient(var(--color-sim-grid)_1px,transparent_1px),linear-gradient(90deg,var(--color-sim-grid)_1px,transparent_1px)] bg-size-[20px_20px] font-sim-sans text-[10px]/[1.25] tracking-[0.045em] lg:landscape:overflow-hidden">
        <SimulatorHeader />
        <section className="flex flex-1 min-h-0 flex-col border-b border-sim-border-subtle lg:landscape:grid lg:landscape:grid-cols-[44%_56%]">
          {/* En vertical: SYSTEM arriba (order-1). En horizontal: derecha (order-2) */}
          <div
            id="system-section"
            className="order-1 flex flex-1 flex-col min-h-[380px] lg:portrait:min-h-0 lg:landscape:order-2 lg:landscape:h-full"
          >
            <div className="flex h-7 shrink-0 items-center border-b border-sim-border-subtle bg-sim-bg px-2.5 text-sim-text-secondary">
              <span>SYSTEM</span>
            </div>
            <div className="relative flex-1 min-h-0">
              <SystemPanel />
            </div>
          </div>

          {/* En vertical: COCKPIT abajo (order-2). En horizontal: izquierda (order-1) */}
          <div
            id="cockpit-section"
            className="order-2 flex flex-1 flex-col min-h-[380px] lg:portrait:min-h-0 lg:landscape:order-1 lg:landscape:h-full lg:landscape:border-r border-sim-border-subtle"
          >
            <div className="flex h-7 shrink-0 items-center border-y border-sim-border-subtle bg-sim-bg px-2.5 text-sim-text-secondary lg:landscape:border-t-0">
              <span>COCKPIT</span>
            </div>
            <div className="relative flex-1 min-h-0">
              <CockpitView />
            </div>
          </div>
        </section>
      </main>
    </PneumaticProvider>
  );
}
