const Valve = ({
  x,
  y,
  open = true,
}: {
  x: number;
  y: number;
  open?: boolean;
}) => (
  <g
    transform={`translate(${x} ${y})`}
    className={open ? "valve open" : "valve"}
  >
    <circle r="9" />
    <path d="M-6 6 6-6" />
  </g>
);
const Box = ({
  x,
  y,
  w,
  h,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  children: React.ReactNode;
}) => (
  <g className="diagram-box">
    <rect x={x} y={y} width={w} height={h} />
    <text x={x + w / 2} y={y + h / 2 - 2}>
      {children}
    </text>
  </g>
);
export function PneumaticSchematic() {
  return (
    <section className="schematic" aria-label="Esquema del sistema neumático">
      <div className="schematic-head">
        <span>TOP VIEW / SCHEMATIC</span>
      </div>
      <svg
        viewBox="0 0 760 580"
        role="img"
        aria-label="Vista esquemática del sistema neumático del Boeing 737"
      >
        <g className="aircraft">
          <path d="M380 30 354 150 349 245 246 288 112 285 110 326 316 339 306 444 278 510 281 526 372 479 380 555 388 479 479 526 482 510 454 444 444 339 650 326 648 285 514 288 411 245 406 150Z" />
          <path d="M380 30V555M111 306H649" />
        </g>
        <g className="flow">
          <path d="M380 270V187M380 302V270M380 302H300V348M380 302H460V348M300 348V410M460 348V410" />
          <path d="M333 348H427" />
          <path d="M300 348H224V397M460 348H536V397" />
        </g>
        <g className="flow-arrows">
          <path d="M337 216v-60m0 0-8 14m8-14 8 14M423 216v-60m0 0-8 14m8-14 8 14" />
        </g>
        <Box x={350} y={100} w={60} h={40}>
          CABIN
          <tspan x="380" dy="12">
            SUPPLY
          </tspan>
        </Box>
        <Box x={344} y={174} w={72} h={40}>
          MIX
          <tspan x="380" dy="12">
            MANIFOLD
          </tspan>
        </Box>
        <Box x={270} y={270} w={58} h={42}>
          L PACK
          <tspan x="299" dy="12">
            AUTO
          </tspan>
        </Box>
        <Box x={432} y={270} w={58} h={42}>
          R PACK
          <tspan x="461" dy="12">
            AUTO
          </tspan>
        </Box>
        <Box x={270} y={397} w={60} h={49}>
          PRE
          <tspan x="300" dy="12">
            COOLER
          </tspan>
        </Box>
        <Box x={430} y={397} w={60} h={49}>
          PRE
          <tspan x="460" dy="12">
            COOLER
          </tspan>
        </Box>
        <Valve x={300} y={338} />
        <Valve x={460} y={338} />
        <Valve x={380} y={312} open={false} />
        <Valve x={224} y={366} />
        <Valve x={536} y={366} />
        <g className="pressure">
          <rect x="324" y="379" width="54" height="21" />
          <text x="351" y="393">
            36.4 PSI
          </text>
          <rect x="382" y="379" width="54" height="21" />
          <text x="409" y="393">
            35.9 PSI
          </text>
        </g>
        <g className="engine-labels">
          <text x="206" y="270">
            9TH STAGE
          </text>
          <text x="505" y="270">
            9TH STAGE
          </text>
          <text x="217" y="310">
            5TH STAGE
          </text>
          <text x="498" y="310">
            5TH STAGE
          </text>
          <text x="151" y="366">
            GROUND
          </text>
          <text x="153" y="379">
            AIR
          </text>
          <text x="180" y="430">
            ENG 1 PRSOV
          </text>
          <text x="505" y="430">
            ENG 2 PRSOV
          </text>
          <text x="362" y="470">
            APU VLV
          </text>
          <text x="358" y="530">
            APU BLEED
          </text>
        </g>
      </svg>
      <div className="legend">
        <span className="line-swatch" /> ACTIVE FLOW{" "}
        <span className="dash-swatch" /> ISOLATED{" "}
        <span className="valve-swatch">⌀</span> OPEN{" "}
        <span className="closed-swatch">◉</span> CLOSED
      </div>
    </section>
  );
}
