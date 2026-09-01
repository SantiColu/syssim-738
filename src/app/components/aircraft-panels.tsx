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

export function PointerKnob({ angle = 0 }: { angle?: number }) {
  return (
    <svg viewBox="0 0 90 90" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <filter id="knob-shadow-standalone" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#222" />
      </filter>
      <g filter="url(#knob-shadow-standalone)" style={{ transform: `translate(45px, 45px) rotate(${angle}deg)` }}>
        <circle cx="0" cy="0" r="34" fill="#a3a7a8" stroke="#6b7173" strokeWidth="2" />
        <path d="M -20 26 L -20 -10 L -8 -32 L 8 -32 L 20 -10 L 20 26 A 14 14 0 0 1 6 40 L -6 40 A 14 14 0 0 1 -20 26 Z" fill="#a3a7a8" stroke="#6b7173" strokeWidth="2" />
        <rect x="-2" y="-30" width="4" height="68" fill="white" stroke="#6b7173" strokeWidth="0.5" />
      </g>
    </svg>
  );
}

function TempSourceLabels() {
  return (
    <svg viewBox="-150 -120 280 230" style={{ position: "absolute", left: "-150px", top: "-120px", width: "280px", height: "230px", overflow: "visible", zIndex: 0 }}>
      {/* Radial lines and Outer Arcs */}
      <g stroke="white" strokeWidth="2" fill="none">
        {/* Inner lines from knob to labels (r: 35 to 42) - excludes -90 (FWD) */}
        {[-135, -45, 0, 45, 90, 135].map(a => {
          const rad = (a - 90) * Math.PI / 180;
          return <line key={`in-${a}`} x1={35 * Math.cos(rad)} y1={35 * Math.sin(rad)} x2={42 * Math.cos(rad)} y2={42 * Math.sin(rad)} />;
        })}

        {/* Outer radial lines beyond labels (r: 76 to 88) - excludes -90 (FWD) */}
        {[-135, -45, 0, 45, 90, 135].map(a => {
          const rad = (a - 90) * Math.PI / 180;
          return <line key={`out-${a}`} x1={76 * Math.cos(rad)} y1={76 * Math.sin(rad)} x2={88 * Math.cos(rad)} y2={88 * Math.sin(rad)} />;
        })}

        {/* Outer connecting arcs (r = 88) */}
        {/* SUPPLY DUCT arc: -135° to -45° */}
        <path d="M -62.2 62.2 A 88 88 0 0 1 -62.2 -62.2" />
        {/* PASS CAB arc: 0° to 45° */}
        <path d="M 0 -88 A 88 88 0 0 1 62.2 -62.2" />
        {/* PACK arc: 90° to 135° */}
        <path d="M 88 0 A 88 88 0 0 1 62.2 62.2" />
      </g>
      
      {/* Position labels around knob */}
      <g fill="white" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {/* CONT CAB at -135° */}
        <text x="-44" y="38">CONT</text>
        <text x="-44" y="52">CAB</text>
        {/* AFT (SUPPLY DUCT) at -45° */}
        <text x="-41" y="-36">AFT</text>
        {/* FWD (PASS CAB) at 0° */}
        <text x="0" y="-53">FWD</text>
        {/* AFT (PASS CAB) at 45° */}
        <text x="41" y="-36">AFT</text>
        {/* R (PACK) at 90° */}
        <text x="58" y="4">R</text>
        {/* L (PACK) at 135° */}
        <text x="41" y="46">L</text>
      </g>

      {/* Vertical text: FWD (inside SUPPLY DUCT arc) */}
      <g fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {['F','W','D'].map((char, i) => (
          <text key={`fwd-${i}`} x="-68" y={-14 + i * 15}>{char}</text>
        ))}
      </g>

      {/* Group text: SUPPLY DUCT */}
      <g fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {['S','U','P','P','L','Y'].map((char, i) => <text key={`s-${i}`} x="-120" y={-50 + i * 16}>{char}</text>)}
        {['D','U','C','T'].map((char, i) => <text key={`d-${i}`} x="-98" y={-34 + i * 16}>{char}</text>)}
      </g>

      {/* Group text: PACK */}
      <g fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {['P','A','C','K'].map((char, i) => <text key={`p-${i}`} x="105" y={10 + i * 16}>{char}</text>)}
      </g>

      {/* Group texts: AIR TEMP and PASS CAB */}
      <text x="-15" y="-102" fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">AIR TEMP</text>
      <text x="64" y="-102" fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">PASS</text>
      <text x="64" y="-88" fill="white" fontSize="14" fontFamily="monospace" fontWeight="bold" textAnchor="middle">CAB</text>
    </svg>
  );
}

export function RoundHeadToggle({ position = "OFF" }: { position?: "ON" | "OFF" }) {
  const isOff = position === "OFF";
  return (
    <svg viewBox="0 0 60 60" style={{ width: "50px", height: "50px", overflow: "visible" }}>
      <defs>
        <radialGradient id="bezel-grad" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="#4a5053" />
          <stop offset="90%" stopColor="#25282a" />
          <stop offset="100%" stopColor="#151718" />
        </radialGradient>
        <radialGradient id="cavity-grad" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#1a1d1e" />
          <stop offset="70%" stopColor="#2c3033" />
          <stop offset="100%" stopColor="#111314" />
        </radialGradient>
        <radialGradient id="ball-grad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#ede7d5" />
          <stop offset="75%" stopColor="#c5bea8" />
          <stop offset="100%" stopColor="#968f7a" />
        </radialGradient>
        <filter id="ball-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0a0a0a" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* Base Bezel */}
      <circle cx="30" cy="30" r="22" fill="url(#bezel-grad)" stroke="#606669" strokeWidth="1.5" />
      <circle cx="30" cy="30" r="16" fill="url(#cavity-grad)" stroke="#111314" strokeWidth="1" />

      {/* Crescent / arc track underneath */}
      <path d="M 17 34 A 14 14 0 0 0 43 34" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />

      {/* Stem & Round Head */}
      <g filter="url(#ball-shadow)" transform={isOff ? "translate(0, -6)" : "translate(0, 8)"}>
        {/* Metal stem */}
        <path d="M 28 32 L 28 26 L 32 26 L 32 32 Z" fill="#b0b5b8" stroke="#505558" strokeWidth="0.5" />
        {/* Round Head Ball */}
        <circle cx="30" cy="24" r="11" fill="url(#ball-grad)" stroke="#8c8573" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

export function TemperatureGauge({ value = 24 }: { value?: number }) {
  const needleDeg = 220 + (Math.max(0, Math.min(100, value)) / 100) * 255;
  const numbers = [0, 20, 40, 60, 80, 100];
  const allTicks = Array.from({ length: 51 }, (_, i) => i * 2);

  return (
    <svg viewBox="0 0 200 200" style={{ width: "150px", height: "150px", overflow: "visible" }}>
      {/* Outer grey border / bezel */}
      <circle cx="100" cy="100" r="98" fill="#52585c" stroke="#25282a" strokeWidth="2.5" />
      <circle cx="100" cy="100" r="91" fill="#1b1d1e" stroke="#70767a" strokeWidth="2" />
      <circle cx="100" cy="100" r="86" fill="#08090a" />

      {/* Scale Ticks */}
      <g stroke="white" strokeLinecap="round">
        {allTicks.map((v) => {
          const isMajor = v % 10 === 0;
          const deg = 220 + (v / 100) * 255;
          const rad = ((deg - 90) * Math.PI) / 180;
          const innerR = isMajor ? 67 : 75;
          const outerR = 83;
          return (
            <line
              key={`t-${v}`}
              x1={100 + innerR * Math.cos(rad)}
              y1={100 + innerR * Math.sin(rad)}
              x2={100 + outerR * Math.cos(rad)}
              y2={100 + outerR * Math.sin(rad)}
              strokeWidth={isMajor ? 2.5 : 1.2}
            />
          );
        })}
      </g>

      {/* Numbers */}
      <g fill="white" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        {numbers.map((v) => {
          const deg = 220 + (v / 100) * 255;
          const rad = ((deg - 90) * Math.PI) / 180;
          const r = 53;
          const x = 100 + r * Math.cos(rad);
          const y = 100 + r * Math.sin(rad) + 4;
          return (
            <text key={`num-${v}`} x={x} y={y}>
              {v}
            </text>
          );
        })}
      </g>

      {/* Center Dial Labels */}
      <text x="100" y="68" fill="white" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        TEMP
      </text>
      <text x="100" y="134" fill="white" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
        °C
      </text>

      {/* Needle (Acute sharp triangle) */}
      <g transform={`rotate(${needleDeg}, 100, 100)`}>
        <polygon points="97,100 100,18 103,100 100,108" fill="white" />
      </g>

      {/* Central Hub Circle (single circle with grey border) */}
      <circle cx="100" cy="100" r="20" fill="#121415" stroke="#70767a" strokeWidth="2.5" />
    </svg>
  );
}

export function TemperatureSelector({ angle = 0 }: { angle?: number }) {
  return (
    <div style={{ position: "relative", width: "120px", height: "125px", margin: "0 auto" }}>
      <svg viewBox="0 0 120 125" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <filter id="knob-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#222" />
        </filter>
        
        <g transform="translate(15, 12)">
          {/* AUTO label in the gap */}
          <text x="45" y="6" fill="white" fontSize="16" fontFamily="monospace" fontWeight="bold" textAnchor="middle">AUTO</text>
          
          {/* Left Arc: -115 to -32 degrees */}
          <path d="M 4.2 64 A 45 45 0 0 1 21 6.8" fill="none" stroke="white" strokeWidth="2.5" />
          
          {/* Right Arc: 32 to 115 degrees */}
          <path d="M 69 6.8 A 45 45 0 0 1 85.8 64" fill="none" stroke="white" strokeWidth="2.5" />
          
          {/* 4 Dots (inside the arc, radius 40 instead of 45) */}
          {[-90, -45, 45, 90].map((a, i) => {
            const rad = (a - 90) * Math.PI / 180;
            const r = 40;
            const x = 45 + r * Math.cos(rad);
            const y = 45 + r * Math.sin(rad);
            return <circle key={i} cx={x} cy={y} r="2" fill="white" />;
          })}
          
          {/* Knob */}
          <g filter="url(#knob-shadow)" style={{ transform: `translate(45px, 45px) rotate(${angle}deg)` }}>
            <circle cx="0" cy="0" r="34" fill="#a3a7a8" stroke="#6b7173" strokeWidth="2" />
            <path d="M -20 26 L -20 -10 L -8 -32 L 8 -32 L 20 -10 L 20 26 A 14 14 0 0 1 6 40 L -6 40 A 14 14 0 0 1 -20 26 Z" fill="#a3a7a8" stroke="#6b7173" strokeWidth="2" />
            <rect x="-2" y="-30" width="4" height="68" fill="white" stroke="#6b7173" strokeWidth="0.5" />
          </g>

          {/* Labels C, W, OFF */}
          <text x="4" y="86" fill="white" fontSize="16" fontFamily="monospace" fontWeight="bold" textAnchor="middle">C</text>
          <text x="86" y="86" fill="white" fontSize="16" fontFamily="monospace" fontWeight="bold" textAnchor="middle">W</text>
          <text x="37" y="106" fill="white" fontSize="16" fontFamily="monospace" fontWeight="bold" textAnchor="middle">OFF</text>
        </g>
      </svg>
    </div>
  );
}

export function TemperaturePanel() {
  return (
    <section
      className="aircraft-panel temperature-panel"
      aria-label="Air temperature panel"
    >
      <div className="temp-gauge">
        <TemperatureGauge />
      </div>
      
      {/* Temp-source component overlay */}
      <div style={{ position: "absolute", left: "320px", top: "126px" }}>
        <TempSourceLabels />
        <div style={{ position: "absolute", left: "-45px", top: "-45px", width: "90px", height: "90px" }}>
          <PointerKnob />
        </div>
      </div>
      <div
        className="trim-air"
        style={{
          position: "absolute",
          left: "175px",
          top: "195px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontFamily: "monospace",
          color: "white",
        }}
      >
        <span style={{ marginBottom: "6px", fontSize: "16px", fontWeight: "bold", whiteSpace: "nowrap" }}>
          TRIM AIR
        </span>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <RoundHeadToggle position="OFF" />
          {/* OFF and ON labels stacked on the right */}
          <div
            style={{
              position: "absolute",
              left: "54px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "14px",
              fontWeight: "bold",
              color: "white",
            }}
          >
            <span>OFF</span>
            <span>ON</span>
          </div>
        </div>
      </div>
      <div className="zone-controls" style={{ top: "290px" }}>
        {["CONT CAB", "FWD CAB", "AFT CAB"].map((label) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Placard>
              ZONE
              <br />
              TEMP
            </Placard>
            <b style={{ marginBottom: "-6px", marginTop: "2px", zIndex: 10 }}>{label}</b>
            <TemperatureSelector />
          </div>
        ))}
      </div>
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}
