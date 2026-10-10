"use client";



export const DIGIT_SEGMENTS: Record<string, number[]> = {
  "0": [1, 1, 1, 1, 1, 1, 0],
  "1": [0, 1, 1, 0, 0, 0, 0],
  "2": [1, 1, 0, 1, 1, 0, 1],
  "3": [1, 1, 1, 1, 0, 0, 1],
  "4": [0, 1, 1, 0, 0, 1, 1],
  "5": [1, 0, 1, 1, 0, 1, 1],
  "6": [1, 0, 1, 1, 1, 1, 1],
  "7": [1, 1, 1, 0, 0, 0, 0],
  "8": [1, 1, 1, 1, 1, 1, 1],
  "9": [1, 1, 1, 1, 0, 1, 1],
  "-": [0, 0, 0, 0, 0, 0, 1],
  " ": [0, 0, 0, 0, 0, 0, 0],
};

export function SevenSegmentCell({ char = " " }: { char?: string }) {
  const segs = DIGIT_SEGMENTS[char] || DIGIT_SEGMENTS[" "];
  return (
    <svg
      viewBox="0 0 24 36"
      style={{ width: "24px", height: "36px", flexShrink: 0 }}
    >
      {/* Cell Background & Divider */}
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="35"
        fill="#dce1e4"
        stroke="#181a1c"
        strokeWidth="1"
      />

      {/* 7 Segments (slanted italic) */}
      <g transform="skewX(-5) translate(3, 3)">
        {/* a: top horizontal */}
        <polygon
          points="2,2 14,2 12,4.5 4,4.5"
          fill={segs[0] ? "#181a1c" : "#c4cad0"}
          stroke={segs[0] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* b: top right vertical */}
        <polygon
          points="14.5,2.5 14.5,14 12.5,12 12.5,4.5"
          fill={segs[1] ? "#181a1c" : "#c4cad0"}
          stroke={segs[1] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* c: bottom right vertical */}
        <polygon
          points="14.5,16 14.5,27.5 12.5,25.5 12.5,18"
          fill={segs[2] ? "#181a1c" : "#c4cad0"}
          stroke={segs[2] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* d: bottom horizontal */}
        <polygon
          points="2,28 14,28 12,25.5 4,25.5"
          fill={segs[3] ? "#181a1c" : "#c4cad0"}
          stroke={segs[3] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* e: bottom left vertical */}
        <polygon
          points="1.5,16 1.5,27.5 3.5,25.5 3.5,18"
          fill={segs[4] ? "#181a1c" : "#c4cad0"}
          stroke={segs[4] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* f: top left vertical */}
        <polygon
          points="1.5,2.5 1.5,14 3.5,12 3.5,4.5"
          fill={segs[5] ? "#181a1c" : "#c4cad0"}
          stroke={segs[5] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* g: middle horizontal */}
        <polygon
          points="3,15 13,15 14,15.5 13,16 3,16 2,15.5"
          fill={segs[6] ? "#181a1c" : "#c4cad0"}
          stroke={segs[6] ? "#181a1c" : "#b0b6bc"}
          strokeWidth="0.5"
        />
        {/* Decimal dot at bottom right */}
        <circle
          cx="16"
          cy="27"
          r="1.2"
          fill="#c4cad0"
          stroke="#b0b6bc"
          strokeWidth="0.4"
        />
      </g>
    </svg>
  );
}

export function DigitalDisplay({
  value = "10000",
}: {
  value?: string | number;
}) {
  const str = String(value).padStart(5, " ");
  const chars = str.slice(-5).split("");

  return (
    <div
      style={{
        display: "inline-flex",
        background: "#08090a",
        border: "2px solid #141618",
        borderRadius: "2px",
        padding: "2px 10px",
        gap: "1px",
        boxShadow:
          "inset 0 1px 4px rgba(0,0,0,0.8), 0 1px 2px rgba(255,255,255,0.1)",
      }}
    >
      {chars.map((ch, index) => (
        <SevenSegmentCell key={index} char={ch} />
      ))}
    </div>
  );
}
