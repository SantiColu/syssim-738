function Valve({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle
        className="fill-sim-surface stroke-sim-text-muted"
        r="11"
        strokeWidth="1.5"
      />
      <path
        className="fill-none stroke-sim-text-strong"
        d="M-7 -7 7 7 M7 -7-7 7"
        strokeWidth="1.5"
      />
    </g>
  );
}

function Pack({ x, label }: { x: number; label: string }) {
  return (
    <g transform={`translate(${x} 407)`}>
      <rect
        className="fill-sim-surface stroke-sim-border"
        x="-41"
        y="-19"
        width="82"
        height="38"
      />
      <text
        className="fill-sim-text-strong text-[9px] font-bold tracking-[0.12em]"
        textAnchor="middle"
        y="-2"
      >
        {label} PACK
      </text>
      <text
        className="fill-sim-text-muted text-[7px] tracking-[0.08em]"
        textAnchor="middle"
        y="10"
      >
        FLOW CONTROL
      </text>
    </g>
  );
}

export function AircraftSideSchematic() {
  return (
    <div
      className="relative size-full overflow-hidden bg-sim-bg bg-[linear-gradient(var(--color-sim-grid)_1px,transparent_1px),linear-gradient(90deg,var(--color-sim-grid)_1px,transparent_1px)] bg-size-[20px_20px]"
      aria-label="Vista lateral y esquema provisional del avión"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-6 px-2.5 py-2 text-[7px] text-sim-text-label">
        <span>SIDE VIEW / SCHEMATIC</span>
      </div>

      <svg
        className="block size-full select-none pb-9"
        viewBox="0 0 760 580"
        role="img"
        aria-label="Vista técnica lateral de un Boeing 737-800 con esquema neumático provisional"
      >
        <defs>
          <pattern
            id="side-placeholder-hatch"
            width="7"
            height="7"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              className="stroke-sim-accent"
              x1="0"
              y1="0"
              x2="0"
              y2="7"
              strokeWidth="2"
              opacity="0.72"
            />
          </pattern>
        </defs>

        <g aria-label="Vista lateral CAD oficial del avión">
          <image
            href="/boeing-737-800-side-fill.png"
            x="43"
            y="41"
            width="674"
            height="199"
            preserveAspectRatio="xMidYMid meet"
          />
          <image
            href="/boeing-737-800-side.svg"
            x="43"
            y="41"
            width="674"
            height="199"
            preserveAspectRatio="xMidYMid meet"
          />
          <image
            href="/boeing-737-800-side-outline.png"
            x="43"
            y="41"
            width="674"
            height="199"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>

        <g aria-label="Esquema neumático provisional">
          <path
            className="fill-none stroke-sim-line-isolated"
            d="M154 287v51h452v-51M246 338v50m268-50v50M154 426v58h452v-58M246 426v58m268-58v58"
            strokeWidth="8"
            strokeLinecap="square"
          />
          <path
            className="fill-none stroke-sim-cyan"
            d="M154 287v51h452v-51M246 338v50m268-50v50"
            strokeWidth="3"
            strokeLinecap="square"
          />
          <path
            d="M154 426v58h452v-58M246 426v58m268-58v58"
            fill="none"
            stroke="url(#side-placeholder-hatch)"
            strokeWidth="5"
            strokeLinecap="square"
            strokeDasharray="8 5"
          />

          <Valve x={154} y={338} />
          <Valve x={246} y={338} />
          <Valve x={380} y={338} />
          <Valve x={514} y={338} />
          <Valve x={606} y={338} />
          <Pack x={246} label="LEFT" />
          <Pack x={514} label="RIGHT" />

          <g transform="translate(380 484)">
            <circle
              className="fill-sim-surface stroke-sim-text-muted"
              r="43"
              strokeWidth="1.5"
            />
            <text
              className="fill-sim-text-strong text-[9px] font-bold tracking-[0.1em]"
              textAnchor="middle"
              y="-2"
            >
              MIX
            </text>
            <text
              className="fill-sim-text-muted text-[8px] tracking-[0.1em]"
              textAnchor="middle"
              y="11"
            >
              MANIFOLD
            </text>
          </g>

          <text className="fill-sim-text-muted text-[8px]" x="116" y="277">
            ENG 1 BLEED
          </text>
          <text className="fill-sim-text-muted text-[8px]" x="568" y="277">
            ENG 2 BLEED
          </text>
          <text
            className="fill-sim-text-label text-[8px] tracking-[0.14em]"
            x="380"
            y="552"
            textAnchor="middle"
          >
            PROVISIONAL PNEUMATIC LAYOUT
          </text>
        </g>
      </svg>

      <div className="absolute right-2.5 bottom-1.75 left-2.5 z-30 flex h-7 items-center border border-sim-border bg-sim-surface px-3 text-sim-text-muted">
        <span className="mr-2 inline-block w-5.5 border-t-2 border-sim-cyan" />
        ACTIVE FLOW
        <span className="mr-2 ml-5 inline-block w-5.5 border-t border-dashed border-sim-accent" />
        PLACEHOLDER ROUTING
      </div>
    </div>
  );
}
