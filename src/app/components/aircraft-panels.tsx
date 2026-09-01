import type { CSSProperties, ReactNode } from "react";

function Screw({ className = "" }: { className?: string }) {
  return <i className={`ap-screw ${className}`} />;
}

function Placard({
  children,
  color = "amber",
}: {
  children: ReactNode;
  color?: "amber" | "green" | "blue";
}) {
  return <div className={`ap-placard ap-${color}`}>{children}</div>;
}

function Toggle({ angle = 0 }: { angle?: number }) {
  return (
    <div className="ap-toggle">
      <i style={{ "--toggle-angle": `${angle}deg` } as CSSProperties} />
    </div>
  );
}

function Selector({
  angle = 0,
  large = false,
}: {
  angle?: number;
  large?: boolean;
}) {
  return (
    <div className={`ap-selector ${large ? "large" : ""}`}>
      <i style={{ transform: `rotate(${angle}deg)` }} />
    </div>
  );
}

function DigitalDisplay() {
  return (
    <div className="ap-digital">
      {Array.from({ length: 5 }).map((_, index) => (
        <span className="digit-cell" key={index}>
          <i className="seven-digit">
            {["a", "b", "c", "d", "e", "f", "g"].map((segment) => <b key={segment} className={`seg-${segment}`} />)}
          </i>
          <em />
        </span>
      ))}
    </div>
  );
}

function ScallopedKnob({ ring = false }: { ring?: boolean }) {
  return <div className={`scalloped-knob ${ring ? "ring" : ""}`}><i /></div>;
}

function ValvePositionIndicator() {
  const ticks = Array.from({ length: 15 }, (_, index) => {
    const radians = (-70 + index * 10) * Math.PI / 180;
    return { x1: 75 + Math.sin(radians) * 43, y1: 76 - Math.cos(radians) * 43, x2: 75 + Math.sin(radians) * 57, y2: 76 - Math.cos(radians) * 57, dx: 75 + Math.sin(radians) * 39, dy: 76 - Math.cos(radians) * 39 };
  });
  return (
    <svg className="valve-position-indicator" viewBox="0 0 150 92" aria-label="Outflow valve position indicator">
      <path d="M7 79 A68 68 0 0 1 143 79 Q143 89 133 89 H17 Q7 89 7 79Z" fill="#050505" />
      <path d="M25 74 A52 52 0 0 1 125 74 Q124 80 116 80 H34 Q26 80 25 74Z" fill="#947257" />
      {ticks.map((tick, index) => <g key={index}><line x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke="white" strokeWidth="2" /><circle cx={tick.dx} cy={tick.dy} r="2.2" fill="#66f5a5" /></g>)}
    </svg>
  );
}

function RoundGauge({
  variant,
}: {
  variant: "altitude" | "climb" | "temperature";
}) {
  const temperature = variant === "temperature";
  const labels = temperature
    ? ["0", "20", "40", "60", "80", "100"]
    : variant === "climb"
      ? ["0", "1", "2", "3", "4", "3", "2", "1"]
      : ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return (
    <div className={`ap-gauge ap-gauge-${variant}`}>
      <div className="ap-gauge-ticks">
        {Array.from({ length: temperature ? 31 : 40 }).map((_, index) => (
          <i
            key={index}
            style={{
              transform: `rotate(${index * (360 / (temperature ? 31 : 40))}deg)`,
            }}
          />
        ))}
      </div>
      {labels.map((label, index) => {
        const angle = temperature
          ? 220 + index * 44
          : index * (360 / labels.length);
        return (
          <span
            key={`${label}-${index}`}
            style={{ "--label-angle": `${angle}deg` } as CSSProperties}
          >
            {label}
          </span>
        );
      })}
      <b>
        {temperature ? (
          <>
            TEMP
            <br />
            <small>°C</small>
          </>
        ) : variant === "climb" ? (
          <>
            CABIN CLIMB
            <br />
            <small>1000 FEET PER MIN</small>
          </>
        ) : (
          <>
            CABIN
            <br />
            ALT
          </>
        )}
      </b>
      <em className="ap-gauge-needle" />
      <u />
    </div>
  );
}

function PolarTick({
  angle,
  inner,
  outer,
  width = 1,
}: {
  angle: number;
  inner: number;
  outer: number;
  width?: number;
}) {
  const radians = ((angle - 90) * Math.PI) / 180;
  const point = (radius: number) => ({
    x: 100 + Math.cos(radians) * radius,
    y: 100 + Math.sin(radians) * radius,
  });
  const a = point(inner);
  const b = point(outer);
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke="white"
      strokeWidth={width}
    />
  );
}

function PolarLabel({
  angle,
  radius,
  children,
  size = 8,
}: {
  angle: number;
  radius: number;
  children: ReactNode;
  size?: number;
}) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return (
    <text
      x={100 + Math.cos(radians) * radius}
      y={103 + Math.sin(radians) * radius}
      fill="white"
      fontSize={size}
      textAnchor="middle"
      fontFamily="monospace"
    >
      {children}
    </text>
  );
}

function CabinPressureGauge() {
  const scaleAngles = Array.from(
    { length: 51 },
    (_, index) => index * (327 / 50),
  );
  return (
    <svg
      className="cabin-pressure-gauge"
      viewBox="0 0 200 200"
      role="img"
      aria-label="Cabin altitude and differential pressure indicator"
    >
      <circle
        cx="100"
        cy="100"
        r="96"
        fill="#020202"
        stroke="#383838"
        strokeWidth="8"
      />
      {scaleAngles.map((angle, i) => (
        <PolarTick
          key={`outer-${i}`}
          angle={angle}
          inner={i % 5 === 0 ? 75 : 81}
          outer={88}
          width={i % 5 === 0 ? 2 : 1}
        />
      ))}
      {scaleAngles.map((angle, i) => (
        <PolarTick
          key={`inner-${i}`}
          angle={angle}
          inner={i % 5 === 0 ? 48 : 54}
          outer={60}
          width={i % 5 === 0 ? 1.8 : 0.9}
        />
      ))}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n, i) => (
        <PolarLabel
          key={n}
          angle={[42, 72, 96, 124, 151, 194, 226, 263, 292, 327][i]}
          radius={69}
          size={8}
        >
          {n}
        </PolarLabel>
      ))}
      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 50].map((n, i) => (
        <PolarLabel
          key={n}
          angle={[0, 43, 94, 150, 190, 235, 270, 286, 306, 334][i]}
          radius={41}
          size={7}
        >
          {n}
        </PolarLabel>
      ))}
      <path
        d="M31 52 A83 83 0 0 0 19 82"
        fill="none"
        stroke="#ffb700"
        strokeWidth="9"
      />
      <path
        d="M38 42 A83 83 0 0 0 31 52"
        fill="none"
        stroke="#df1717"
        strokeWidth="5"
      />
      <text
        x="55"
        y="28"
        fill="white"
        fontSize="8"
        fontFamily="monospace"
        transform="rotate(-24 55 28)"
      >
        DIFF PRESS
      </text>
      <text x="78" y="35" fill="white" fontSize="7" fontFamily="monospace">
        PSI
      </text>
      <text
        x="100"
        y="77"
        fill="white"
        fontSize="9"
        textAnchor="middle"
        fontFamily="monospace"
      >
        CABIN
      </text>
      <text
        x="100"
        y="87"
        fill="white"
        fontSize="9"
        textAnchor="middle"
        fontFamily="monospace"
      >
        ALT
      </text>
      <text
        x="100"
        y="125"
        fill="white"
        fontSize="6"
        textAnchor="middle"
        fontFamily="monospace"
      >
        X 1000 FEET
      </text>
      <polygon points="100,95 35,131 91,105" fill="white" />
      <polygon points="100,94 163,103 100,106" fill="white" />
      <circle
        cx="100"
        cy="100"
        r="8"
        fill="#090909"
        stroke="#aaa"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CabinClimbGauge() {
  const climbLabels = [
    { value: ".5", angle: -58 },
    { value: "1", angle: -20 },
    { value: "2", angle: 25 },
    { value: "3", angle: 58 },
    { value: "4", angle: 90 },
    { value: ".5", angle: -122 },
    { value: "1", angle: 180 },
    { value: "2", angle: 155 },
    { value: "3", angle: 122 },
  ];
  return (
    <svg
      className="cabin-climb-gauge"
      viewBox="0 0 200 200"
      role="img"
      aria-label="Cabin climb indicator"
    >
      <defs>
        <path id="climb-title-path" d="M43 79 A66 66 0 0 1 157 79" />
        <path id="climb-unit-path" d="M38 129 A70 70 0 0 0 162 129" />
      </defs>
      <circle
        cx="100"
        cy="100"
        r="94"
        fill="#020202"
        stroke="#383838"
        strokeWidth="9"
      />
      {Array.from({ length: 41 }).map((_, i) => (
        <PolarTick
          key={`up-${i}`}
          angle={-90 + i * 4.5}
          inner={i % 10 === 0 ? 69 : 77}
          outer={87}
          width={i % 10 === 0 ? 2 : 1}
        />
      ))}
      {Array.from({ length: 41 }).map((_, i) => (
        <PolarTick
          key={`down-${i}`}
          angle={-90 - i * 4.5}
          inner={i % 10 === 0 ? 69 : 77}
          outer={87}
          width={i % 10 === 0 ? 2 : 1}
        />
      ))}
      <PolarLabel angle={-90} radius={63} size={10}>
        0
      </PolarLabel>
      {climbLabels.map(({ value, angle }) => (
        <PolarLabel
          key={`${value}-${angle}`}
          angle={angle}
          radius={61}
          size={10}
        >
          {value}
        </PolarLabel>
      ))}
      <text fill="white" fontSize="10" fontFamily="monospace">
        <textPath
          href="#climb-title-path"
          startOffset="50%"
          textAnchor="middle"
        >
          CABIN CLIMB
        </textPath>
      </text>
      <text fill="#1538ff" fontSize="9" fontFamily="monospace">
        <textPath href="#climb-unit-path" startOffset="50%" textAnchor="middle">
          1000 FEET PER MIN
        </textPath>
      </text>
      <text x="28" y="82" fill="white" fontSize="8" fontFamily="monospace">
        UP
      </text>
      <text x="27" y="125" fill="white" fontSize="8" fontFamily="monospace">
        DN
      </text>
      <polygon points="100,94 35,100 100,106" fill="white" />
      <rect x="100" y="91" width="31" height="18" fill="white" />
      <circle
        cx="100"
        cy="100"
        r="10"
        fill="#080808"
        stroke="#aaa"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function EquipmentCoolingPanel() {
  return (
    <section
      className="aircraft-panel equipment-cooling-panel"
      aria-label="Equipment cooling panel"
    >
      <div className="ap-chamfer top" />
      <div className="ap-chamfer bottom" />
      <h2>EQUIP COOLING</h2>
      <div className="ap-rule top-rule" />
      <div className="cooling-head">
        <span>SUPPLY</span>
        <span>EXHAUST</span>
      </div>
      <div className="cooling-norm">NORM</div>
      <div className="cooling-controls">
        <Toggle angle={-8} />
        <Toggle angle={8} />
      </div>
      <div className="cooling-alt">ALTN</div>
      <div className="cooling-lights">
        <Placard>OFF</Placard>
        <Placard>OFF</Placard>
      </div>
      <div className="ap-rule bottom-rule" />
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}

export function CabinAltitudePanel() {
  return (
    <section
      className="aircraft-panel cabin-altitude-panel"
      aria-label="Cabin altitude instruments"
    >
      <div className="cabin-gauges">
        <div className="cabin-main-bezel" />
        <div className="cabin-climb-bezel" />
        <CabinPressureGauge />
        <div className="pressure-note">
          PRESS DIFF
          <br />
          LIMIT: TAKE-
          <br />
          OFF &amp; LDG
          <br />
          .125 PSI
        </div>
        <CabinClimbGauge />
      </div>
      <div className="horn-column">
        <span>
          ALT
          <br />
          HORN
          <br />
          CUTOUT
        </span>
        <span className="horn-cutout" aria-hidden="true" />
      </div>
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}

export function CabinAltitudeControlPanel() {
  return (
    <section
      className="aircraft-panel cabin-control-panel"
      aria-label="Cabin altitude control panel"
    >
      <div className="mode-lights">
        <Placard>
          AUTO
          <br />
          FAIL
        </Placard>
        <Placard>
          OFF SCHED
          <br />
          DESCENT
        </Placard>
        <Placard color="green">ALTN</Placard>
        <Placard color="green">MANUAL</Placard>
      </div>
      <div className="control-divider" />
      <div className="control-horizontal" />
      <span className="auto-title">AUTO</span>
      <span className="manual-title">MANUAL</span>
      <div className="flight-display">
        <DigitalDisplay />
        <label>FLT ALT</label>
        <ScallopedKnob />
      </div>
      <div className="landing-display">
        <DigitalDisplay />
        <label>LAND ALT</label>
        <ScallopedKnob ring />
      </div>
      <div className="valve-meter">
        <ValvePositionIndicator />
        <span>VALVE</span>
        <small><b>C<br />L<br />O<br />S<br />E</b><b>O<br />P<br />E<br />N</b></small>
        <div className="valve-switch"><i /></div>
      </div>
      <div className="alt-mode">
        <span>
          ALTN
          <br />
          AUTO&nbsp;&nbsp;MAN
        </span>
        <Selector angle={-28} large />
      </div>
      <div className="landing-scale">
        <div className="scale-labels"><b>CAB ALT</b><b>LAND ALT</b><b>FLT ALT</b></div>
        {[{ top:"2000",bottom:"<FL160" },{ top:"4000",bottom:"FL220" },{ top:"6000",bottom:"FL260" },{ top:"8000",bottom:"FL320" },{ top:"",bottom:"FL410" }].map((cell, index) => (
          <span key={index}><strong>{cell.top}</strong><small>{cell.bottom}</small></span>
        ))}
      </div>
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}

export function TemperaturePanel() {
  return (
    <section
      className="aircraft-panel temperature-panel"
      aria-label="Air temperature panel"
    >
      <div className="temp-gauge">
        <RoundGauge variant="temperature" />
      </div>
      <div className="temp-source">
        <span className="supply">SUPPLY</span>
        <div className="source-labels">
          FWD&nbsp;&nbsp;&nbsp;AFT&nbsp;&nbsp;&nbsp;FWD
          <br />
          CONT&nbsp;&nbsp;&nbsp;AFT
          <br />
          CAB&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CAB
        </div>
        <Selector />
      </div>
      <div className="trim-air">
        <span>
          TRIM AIR
          <br />
          OFF
        </span>
        <Toggle angle={90} />
        <small>ON</small>
      </div>
      <div className="zone-lights">
        <Placard>
          ZONE
          <br />
          TEMP
        </Placard>
        <Placard>
          ZONE
          <br />
          TEMP
        </Placard>
        <Placard>
          ZONE
          <br />
          TEMP
        </Placard>
      </div>
      <div className="zone-controls">
        {["CONT CAB", "FWD CAB", "AFT CAB"].map((label) => (
          <div key={label}>
            <b>{label}</b>
            <span>AUTO</span>
            <Selector />
            <small>
              C&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;W
              <br />
              OFF
            </small>
          </div>
        ))}
      </div>
      <div className="temperature-annunciators">
        <Placard>
          DUAL
          <br />
          BLEED
        </Placard>
        <Placard color="blue">
          RAM DOOR
          <br />
          FULL OPEN
        </Placard>
        <Placard color="blue">
          RAM DOOR
          <br />
          FULL OPEN
        </Placard>
      </div>
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}
