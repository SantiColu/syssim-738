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
  const isDown = (numPositions === 3 && currentPos === 2) || (numPositions <= 2 && currentPos === 1);

  const togglePos: "UP" | "CENTER" | "DOWN" = isUp ? "UP" : isCenter ? "CENTER" : "DOWN";

  const renderLabel = (label: string | string[] | undefined, marginClass: string) => {
    if (!label) return null;
    return (
      <div className={`flex flex-col items-center gap-[2px] ${marginClass}`}>
        {(Array.isArray(label) ? label : [label]).map((line, i) => (
          <span key={i} className="text-white bg-[#7a8183] px-1 py-[1px] leading-none text-[10px] whitespace-nowrap">
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
          <div className={`absolute top-1/2 -translate-y-1/2 ${align === "left" ? "right-[40px] items-end" : "left-[40px] items-start"} flex flex-col justify-between h-[36px] z-10 min-w-[24px] ${positionsOffset}`}>
            {positions.map((p, i) => (
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
              )
            ))}
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
      className={`border-2 flex items-center justify-center text-center px-1 font-mono text-[9px] leading-tight w-[74px] h-[30px] shadow-[inset_0_0_8px_rgba(0,0,0,0.8)] transition-all duration-100 ${
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
  const [tripResetClicks, setTripResetClicks] = useState(0);

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
      <section className="relative w-[400px] h-[550px] bg-[#9ba1a2] border-4 border-gray-700 mx-auto overflow-hidden font-mono select-none shadow-[0_10px_30px_rgba(0,0,0,0.8)] scale-95 origin-center">
        
        {/* Top Dark Strip */}
        <div className="absolute top-0 left-0 w-full h-[65px] bg-[#898e90] border-b-[1px] border-[#6b7173] z-0" />

        {/* Flow Lines (SVG Background) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" fill="none">
          <path className="stroke-white" strokeWidth="5" d={paths} strokeLinecap="square" strokeLinejoin="miter" />
          <path className="stroke-[#737a7c]" strokeWidth="2.5" d={paths} strokeLinecap="square" strokeLinejoin="miter" />
        </svg>

        {/* BLEED Bottom Line */}
        <div className="absolute bottom-[10px] left-[50px] right-[50px] h-[2px] bg-white z-0" />

        {/* Top Section */}
        {/* Annunciators */}
        <div className="absolute top-[15px] left-[130px] -translate-x-1/2 flex gap-0 z-20">
          <Annunciator color="amber">DUAL<br/>BLEED</Annunciator>
          <Annunciator color="blue">RAM DOOR<br/>FULL OPEN</Annunciator>
        </div>
        <div className="absolute top-[15px] left-[290px] -translate-x-1/2 flex gap-0 z-20">
          <Annunciator color="blue">RAM DOOR<br/>FULL OPEN</Annunciator>
        </div>

        {/* Recirc Fans */}
        <div className="absolute top-[75px] left-[60px] -translate-x-1/2">
          <ToggleSwitch labelTop="L RECIRC FAN" positions={["OFF", "AUTO"]} activePos={1} align="right" circleColor="red" />
        </div>
        <div className="absolute top-[75px] left-[340px] -translate-x-1/2">
          <ToggleSwitch labelTop="R RECIRC FAN" positions={["OFF", "AUTO"]} activePos={1} align="left" circleColor="red" />
        </div>

        {/* Middle Section: Gauge and OVHT TEST */}
        {/* Black Cone for Gauge */}
        <svg className="absolute top-[165px] left-[105px] w-[40px] h-[70px] z-0" viewBox="0 0 40 70">
          <path d="M 40,0 L 5,20 Q 0,25 0,35 Q 0,45 5,50 L 40,70 Z" fill="black" />
        </svg>

        {/* Gauge Outer Rim */}
        <div className="absolute top-[135px] left-1/2 -translate-x-1/2 w-[130px] h-[130px] bg-black rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.5)] z-10 flex items-center justify-center">
          {/* Gauge Inner Face */}
          <div className="relative w-[120px] h-[120px] bg-[#1a1c1d] rounded-full border-[3px] border-[#6b7173] flex items-center justify-center">
            
            {/* Circular Track */}
            <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 120 120">
              <path d="M 82 98.1 A 44 44 0 1 1 82 21.9" fill="none" stroke="white" strokeWidth="1.5" />
            </svg>
            
            {/* Ticks */}
            {Array.from({ length: 17 }).map((_, i) => {
              const angle = 150 + i * 15;
              const isMajor = i % 2 === 0;
              return (
                <div
                  key={i}
                  className="absolute top-0 left-1/2 w-[2px] h-[60px] origin-bottom -ml-[1px]"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div className={`w-full bg-white ${isMajor ? "h-[10px] mt-[6px]" : "h-[6px] mt-[10px]"}`} />
                </div>
              );
            })}
            
            {/* Numbers */}
            <span className="absolute text-white text-[10px] font-bold z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: '77px', top: '89px' }}>0</span>
            <span className="absolute text-white text-[10px] font-bold z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: '43px', top: '89px' }}>20</span>
            <span className="absolute text-white text-[10px] font-bold z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: '26px', top: '60px' }}>40</span>
            <span className="absolute text-white text-[10px] font-bold z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: '43px', top: '31px' }}>60</span>
            <span className="absolute text-white text-[10px] font-bold z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: '77px', top: '31px' }}>80</span>
            
            {/* DUCT PRESS PSI */}
            <div className="absolute top-1/2 left-[62%] -translate-y-1/2 text-white text-[7px] font-bold leading-tight z-10">
              DUCT<br/>PRESS<br/>PSI
            </div>
            
            {/* L Needle */}
            <div className="absolute top-1/2 left-1/2 w-[12px] h-[54px] origin-bottom -ml-[6px] -mt-[54px] z-20 flex flex-col items-center" style={{ transform: "rotate(255deg)" }}>
              <div className="w-0 h-0 border-l-[2px] border-r-[2px] border-b-[18px] border-transparent border-b-white" />
              <div className="w-[3px] h-[8px] bg-white" />
              <div className="w-[11px] h-[14px] bg-white flex items-center justify-center rounded-[1px]">
                <span className="text-[9px] font-bold text-black leading-none mt-[1px]" style={{ transform: "rotate(-255deg)" }}>L</span>
              </div>
              <div className="w-[3px] h-[14px] bg-white" />
            </div>

            {/* R Needle */}
            <div className="absolute top-1/2 left-1/2 w-[12px] h-[54px] origin-bottom -ml-[6px] -mt-[54px] z-20 flex flex-col items-center" style={{ transform: "rotate(225deg)" }}>
              <div className="w-0 h-0 border-l-[2px] border-r-[2px] border-b-[18px] border-transparent border-b-white" />
              <div className="w-[3px] h-[8px] bg-white" />
              <div className="w-[11px] h-[14px] bg-white flex items-center justify-center rounded-[1px]">
                <span className="text-[9px] font-bold text-black leading-none mt-[1px]" style={{ transform: "rotate(-225deg)" }}>R</span>
              </div>
              <div className="w-[3px] h-[14px] bg-white" />
            </div>

            {/* Center Pivot */}
            <div className="absolute top-1/2 left-1/2 w-5 h-5 bg-black rounded-full border-[2px] border-white -ml-2.5 -mt-2.5 z-30 shadow-md flex items-center justify-center">
              <div className="w-2 h-2 rounded-full border-[1.5px] border-white" />
            </div>
          </div>
        </div>
        
        {/* OVHT TEST */}
        <div className="absolute top-[175px] left-[320px] -translate-x-1/2">
          <AircraftPushButton
            labelTop="OVHT"
            labelBottom="TEST"
            onPressStart={() => setIsOvhtTest(true)}
            onPressEnd={() => setIsOvhtTest(false)}
            size={36}
          />
        </div>

        {/* Control Switches (L PACK, ISO, R PACK) */}
        <div className="absolute top-[270px] left-[80px] -translate-x-1/2">
          <ToggleSwitch labelTop="L PACK" positions={["OFF", "AUTO", "HIGH"]} activePos={1} />
        </div>
        <div className="absolute top-[268px] left-[200px] -translate-x-1/2">
          <ToggleSwitch labelTop={["ISOLATION", "VALVE", "CLOSE"]} labelBottom="OPEN" positions={["", "AUTO", ""]} activePos={1} positionsOffset="-mt-2" />
        </div>
        <div className="absolute top-[270px] left-[320px] -translate-x-1/2">
          <ToggleSwitch labelTop="R PACK" positions={["OFF", "AUTO", "HIGH"]} activePos={1} align="left" />
        </div>

        {/* Annunciators Grid */}
        <div className="absolute top-[360px] left-[140px] -translate-x-1/2 flex flex-col gap-[2px] z-10">
          <Annunciator color="amber">PACK</Annunciator>
          <Annunciator color="amber" lit={isOvhtTest}>WING-BODY<br/>OVERHEAT</Annunciator>
          <Annunciator color="amber">BLEED<br/>TRIP OFF</Annunciator>
        </div>
        <div className="absolute top-[360px] left-[260px] -translate-x-1/2 flex flex-col gap-[2px] z-10">
          <Annunciator color="amber">PACK</Annunciator>
          <Annunciator color="amber" lit={isOvhtTest}>WING-BODY<br/>OVERHEAT</Annunciator>
          <Annunciator color="amber">BLEED<br/>TRIP OFF</Annunciator>
        </div>

        {/* TRIP RESET Button */}
        <div className="absolute top-[407px] left-[200px] -translate-x-1/2">
          <AircraftPushButton
            labelTop="TRIP"
            labelBottom="RESET"
            onClick={() => setTripResetClicks((c) => c + 1)}
            size={36}
          />
        </div>

        {/* Wing Anti Ice Labels */}
        <div className="absolute top-[360px] left-[40px] -translate-x-1/2 z-10">
          <div className="text-white bg-[#7a8183] border border-white px-[3px] py-1 text-[9px] text-center leading-tight tracking-widest whitespace-nowrap">
            WING<br/>ANTI<br/>ICE
          </div>
        </div>
        <div className="absolute top-[360px] left-[360px] -translate-x-1/2 z-10">
          <div className="text-white bg-[#7a8183] border border-white px-[3px] py-1 text-[9px] text-center leading-tight tracking-widest whitespace-nowrap">
            WING<br/>ANTI<br/>ICE
          </div>
        </div>

        {/* Bottom Switches (Eng1, APU, Eng2) */}
        <div className="absolute top-[475px] left-[80px] -translate-x-1/2">
          <ToggleSwitch labelBottom="1" positions={["OFF", "ON"]} activePos={1} align="right" />
        </div>
        <div className="absolute top-[475px] left-[150px] -translate-x-1/2">
          <ToggleSwitch labelBottom="APU" positions={[]} activePos={0} />
        </div>
        <div className="absolute top-[475px] left-[320px] -translate-x-1/2">
          <ToggleSwitch labelBottom="2" positions={["OFF", "ON"]} activePos={1} align="left" />
        </div>

        {/* Bottom Label */}
        <div className="absolute bottom-[4px] left-[200px] -translate-x-1/2 text-white bg-[#7a8183] px-2 py-0.5 text-[11px] z-10 tracking-widest">
          BLEED
        </div>
      </section>
    </div>
  );
}
