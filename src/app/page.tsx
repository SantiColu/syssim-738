import { CockpitView } from "./components/cockpit-view";
import { PneumaticSchematic } from "./components/pneumatic-schematic";
import { SimulatorHeader } from "./components/simulator-header";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-sim-bg bg-[linear-gradient(#151a17_1px,transparent_1px),linear-gradient(90deg,#151a17_1px,transparent_1px)] bg-size-[20px_20px] font-sim-mono text-[10px]/[1.25] tracking-[0.08em]">
      <SimulatorHeader />
      <div
        className="grid h-7 grid-cols-[44%_56%] items-center border-b border-[#252b28] bg-[#0c100e] text-[#4f5753] max-[900px]:hidden [&>span]:px-2.5"
        aria-hidden="true"
      >
        <span>COCKPIT</span>
        <span>SYSTEM</span>
      </div>
      <section className="grid h-[calc(100vh-105px)] grid-cols-[44%_56%] border-b border-[#303633] max-[900px]:h-auto max-[900px]:grid-cols-1">
        <CockpitView />
        <PneumaticSchematic />
      </section>
    </main>
  );
}
