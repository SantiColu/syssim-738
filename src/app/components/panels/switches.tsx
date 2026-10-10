"use client";

import { useState, useRef, useEffect } from "react";

export function AircraftToggleSwitch({
  position = "DOWN",
  circleColor = "black",
  orientation = "vertical",
  onClick,
  onWheelStep,
  size = 40,
}: {
  position?: "UP" | "CENTER" | "DOWN";
  circleColor?: "black" | "red" | "light";
  orientation?: "vertical" | "horizontal";
  onClick?: () => void;
  onWheelStep?: (direction: number) => void;
  size?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUp = position === "UP";
  const isCenter = position === "CENTER";
  const isDown = position === "DOWN";

  const targetY = isUp ? -19 : isCenter ? 0 : 19;
  const stemEndY = targetY * 0.85;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onWheelStep) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // deltaY < 0 (scroll up) -> direction -1 (UP / LEFT / CLOSE)
      // deltaY > 0 (scroll down) -> direction 1 (DOWN / RIGHT / OPEN)
      onWheelStep(e.deltaY < 0 ? -1 : 1);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [onWheelStep]);

  const isLight = circleColor === "light";

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        cursor: "pointer",
        userSelect: "none",
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title="Interruptor (Rueda del ratón o clic para cambiar de posición)"
    >
      <svg
        viewBox="0 0 44 44"
        style={{
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        <defs>
          <radialGradient
            id={`dish-grad-${circleColor}`}
            cx="45%"
            cy="40%"
            r="55%"
          >
            {circleColor === "red" ? (
              <>
                <stop offset="0%" stopColor="#8a1a1a" />
                <stop offset="60%" stopColor="#631010" />
                <stop offset="100%" stopColor="#420808" />
              </>
            ) : isLight ? (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#e4e8ea" />
                <stop offset="85%" stopColor="#c8ced1" />
                <stop offset="100%" stopColor="#9da3a6" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#757b7d" />
                <stop offset="60%" stopColor="#555a5c" />
                <stop offset="100%" stopColor="#35393b" />
              </>
            )}
          </radialGradient>
          <radialGradient id="bat-head-grad" cx="36%" cy="32%" r="62%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#dce0e3" />
            <stop offset="75%" stopColor="#a3a8ab" />
            <stop offset="100%" stopColor="#767b7e" />
          </radialGradient>
          <linearGradient id="stem-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7e8386" />
            <stop offset="30%" stopColor="#e8ecf0" />
            <stop offset="65%" stopColor="#bec3c7" />
            <stop offset="100%" stopColor="#6e7376" />
          </linearGradient>
        </defs>

        {/* 1. Base Bezel (Concentric Rings) */}
        {/* Outer Ring */}
        <circle
          cx="22"
          cy="22"
          r="19"
          fill={isLight ? "#a8aeb1" : "#92989a"}
          stroke="#3d4143"
          strokeWidth="2.5"
        />

        {/* Sunken Cavity / Dish */}
        <circle
          cx="22"
          cy="22"
          r="15"
          fill={`url(#dish-grad-${circleColor})`}
          stroke="#323537"
          strokeWidth="2"
        />

        {/* Middle Concentric Groove */}
        <circle
          cx="22"
          cy="22"
          r="10.5"
          fill="none"
          stroke={
            circleColor === "red" ? "#8c2020" : isLight ? "#9da3a6" : "#44484a"
          }
          strokeWidth="2"
        />

        {/* Inner Pivot Center Collar */}
        <circle
          cx="22"
          cy="22"
          r="6.5"
          fill="none"
          stroke={
            circleColor === "red" ? "#a82828" : isLight ? "#b8bec1" : "#555a5c"
          }
          strokeWidth="1.6"
        />

        {/* 2. Switch Bat / Lever anchored at Center (22, 22) */}
        <g
          transform={
            orientation === "horizontal"
              ? "translate(22, 22) rotate(-90)"
              : "translate(22, 22)"
          }
          style={{
            filter: "drop-shadow(0px 3px 3.5px rgba(0, 0, 0, 0.7))",
          }}
        >
          {/* Cylindrical Stem extending from center (0, 0) */}
          {!isCenter && (
            <path
              d={`M -5 0 L -5 ${stemEndY} L 5 ${stemEndY} L 5 0 Z`}
              fill="url(#stem-grad)"
              stroke="#303335"
              strokeWidth="2.2"
              strokeLinejoin="round"
              style={{
                transition: "d 0.15s cubic-bezier(0.2, 0, 0, 1)",
              }}
            />
          )}

          {/* Stem junction collar ring */}
          {!isCenter && (
            <path
              d={
                isDown
                  ? `M -7.5 ${stemEndY} A 7.5 4 0 0 1 7.5 ${stemEndY}`
                  : `M -7.5 ${stemEndY} A 7.5 4 0 0 0 7.5 ${stemEndY}`
              }
              fill="none"
              stroke="#303335"
              strokeWidth="2"
              style={{
                transition: "all 0.15s cubic-bezier(0.2, 0, 0, 1)",
              }}
            />
          )}

          {/* Solid Rounded Bat Head (Ball) */}
          <g
            style={{
              transform: `translate(0px, ${targetY}px)`,
              transition: "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
              willChange: "transform",
            }}
          >
            <ellipse
              cx="0"
              cy="0"
              rx="8"
              ry="9"
              fill="url(#bat-head-grad)"
              stroke="#303335"
              strokeWidth="2.4"
            />

            {/* Head 3D inner contour arc */}
            {isDown && (
              <path
                d="M -5.5 -1.5 A 6 5 0 0 1 5.5 -1.5"
                fill="none"
                stroke="#45494c"
                strokeWidth="1.5"
              />
            )}
            {isUp && (
              <path
                d="M -5.5 1.5 A 6 5 0 0 0 5.5 1.5"
                fill="none"
                stroke="#45494c"
                strokeWidth="1.5"
              />
            )}
          </g>
        </g>
      </svg>
    </div>
  );
}

export function AircraftPushButton({
  labelTop,
  labelBottom,
  onPressStart,
  onPressEnd,
  onClick,
  size = 36,
}: {
  labelTop?: string | string[];
  labelBottom?: string | string[];
  onPressStart?: () => void;
  onPressEnd?: () => void;
  onClick?: () => void;
  size?: number;
}) {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = () => {
    setIsPressed(true);
    onPressStart?.();
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    onPressEnd?.();
  };

  const handleMouseLeave = () => {
    if (isPressed) {
      setIsPressed(false);
      onPressEnd?.();
    }
  };

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
    <div
      className="flex flex-col items-center relative z-20 font-sim-sans select-none cursor-pointer"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onClick={onClick}
      title="Botón pulsable (Haz clic para presionar)"
    >
      {renderLabel(labelTop, "mb-1.5")}

      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          viewBox="0 0 44 44"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
        >
          <defs>
            {/* Recessed Inner Bezel Gradient */}
            <radialGradient id="recess-bevel-grad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#e2e6e8" />
              <stop offset="55%" stopColor="#b2b7ba" />
              <stop offset="85%" stopColor="#7a8083" />
              <stop offset="100%" stopColor="#45494b" />
            </radialGradient>

            {/* Plunger Button Cap Gradient */}
            <radialGradient id="plunger-cap-grad" cx="38%" cy="36%" r="62%">
              <stop offset="0%" stopColor="#3a3d3f" />
              <stop offset="40%" stopColor="#202224" />
              <stop offset="80%" stopColor="#111213" />
              <stop offset="100%" stopColor="#080909" />
            </radialGradient>
          </defs>

          {/* 1. Base Bezel Rings */}
          {/* Outer Ring */}
          <circle
            cx="22"
            cy="22"
            r="19"
            fill="#92989a"
            stroke="#3d4143"
            strokeWidth="2.5"
          />

          {/* Recessed Metallic Bevel Ring */}
          <circle
            cx="22"
            cy="22"
            r="15"
            fill="url(#recess-bevel-grad)"
            stroke="#383c3e"
            strokeWidth="2"
          />

          {/* Crescent Highlight on the metal rim */}
          <path
            d="M 9.5 22 A 12.5 12.5 0 0 1 34.5 22"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.8"
            opacity="0.75"
          />

          {/* Inner Deep Dark Cavity / Socket */}
          <circle
            cx="22"
            cy="22"
            r="11.5"
            fill="#121314"
            stroke="#26292a"
            strokeWidth="1.5"
          />

          {/* 2. Plunger (The Pressable Central Button) */}
          <g
            style={{
              transform: isPressed
                ? "translate(22px, 23px) scale(0.92)"
                : "translate(22px, 22px) scale(1)",
              transformOrigin: "center",
              transition: "transform 0.08s ease-out, filter 0.08s ease-out",
              filter: isPressed
                ? "drop-shadow(0px 0.5px 1px rgba(0, 0, 0, 0.9))"
                : "drop-shadow(0px 2.5px 3px rgba(0, 0, 0, 0.75))",
            }}
          >
            {/* Plunger Black Body */}
            <circle
              cx="0"
              cy="0"
              r="8.5"
              fill="url(#plunger-cap-grad)"
              stroke="#2e3133"
              strokeWidth="1.8"
            />

            {/* Plunger 3D Rim / Crescent Edge as seen in reference image */}
            <path
              d="M -6.5 -2.5 A 7 7 0 0 1 6.5 -2.5"
              fill="none"
              stroke="#585d60"
              strokeWidth="1.2"
              opacity="0.85"
            />
          </g>
        </svg>
      </div>

      {renderLabel(labelBottom, "mt-1.5")}
    </div>
  );
}

export function RoundHeadToggle({
  position = "OFF",
  onToggle,
  onClick,
  onPointerDown,
  onPointerUp,
  onWheelStep,
  size = 50,
  title,
}: {
  position?: "ON" | "OFF" | "UP" | "CENTER" | "DOWN" | "AUTO" | "OVHT" | "PWR TEST";
  onToggle?: () => void;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onWheelStep?: (direction: number) => void;
  size?: number;
  title?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onWheelStep) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      onWheelStep(e.deltaY < 0 ? -1 : 1);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [onWheelStep]);

  const isUp =
    position === "OFF" ||
    position === "UP" ||
    position === "AUTO" ||
    position === "OVHT";
  const isCenter = position === "CENTER";
  const targetY = isUp ? -7 : isCenter ? 0 : 8;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (onToggle) {
      onToggle();
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        cursor: onClick || onToggle || onPointerDown ? "pointer" : "default",
        userSelect: "none",
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title={title || "Interruptor basculante (Rueda del ratón o clic para alternar)"}
    >
      <svg
        viewBox="0 0 60 60"
        style={{
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
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
        </defs>

        {/* Base Bezel */}
        <circle
          cx="30"
          cy="30"
          r="22"
          fill="url(#bezel-grad)"
          stroke="#606669"
          strokeWidth="1.5"
        />
        <circle
          cx="30"
          cy="30"
          r="16"
          fill="url(#cavity-grad)"
          stroke="#111314"
          strokeWidth="1"
        />

        {/* Crescent / arc track underneath */}
        <path
          d="M 17 34 A 14 14 0 0 0 43 34"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Stem & Round Head */}
        <g
          transform={`translate(0, ${targetY})`}
          style={{
            transition: "transform 0.15s ease-out",
            filter: "drop-shadow(0px 2px 2px rgba(10, 10, 10, 0.8))",
          }}
        >
          {/* Metal stem */}
          <path
            d="M 28 32 L 28 26 L 32 26 L 32 32 Z"
            fill="#b0b5b8"
            stroke="#505558"
            strokeWidth="0.5"
          />
          {/* Round Head Ball */}
          <circle
            cx="30"
            cy="24"
            r="11"
            fill="url(#ball-grad)"
            stroke="#8c8573"
            strokeWidth="0.8"
          />
        </g>
      </svg>
    </div>
  );
}
