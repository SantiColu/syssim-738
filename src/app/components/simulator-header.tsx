"use client";

import { SYSTEM_TABS, useSystemTab } from "./system-tab-context";

const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="mr-1.75 text-sim-accent">{children}</span>
);
export function SimulatorHeader() {
  const { isActive, toggleTab } = useSystemTab();
  return (
    <header className="border-b border-sim-border-subtle bg-sim-bg">
      <div className="flex h-9 gap-3.75 border-b border-sim-border-subtle">
        <div className="flex items-center gap-2 pl-3.5 text-sim-text-strong max-[560px]:pl-1.75">
          <span>
            <strong className="block text-[11px] tracking-[0.13em] max-[560px]:text-[8px]">
              AIRPLANE SYSTEM SIMULATOR
            </strong>
            <small className="block text-[8px] text-sim-text-muted">
              B737-800 NG · CFM56-7B26
            </small>
          </span>
        </div>
        <nav
          className="flex h-9 max-[900px]:hidden [&>button]:border-0 [&>button]:border-r [&>button]:border-sim-border-subtle [&>button]:bg-transparent [&>button]:px-6.75 [&>button]:text-[9px] [&>button]:tracking-[0.1em] [&>button]:text-sim-text-muted"
          aria-label="Secciones"
        >
          {SYSTEM_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive(tab.id)}
              onClick={() => toggleTab(tab.id)}
              className={`cursor-pointer hover:text-sim-text-strong ${
                isActive(tab.id)
                  ? "border-b! border-b-sim-accent! bg-white/5! text-sim-text-strong!"
                  : ""
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="hidden min-[900px]:flex h-10.25 items-center [&>button]:h-8.5 [&>button]:border-0 [&>button]:border-r [&>button]:border-sim-border-subtle [&>button]:bg-transparent [&>button]:px-3.25 [&>button]:text-[9px] [&>button]:tracking-[0.1em] [&>button]:text-sim-text-muted">
        <button className="ml-2.5">
          <Icon>△</Icon> INSERT FAILURE
        </button>
      </div>
    </header>
  );
}
