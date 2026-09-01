const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="mr-1.75 text-[#b74332]">{children}</span>
);
export function SimulatorHeader() {
  return (
    <header className="h-19.25 border-b border-[#333936] bg-[#0f1311]">
      <div className="flex h-9 gap-3.75 border-b border-[#323834]">
        <div className="flex items-center gap-2 pl-3.5 text-[#d8dbd9] max-[560px]:pl-1.75">
          <span>
            <strong className="block text-[11px] tracking-[0.13em] max-[560px]:text-[8px]">
              AIRPLANE SYSTEM SIMULATOR
            </strong>
            <small className="block text-[8px] text-[#69716d]">
              B737-800 NG · CFM56-7B26
            </small>
          </span>
        </div>
        <nav
          className="flex h-9 max-[900px]:hidden [&>button]:border-0 [&>button]:border-r [&>button]:border-[#252b28] [&>button]:bg-transparent [&>button]:px-6.75 [&>button]:text-[9px] [&>button]:tracking-[0.12em] [&>button]:text-[#59615d]"
          aria-label="Secciones"
        >
          <button className="border-b! border-b-sim-accent! bg-[#171b19]! text-[#c9cdca]!">
            PNEUMATIC
          </button>
          <button>FUEL</button>
          <button>NAVCOM</button>
        </nav>
      </div>
      <div className="flex h-10.25 items-center [&>button]:h-8.5 [&>button]:border-0 [&>button]:border-r [&>button]:border-[#252b28] [&>button]:bg-transparent [&>button]:px-3.25 [&>button]:text-[9px] [&>button]:tracking-[0.12em] [&>button]:text-[#59615d]">
        <button className="ml-2.5 max-[900px]:hidden">
          <Icon>△</Icon> INSERT FAILURE
        </button>
      </div>
    </header>
  );
}
