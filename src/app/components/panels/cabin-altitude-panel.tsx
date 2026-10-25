"use client";

import { type ReactNode } from "react";
import {
  gaugeCoord,
  Screw,
} from "./panel-parts";

export function PolarTick({
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
    x: gaugeCoord(100 + Math.cos(radians) * radius),
    y: gaugeCoord(100 + Math.sin(radians) * radius),
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

export function PolarLabel({
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
      x={gaugeCoord(100 + Math.cos(radians) * radius)}
      y={gaugeCoord(103 + Math.sin(radians) * radius)}
      fill="white"
      fontSize={size}
      textAnchor="middle"
      fontFamily="monospace"
    >
      {children}
    </text>
  );
}

export function CabinPressureGauge() {
  // Outer Scale: DIFF PRESS 0 to 10 PSI (31.5 deg per 1 PSI unit, spanning 315 deg total)
  const outerLabels = [
    { n: "0", angle: 0 },
    { n: "1", angle: 31.5 },
    { n: "2", angle: 63.0 },
    { n: "3", angle: 94.5 },
    { n: "4", angle: 126.0 },
    { n: "5", angle: 157.5 },
    { n: "6", angle: 189.0 },
    { n: "7", angle: 220.5 },
    { n: "8", angle: 252.0 },
    { n: "9", angle: 283.5 },
    { n: "10", angle: 315.0 },
  ];

  // Outer Ticks: extend INWARD from outer=76 to inner=68 (major and minor)
  const outerTicks = Array.from({ length: 51 }, (_, i) => {
    const angle = i * 6.3;
    const isMajor = i % 5 === 0;
    return {
      angle,
      outer: isMajor ? 76 : 73,
      inner: 68,
      width: isMajor ? 2.2 : 1.2,
    };
  });

  // Inner Scale: CABIN ALT (0 to 50 thousand feet)
  const innerLabels = [
    { n: "0", angle: 0 },
    { n: "5", angle: 38 },
    { n: "10", angle: 76 },
    { n: "15", angle: 114 },
    { n: "20", angle: 152 },
    { n: "25", angle: 190 },
    { n: "30", angle: 228 },
    { n: "35", angle: 255 },
    { n: "40", angle: 282 },
    { n: "50", angle: 325 },
  ];

  // Inner Ticks: extend INWARD from outer=46 to inner=38 (major) / inner=42 (minor)
  const innerTicks = [
    ...Array.from({ length: 26 }, (_, i) => {
      const angle = (i / 25) * 190;
      const isMajor = i % 5 === 0;
      return {
        angle,
        outer: 46,
        inner: isMajor ? 38 : 42,
        width: isMajor ? 1.8 : 1.0,
      };
    }),
    ...Array.from({ length: 15 }, (_, i) => {
      const angle = 190 + (i + 1) * ((282 - 190) / 15);
      const isMajor = (i + 1) % 5 === 0;
      return {
        angle,
        outer: 46,
        inner: isMajor ? 38 : 42,
        width: isMajor ? 1.8 : 1.0,
      };
    }),
    ...Array.from({ length: 5 }, (_, i) => {
      const angle = 282 + (i + 1) * ((325 - 282) / 5);
      const isMajor = i + 1 === 5;
      return {
        angle,
        outer: 46,
        inner: isMajor ? 38 : 42,
        width: isMajor ? 1.8 : 1.0,
      };
    }),
  ];

  return (
    <svg
      className="cabin-pressure-gauge"
      viewBox="0 0 200 200"
      role="img"
      aria-label="Cabin altitude and differential pressure indicator"
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Curved Path for DIFF PRESS text in the gap between 10 (315 deg) and 0 (0 deg) */}
        <path
          id="diff-press-path"
          d="M 44.8 44.8 A 78 78 0 0 1 100 22"
          fill="none"
        />
        {/* Curved Path for PSI text slightly below DIFF PRESS */}
        <path id="psi-path" d="M 50.5 50.5 A 70 70 0 0 1 100 30" fill="none" />
      </defs>

      {/* Main Solid Black Gauge Dial */}
      <circle cx="100" cy="100" r="98" fill="#000000" />

      {/* Full White Circular Line on the inside of the outer scale (radius 64) */}
      <circle
        cx="100"
        cy="100"
        r="64"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
      />

      {/* Outer Ticks (pointing inward to r=68) */}
      {/* Placed before Amber/Red flags so the flags cover them */}
      {outerTicks.map((tick, i) => (
        <PolarTick
          key={`outer-${i}`}
          angle={tick.angle}
          inner={tick.inner}
          outer={tick.outer}
          width={tick.width}
        />
      ))}

      {/* Amber Warning Band (from 8.25 to 8.9 PSI - completely covering outer ticks) */}
      <path
        d="M 29.2 112.6 A 72 72 0 0 1 29.2 87.1"
        fill="none"
        stroke="#f5a623"
        strokeWidth="8"
      />

      {/* Red Warning Hatched Flag / Bug ONLY AT 9.0 PSI (283.5 deg = polar 193.5) */}
      {/* Centered on the tick mark. Right-angled triangle on the right (+X/outward) side, straight edge at the bottom (-Y). */}
      {/* Inner edge aligns with amber band (x=-4). Tips outwards towards number 9. */}
      <g transform="translate(30, 83.2) rotate(193.5)">
        <polygon
          points="-4,-4 9,-4 5,4 -4,4"
          fill="#d91e18"
          stroke="#d91e18"
          strokeWidth="0.5"
        />
        <rect
          x="-2.5"
          y="-1.5"
          width="6.5"
          height="3"
          fill="none"
          stroke="#111"
          strokeWidth="1"
        />
      </g>

      {/* Outer Numbers (0 to 10 on the OUTSIDE of outer ticks, radius 86) */}
      {outerLabels.map((item) => (
        <PolarLabel
          key={`outer-lbl-${item.n}`}
          angle={item.angle}
          radius={86}
          size={8.8}
        >
          {item.n}
        </PolarLabel>
      ))}

      {/* Inner Ticks (pointing inward to r=38) */}
      {innerTicks.map((tick, i) => (
        <PolarTick
          key={`inner-${i}`}
          angle={tick.angle}
          inner={tick.inner}
          outer={tick.outer}
          width={tick.width}
        />
      ))}

      {/* Inner Numbers (0 to 50 on the OUTSIDE of inner ticks, radius 53) */}
      {innerLabels.map((item) => (
        <PolarLabel
          key={`inner-lbl-${item.n}`}
          angle={item.angle}
          radius={53}
          size={7.5}
        >
          {item.n}
        </PolarLabel>
      ))}

      {/* Curved "DIFF PRESS" Text in gap between 10 and 0 */}
      <text
        fill="white"
        fontSize="7.2"
        fontFamily="monospace"
        fontWeight="bold"
        letterSpacing="0.5"
      >
        <textPath href="#diff-press-path" startOffset="50%" textAnchor="middle">
          DIFF PRESS
        </textPath>
      </text>

      {/* Curved "PSI" Text centered under DIFF PRESS */}
      <text
        fill="white"
        fontSize="7.2"
        fontFamily="monospace"
        fontWeight="bold"
        letterSpacing="0.5"
      >
        <textPath href="#psi-path" startOffset="50%" textAnchor="middle">
          PSI
        </textPath>
      </text>

      {/* Center Labels */}
      <text
        x="100"
        y="73"
        fill="white"
        fontSize="9.5"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
      >
        CABIN
      </text>
      <text
        x="100"
        y="84"
        fill="white"
        fontSize="9.5"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
      >
        ALT
      </text>
      <text
        x="100"
        y="122"
        fill="white"
        fontSize="6.5"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
      >
        X 1000 FEET
      </text>

      {/* 1. Long Needle (Cabin Altitude Needle - pointing to ~25.5k ft at angle ~235°) */}
      {/* Rectangular body tapering to a trapezoidal tip, extending near the white circle */}
      <g transform="translate(100, 100) rotate(235)">
        <polygon
          points="-12,2.5 -12,-2.5 45,-2.5 61,-0.8 61,0.8 45,2.5"
          fill="#ffffff"
          stroke="#222"
          strokeWidth="0.5"
        />
      </g>

      {/* 2. Short Wedge Needle (Differential Pressure Needle - pointing to ~0 PSI / ~3 o'clock) */}
      {/* Trapezoidal shape, wide base, narrow flat tip */}
      <g transform="translate(100, 100) rotate(90)">
        <polygon
          points="0,-5.5 36,-1 36,1 0,5.5"
          fill="#ffffff"
          stroke="#222"
          strokeWidth="0.5"
        />
      </g>

      {/* 3. Center Hub Cap (larger disc with metallic grey ring) */}
      <circle
        cx="100"
        cy="100"
        r="14.5"
        fill="#111315"
        stroke="#585d60"
        strokeWidth="3.5"
      />

      {/* Left Bezel White Triangular Bug */}
      <polygon points="0,100 12,96 12,104" fill="#ffffff" />
    </svg>
  );
}

export function CabinClimbGauge() {
  // Upper climb ticks (from 0 up to 4.0) - major ticks extend OUTWARDS
  const upTicks = [
    // 0 to .5 (5 steps)
    ...Array.from({ length: 5 }, (_, i) => ({
      angle: -90 + (i + 1) * 6.8,
      inner: 61,
      outer: i + 1 === 5 ? 72 : 68,
      width: i + 1 === 5 ? 1.5 : 1.0,
    })),
    // .5 to 1.0 (10 steps)
    ...Array.from({ length: 10 }, (_, i) => {
      const step = i + 1;
      const isMajor = step === 10;
      const isMedium = step % 2 === 0;
      return {
        angle: -56 + step * 4.0,
        inner: 61,
        outer: isMajor ? 77 : isMedium ? 72 : 68,
        width: isMajor ? 2.2 : isMedium ? 1.5 : 1.0,
      };
    }),
    // 1.0 to 2.0 (10 steps)
    ...Array.from({ length: 10 }, (_, i) => {
      const step = i + 1;
      const isMajor = step === 10;
      const isMedium = step === 5;
      return {
        angle: -16 + step * 5.2,
        inner: 61,
        outer: isMajor ? 77 : isMedium ? 72 : 68,
        width: isMajor ? 2.2 : isMedium ? 1.5 : 1.0,
      };
    }),
    // 2.0 to 3.0
    { angle: 51, inner: 61, outer: 72, width: 1.5 },
    { angle: 66, inner: 61, outer: 77, width: 2.2 },
    // 3.0 to 4.0
    { angle: 78, inner: 61, outer: 72, width: 1.5 },
  ];

  // Lower down ticks (from 0 down to 4.0) - major ticks extend OUTWARDS
  const downTicks = [
    // 0 to .5 (5 steps)
    ...Array.from({ length: 5 }, (_, i) => ({
      angle: -90 - (i + 1) * 6.8,
      inner: 61,
      outer: i + 1 === 5 ? 72 : 68,
      width: i + 1 === 5 ? 1.5 : 1.0,
    })),
    // .5 to 1.0 (10 steps)
    ...Array.from({ length: 10 }, (_, i) => {
      const step = i + 1;
      const isMajor = step === 10;
      const isMedium = step % 2 === 0;
      return {
        angle: -124 - step * 4.0,
        inner: 61,
        outer: isMajor ? 77 : isMedium ? 72 : 68,
        width: isMajor ? 2.2 : isMedium ? 1.5 : 1.0,
      };
    }),
    // 1.0 to 2.0 (10 steps)
    ...Array.from({ length: 10 }, (_, i) => {
      const step = i + 1;
      const isMajor = step === 10;
      const isMedium = step === 5;
      return {
        angle: -164 - step * 5.2,
        inner: 61,
        outer: isMajor ? 77 : isMedium ? 72 : 68,
        width: isMajor ? 2.2 : isMedium ? 1.5 : 1.0,
      };
    }),
    // 2.0 to 3.0
    { angle: 129, inner: 61, outer: 72, width: 1.5 },
    { angle: 114, inner: 61, outer: 77, width: 2.2 },
    // 3.0 to 4.0
    { angle: 102, inner: 61, outer: 72, width: 1.5 },
  ];

  const climbLabels = [
    { value: ".5", angle: -56 },
    { value: "1", angle: -16 },
    { value: "2", angle: 36 },
    { value: "3", angle: 66 },
    { value: ".5", angle: -124 },
    { value: "1", angle: -164 },
    { value: "2", angle: 144 },
    { value: "3", angle: 114 },
  ];

  return (
    <svg
      className="cabin-climb-gauge"
      viewBox="0 0 200 200"
      role="img"
      aria-label="Cabin climb indicator"
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Adjusted radius arcs so texts sit comfortably between hub and ticks */}
        <path
          id="climb-title-path"
          d="M 56 100 A 44 44 0 0 1 144 100"
          fill="none"
        />
        <path
          id="climb-unit-path"
          d="M 45 100 A 55 55 0 0 0 155 100"
          fill="none"
        />
      </defs>

      {/* Main Solid Black Gauge Dial (No outer grey stroke) */}
      <circle cx="100" cy="100" r="98" fill="#000000" />

      {/* Major Tick for 0 at 9 o'clock */}
      <line
        x1="23"
        y1="100"
        x2="39"
        y2="100"
        stroke="#ffffff"
        strokeWidth="2.2"
      />

      {/* Upper Scale Ticks */}
      {upTicks.map((tick, i) => (
        <PolarTick
          key={`climb-up-${i}`}
          angle={tick.angle}
          inner={tick.inner}
          outer={tick.outer}
          width={tick.width}
        />
      ))}

      {/* Lower Scale Ticks */}
      {downTicks.map((tick, i) => (
        <PolarTick
          key={`climb-dn-${i}`}
          angle={tick.angle}
          inner={tick.inner}
          outer={tick.outer}
          width={tick.width}
        />
      ))}

      {/* Scale Numbers (OUTSIDE the scale at radius 87, enlarged) */}
      {climbLabels.map(({ value, angle }) => (
        <PolarLabel
          key={`climb-lbl-${value}-${angle}`}
          angle={angle}
          radius={87}
          size={14}
        >
          {value}
        </PolarLabel>
      ))}

      {/* 0 Label and UP/DN Indicators at 9 o'clock */}
      <text
        x="13"
        y="73"
        fill="#ffffff"
        fontSize="9"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        UP
      </text>
      <line
        x1="13"
        y1="84"
        x2="13"
        y2="78"
        stroke="#ffffff"
        strokeWidth="1.2"
      />
      <polygon points="11.5,80 13,76 14.5,80" fill="#ffffff" />

      <text
        x="13"
        y="104.5"
        fill="#ffffff"
        fontSize="14"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        0
      </text>

      <line
        x1="13"
        y1="114"
        x2="13"
        y2="120"
        stroke="#ffffff"
        strokeWidth="1.2"
      />
      <polygon points="11.5,118 13,122 14.5,118" fill="#ffffff" />
      <text
        x="13"
        y="132"
        fill="#ffffff"
        fontSize="9"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        DN
      </text>

      {/* Bracket at 4 (3 o'clock position): Two radial major ticks joined by a vertical spine */}
      <PolarTick angle={84} inner={61} outer={77} width={2.2} />
      <PolarTick angle={96} inner={61} outer={77} width={2.2} />
      <line
        x1="174"
        y1="92.2"
        x2="174"
        y2="107.8"
        stroke="#ffffff"
        strokeWidth="1.8"
      />
      <text
        x="187"
        y="104.5"
        fill="#ffffff"
        fontSize="14"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
      >
        4
      </text>

      {/* Curved "CABIN CLIMB" Text (Bold, large font, lowered) */}
      <text
        fill="#ffffff"
        fontSize="14"
        fontFamily="monospace, sans-serif"
        fontWeight="bold"
        letterSpacing="0.8"
      >
        <textPath
          href="#climb-title-path"
          startOffset="50%"
          textAnchor="middle"
        >
          CABIN CLIMB
        </textPath>
      </text>

      {/* Curved "1000 FEET PER MIN" Blue Text (Bold, raised) */}
      <text
        fill="#0055ff"
        fontSize="11.5"
        fontFamily="monospace, sans-serif"
        fontWeight="bold"
        letterSpacing="0.3"
      >
        <textPath href="#climb-unit-path" startOffset="50%" textAnchor="middle">
          1000 FEET PER MIN
        </textPath>
      </text>

      {/* Needle: White Tail Block on right */}
      <rect x="100" y="95" width="23" height="10" fill="#ffffff" />

      {/* Needle: White Tapered Pointer on left */}
      <polygon points="100,96 38,98.5 38,101.5 100,104" fill="#ffffff" />

      {/* Center Hub Cap (disc with metallic grey ring) */}
      <circle
        cx="100"
        cy="100"
        r="13"
        fill="#0d0e10"
        stroke="#555a5d"
        strokeWidth="2.5"
      />
    </svg>
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
        <button
          className="horn-cutout"
          aria-label="ALT HORN CUTOUT"
          type="button"
        />
      </div>
      <Screw className="s1" />
      <Screw className="s2" />
      <Screw className="s3" />
      <Screw className="s4" />
    </section>
  );
}
