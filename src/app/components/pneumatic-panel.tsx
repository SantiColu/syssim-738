"use client";

import React, { useState } from "react";
import { AircraftToggleSwitch, AircraftPushButton } from "./aircraft-panels";

function ToggleSwitch({
  labelTop,
  labelBottom,
  positions = [],
  activePos: initialPos = 0,
  align = "right",
  circleColor = "black",
  positionsOffset = "",
}: {
  labelTop?: string | string[];
  labelBottom?: string | string[];
  positions?: string[];
  activePos?: number;
  align?: "left" | "right";
  circleColor?: "black" | "red";
  positionsOffset?: string;
}) {
  const [currentPos, setCurrentPos] = useState(initialPos);

  const numPositions = positions.length > 0 ? positions.length : 2;

  const handleClick = () => {
    setCurrentPos((prev) => (prev + 1) % numPositions);
  };

  const handleWheel = (dir: number) => {
    // dir < 0 is scroll up -> move towards 0 (UP)
    // dir > 0 is scroll down -> move towards numPositions - 1 (DOWN)
    setCurrentPos((prev) => {
      if (dir < 0) {
        return Math.max(0, prev - 1);
      } else {
        return Math.min(numPositions - 1, prev + 1);
      }
    });
  };

  const isUp = currentPos === 0;
  const isCenter = numPositions === 3 && currentPos === 1;
  const togglePos: "UP" | "CENTER" | "DOWN" = isUp
    ? "UP"
    : isCenter
      ? "CENTER"
      : "DOWN";

  const renderLabel = (
    label: string | string[] | undefined,
    marginClass: string,
  ) => {
    if (!label) return null;
    return (
      <div className={`flex flex-col items-center gap-0.5 ${marginClass}`}>
        {(Array.isArray(label) ? label : [label]).map((line, i) => (
          <span
            key={i}
            className="text-white bg-[#7a8183] px-1 py-px leading-none text-[10px] whitespace-nowrap"
          >
            {line}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center relative z-20 font-mono">
      {renderLabel(labelTop, "mb-1.5")}

      <div className="relative flex items-center justify-center z-10">
        <AircraftToggleSwitch
          position={togglePos}
          circleColor={circleColor}
          onClick={handleClick}
          onWheelStep={handleWheel}
          size={38}
        />

        {positions.length > 0 && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${align === "left" ? "right-10 items-end" : "left-10 items-start"} flex h-9 min-w-6 flex-col justify-between z-10 ${positionsOffset}`}
          >
            {positions.map((p, i) =>
              p ? (
                <span
                  key={i}
                  onClick={() => setCurrentPos(i)}
                  className="px-0.5 text-white bg-[#7a8183] text-[9px] font-bold leading-none whitespace-nowrap cursor-pointer"
                >
                  {p}
                </span>
              ) : (
                <span key={i} />
              ),
            )}
          </div>
        )}
      </div>

      {renderLabel(labelBottom, "mt-1.5")}
    </div>
  );
}

function Annunciator({
  color,
  children,
  lit = true,
}: {
  color: "amber" | "blue";
  children: React.ReactNode;
  lit?: boolean;
}) {
  const isAmber = color === "amber";
  return (
    <div
      className={`border-2 flex items-center justify-center text-center px-1 font-mono text-[9px] leading-tight w-18.5 h-7.5 shadow-[inset_0_0_8px_rgba(0,0,0,0.8)] transition-all duration-100 ${
        lit
          ? isAmber
            ? "border-[#ffb300] text-[#ffb300] bg-black shadow-[0_0_8px_rgba(255,179,0,0.5),inset_0_0_8px_rgba(255,179,0,0.3)]"
            : "border-blue-600 text-blue-500 bg-black shadow-[0_0_8px_rgba(37,99,235,0.5),inset_0_0_8px_rgba(37,99,235,0.3)]"
          : "border-[#4a4e50] text-[#555a5c] bg-[#0c0d0e]"
      }`}
    >
      {children}
    </div>
  );
}

export function PneumaticPanel() {
  const [isOvhtTest, setIsOvhtTest] = useState(false);

  const paths = `
    M 80 491 L 80 320
    M 80 375 L 55 375
    
    M 320 491 L 320 320
    M 320 375 L 345 375
    
    M 150 491 L 150 465 L 80 465
    
    M 80 330 L 320 330
  `;

  return (
    <div className="flex size-full items-center justify-center">
      <section className="relative w-100 h-137.5 bg-[#858585]  overflow-hidden font-mono select-none shadow-[0_10px_30px_rgba(0,0,0,0.8)] scale-95 origin-center">
        {/* Top Dark Strip */}
        <div className="absolute top-0 left-0 w-full h-16.25 bg-[#858585] border-b border-[#6b7173] z-0" />

        {/* Flow Lines (SVG Background) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          fill="none"
        >
          <path
            className="stroke-white"
            strokeWidth="5"
            d={paths}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <path
            className="stroke-[#737a7c]"
            strokeWidth="2.5"
            d={paths}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>

        {/* BLEED Bottom Line */}
        <div className="absolute bottom-2.5 left-12.5 right-12.5 h-0.5 bg-white z-0" />

        {/* Top Section */}
        {/* Annunciators */}
        <div className="absolute top-3.75 left-32.5 -translate-x-1/2 flex gap-0 z-20">
          <Annunciator color="amber">
            DUAL
            <br />
            BLEED
          </Annunciator>
          <Annunciator color="blue">
            RAM DOOR
            <br />
            FULL OPEN
          </Annunciator>
        </div>
        <div className="absolute top-3.75 left-72.5 -translate-x-1/2 flex gap-0 z-20">
          <Annunciator color="blue">
            RAM DOOR
            <br />
            FULL OPEN
          </Annunciator>
        </div>

        {/* Recirc Fans */}
        <div className="absolute top-18.75 left-15 -translate-x-1/2">
          <ToggleSwitch
            labelTop="L RECIRC FAN"
            positions={["OFF", "AUTO"]}
            activePos={1}
            align="right"
            circleColor="red"
          />
        </div>
        <div className="absolute top-18.75 left-85 -translate-x-1/2">
          <ToggleSwitch
            labelTop="R RECIRC FAN"
            positions={["OFF", "AUTO"]}
            activePos={1}
            align="left"
            circleColor="red"
          />
        </div>

        {/* Middle Section: Gauge and OVHT TEST */}
        {/* Black Cone for Gauge */}
        <svg
          className="absolute top-41.25 left-26.25 w-10 h-17.5 z-0"
          viewBox="0 0 40 70"
        >
          <path
            d="M 40,0 L 5,20 Q 0,25 0,35 Q 0,45 5,50 L 40,70 Z"
            fill="black"
          />
        </svg>

        {/* Gauge Outer Rim */}
        <div className="absolute top-33.75 left-1/2 -translate-x-1/2 w-32.5 h-32.5 bg-black rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.5)] z-10 flex items-center justify-center">
          {/* Gauge Inner Face */}
          <div className="relative w-30 h-30 bg-[#1a1c1d] rounded-full border-[3px] border-[#6b7173] flex items-center justify-center">
            {/* Circular Track */}
            <svg
              className="absolute inset-0 w-full h-full z-0"
              viewBox="0 0 120 120"
            >
              <path
                d="M 82 98.1 A 44 44 0 1 1 82 21.9"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>

            {/* Ticks */}
            {Array.from({ length: 17 }).map((_, i) => {
              const angle = 150 + i * 15;
              const isMajor = i % 2 === 0;
              return (
                <div
                  key={i}
                  className="absolute top-0 left-1/2 w-0.5 h-15 origin-bottom -ml-px"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div
                    className={`w-full bg-white ${isMajor ? "h-2.5 mt-1.5" : "h-1.5 mt-2.5"}`}
                  />
                </div>
              );
            })}

            {/* Numbers */}
            <span
              className="absolute text-white text-[10px] font-bold z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: "77px", top: "89px" }}
            >
              0
            </span>
            <span
              className="absolute text-white text-[10px] font-bold z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: "43px", top: "89px" }}
            >
              20
            </span>
            <span
              className="absolute text-white text-[10px] font-bold z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: "26px", top: "60px" }}
            >
              40
            </span>
            <span
              className="absolute text-white text-[10px] font-bold z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: "43px", top: "31px" }}
            >
              60
            </span>
            <span
              className="absolute text-white text-[10px] font-bold z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: "77px", top: "31px" }}
            >
              80
            </span>

            {/* DUCT PRESS PSI */}
            <div className="absolute top-1/2 left-[62%] -translate-y-1/2 text-white text-[7px] font-bold leading-tight z-10">
              DUCT
              <br />
              PRESS
              <br />
              PSI
            </div>

            {/* L Needle */}
            <div
              className="absolute top-1/2 left-1/2 w-3 h-13.5 origin-bottom -ml-1.5 -mt-13.5 z-20 flex flex-col items-center"
              style={{ transform: "rotate(255deg)" }}
            >
              <div className="w-0 h-0 border-l-2 border-r-2 border-b-18 border-transparent border-b-white" />
              <div className="w-0.75 h-2 bg-white" />
              <div className="w-2.75 h-3.5 bg-white flex items-center justify-center rounded-[1px]">
                <span
                  className="text-[9px] font-bold text-black leading-none mt-px"
                  style={{ transform: "rotate(-255deg)" }}
                >
                  L
                </span>
              </div>
              <div className="w-0.75 h-3.5 bg-white" />
            </div>

            {/* R Needle */}
            <div
              className="absolute top-1/2 left-1/2 w-3 h-13.5 origin-bottom -ml-1.5 -mt-13.5 z-20 flex flex-col items-center"
              style={{ transform: "rotate(225deg)" }}
            >
              <div className="w-0 h-0 border-l-2 border-r-2 border-b-18 border-transparent border-b-white" />
              <div className="w-0.75 h-2 bg-white" />
              <div className="w-2.75 h-3.5 bg-white flex items-center justify-center rounded-[1px]">
                <span
                  className="text-[9px] font-bold text-black leading-none mt-px"
                  style={{ transform: "rotate(-225deg)" }}
                >
                  R
                </span>
              </div>
              <div className="w-0.75 h-3.5 bg-white" />
            </div>

            {/* Center Pivot */}
            <div className="absolute top-1/2 left-1/2 w-5 h-5 bg-black rounded-full border-2 border-white -ml-2.5 -mt-2.5 z-30 shadow-md flex items-center justify-center">
              <div className="w-2 h-2 rounded-full border-[1.5px] border-white" />
            </div>
          </div>
        </div>

        {/* OVHT TEST */}
        <div className="absolute top-43.75 left-80 -translate-x-1/2">
          <AircraftPushButton
            labelTop="OVHT"
            labelBottom="TEST"
            onPressStart={() => setIsOvhtTest(true)}
            onPressEnd={() => setIsOvhtTest(false)}
            size={36}
          />
        </div>

        {/* Control Switches (L PACK, ISO, R PACK) */}
        <div className="absolute top-67.5 left-20 -translate-x-1/2">
          <ToggleSwitch
            labelTop="L PACK"
            positions={["OFF", "AUTO", "HIGH"]}
            activePos={1}
          />
        </div>
        <div className="absolute top-67 left-50 -translate-x-1/2">
          <ToggleSwitch
            labelTop={["ISOLATION", "VALVE", "CLOSE"]}
            labelBottom="OPEN"
            positions={["", "AUTO", ""]}
            activePos={1}
            positionsOffset="-mt-2"
          />
        </div>
        <div className="absolute top-67.5 left-80 -translate-x-1/2">
          <ToggleSwitch
            labelTop="R PACK"
            positions={["OFF", "AUTO", "HIGH"]}
            activePos={1}
            align="left"
          />
        </div>

        {/* Annunciators Grid */}
        <div className="absolute top-90 left-35 -translate-x-1/2 flex flex-col gap-0.5 z-10">
          <Annunciator color="amber">PACK</Annunciator>
          <Annunciator color="amber" lit={isOvhtTest}>
            WING-BODY
            <br />
            OVERHEAT
          </Annunciator>
          <Annunciator color="amber">
            BLEED
            <br />
            TRIP OFF
          </Annunciator>
        </div>
        <div className="absolute top-90 left-65 -translate-x-1/2 flex flex-col gap-0.5 z-10">
          <Annunciator color="amber">PACK</Annunciator>
          <Annunciator color="amber" lit={isOvhtTest}>
            WING-BODY
            <br />
            OVERHEAT
          </Annunciator>
          <Annunciator color="amber">
            BLEED
            <br />
            TRIP OFF
          </Annunciator>
        </div>

        {/* TRIP RESET Button */}
        <div className="absolute top-101.75 left-50 -translate-x-1/2">
          <AircraftPushButton labelTop="TRIP" labelBottom="RESET" size={36} />
        </div>

        {/* Wing Anti Ice Labels */}
        <div className="absolute top-90 left-10 -translate-x-1/2 z-10">
          <div className="text-white bg-[#7a8183] border border-white px-0.75 py-1 text-[9px] text-center leading-tight tracking-widest whitespace-nowrap">
            WING
            <br />
            ANTI
            <br />
            ICE
          </div>
        </div>
        <div className="absolute top-90 left-90 -translate-x-1/2 z-10">
          <div className="text-white bg-[#7a8183] border border-white px-0.75 py-1 text-[9px] text-center leading-tight tracking-widest whitespace-nowrap">
            WING
            <br />
            ANTI
            <br />
            ICE
          </div>
        </div>

        {/* Bottom Switches (Eng1, APU, Eng2) */}
        <div className="absolute top-118.75 left-20 -translate-x-1/2">
          <ToggleSwitch
            labelBottom="1"
            positions={["OFF", "ON"]}
            activePos={1}
            align="right"
          />
        </div>
        <div className="absolute top-118.75 left-37.5 -translate-x-1/2">
          <ToggleSwitch labelBottom="APU" positions={[]} activePos={0} />
        </div>
        <div className="absolute top-118.75 left-80 -translate-x-1/2">
          <ToggleSwitch
            labelBottom="2"
            positions={["OFF", "ON"]}
            activePos={1}
            align="left"
          />
        </div>

        {/* Bottom Label */}
        <div className="absolute bottom-1 left-50 -translate-x-1/2 text-white bg-[#7a8183] px-2 py-0.5 text-[11px] z-10 tracking-widest">
          BLEED
        </div>
      </section>
    </div>
  );
}
