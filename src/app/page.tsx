import { CockpitView } from "./components/cockpit-view";
import { PneumaticSchematic } from "./components/pneumatic-schematic";
import { SimulatorHeader } from "./components/simulator-header";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-sim-bg bg-[linear-gradient(var(--color-sim-grid)_1px,transparent_1px),linear-gradient(90deg,var(--color-sim-grid)_1px,transparent_1px)] bg-size-[20px_20px] font-sim-sans text-[10px]/[1.25] tracking-[0.045em]">
      <SimulatorHeader />
      <div
        className="grid h-7 grid-cols-[44%_56%] items-center border-b border-sim-border-subtle bg-sim-bg text-sim-text-secondary max-[900px]:hidden [&>span]:px-2.5"
        aria-hidden="true"
      >
        <span>COCKPIT</span>
        <span>SYSTEM</span>
      </div>
      <section className="grid h-[calc(100vh-105px)] grid-cols-[44%_56%] border-b border-sim-border-subtle max-[900px]:h-auto max-[900px]:grid-cols-1">
        <CockpitView />
        <PneumaticSchematic />
      </section>
    </main>
  );
}
