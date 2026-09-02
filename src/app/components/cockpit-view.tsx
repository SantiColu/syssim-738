"use client";

import { useEffect, useRef, useState } from "react";
import {
  CabinAltitudeControlPanel,
  CabinAltitudePanel,
  EquipmentCoolingPanel,
  TemperaturePanel,
} from "./aircraft-panels";
import { PneumaticPanel } from "./pneumatic-panel";

export function CockpitView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.3 });
  const isDragging = useRef(false);
  const startPan = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Center initially based on container size
    const rect = container.getBoundingClientRect();
    const initialScale = 0.25;
    // World is 2400x3600. Center it.
    const initialX = (rect.width - 2400 * initialScale) / 2;
    const initialY = (rect.height - 3600 * initialScale) / 2;
    setTransform({ x: initialX, y: initialY, scale: initialScale });

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const scaleAdjustment = e.deltaY * -0.001;
      setTransform((prev) => {
        let newScale = prev.scale + scaleAdjustment;
        newScale = Math.max(0.1, Math.min(newScale, 3)); // Clamp scale

        // Calculate mouse position relative to container
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate point in unscaled coordinates
        const pointX = (mouseX - prev.x) / prev.scale;
        const pointY = (mouseY - prev.y) / prev.scale;

        // Calculate new position
        const newX = mouseX - pointX * newScale;
        const newY = mouseY - pointY * newScale;

        return { x: newX, y: newY, scale: newScale };
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only pan if it's the background or middle mouse button
    if (
      e.button === 1 ||
      (e.target as HTMLElement).tagName.toLowerCase() === "svg"
    ) {
      isDragging.current = true;
      startPan.current = {
        x: e.clientX - transform.x,
        y: e.clientY - transform.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (
      e.target === containerRef.current ||
      (e.target as HTMLElement).classList.contains("cockpit-bg")
    ) {
      isDragging.current = true;
      startPan.current = {
        x: e.clientX - transform.x,
        y: e.clientY - transform.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - startPan.current.x,
      y: e.clientY - startPan.current.y,
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#0a0c0f] cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        className="absolute cockpit-bg origin-top-left flex flex-col items-center"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          width: "2400px",
          height: "3600px",
        }}
      >
        <svg
          viewBox="750 0 1800 4500"
          width="2400"
          height="6000"
          className="cockpit-bg"
          style={{ pointerEvents: "none" }}
        >
          {/* Main SVG Background Paths from OHP.svg */}
          <g style={{ pointerEvents: "auto" }}>
            <path
              id="svg_3"
              d="m2417.6464,15.29411l5.88235,2279.99938l-357.64696,79.99998c1.17605,1.17608 -765.88257,-1.17686 -767.05904,-1.17686c-1.17647,0 -356.47049,-76.47056 -357.64654,-77.64665l1.56293,-2280.59642l1474.90726,-0.57943z"
              fill="#1b1f22"
              stroke="none"
            />
            <path
              id="svg_26"
              d="m946.66667,2218.33333"
              fill="#1b1f22"
              stroke="none"
            />
            <path
              id="svg_27"
              d="m940,2298.33334l-1.66667,-85l1485,6.66667l-5,80l-356.66667,78.33333l-768.33333,-3.33333l-353.33333,-76.66667z"
              fill="#1b1f22"
              stroke="none"
            />

            {/* OHP.svg Rects - Perfectly aligned to a grid */}
            <rect
              id="svg_4"
              x="948"
              y="882"
              width="330"
              height="470"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_6"
              x="1616"
              y="882"
              width="140"
              height="212"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_7"
              x="1282"
              y="965"
              width="330"
              height="451"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_8"
              x="948"
              y="1356"
              width="330"
              height="346"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_9"
              x="1282"
              y="1420"
              width="330"
              height="240"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_10"
              x="1616"
              y="1098"
              width="140"
              height="345"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_11"
              x="1760"
              y="882"
              width="330"
              height="339"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_12"
              x="2094"
              y="882"
              width="330"
              height="79"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_13"
              x="2094"
              y="965"
              width="330"
              height="342"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_14"
              x="1760"
              y="1225"
              width="330"
              height="191"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_15"
              x="2094"
              y="1311"
              width="330"
              height="467"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_16"
              x="1616"
              y="1447"
              width="140"
              height="160"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_17"
              x="1760"
              y="1420"
              width="330"
              height="187"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_18"
              x="948"
              y="1706"
              width="330"
              height="512"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_19"
              x="1282"
              y="1706"
              width="330"
              height="512"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_20"
              x="1616"
              y="1611"
              width="140"
              height="142"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_22"
              x="1616"
              y="1757"
              width="140"
              height="461"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_23"
              x="1760"
              y="1611"
              width="330"
              height="130"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_23n"
              x="1760"
              y="1745"
              width="330"
              height="131"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_24"
              x="2094"
              y="1782"
              width="330"
              height="436"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_28"
              x="1760"
              y="1880"
              width="330"
              height="338"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_29"
              x="948"
              y="500"
              width="330"
              height="158"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_30"
              x="948"
              y="662"
              width="1476"
              height="149"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_31"
              x="1282"
              y="444"
              width="330"
              height="214"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_32"
              x="1282"
              y="178"
              width="330"
              height="256"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_33"
              x="1760"
              y="80"
              width="330"
              height="253"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_34"
              x="1760"
              y="333"
              width="330"
              height="325"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_35"
              x="1616"
              y="396"
              width="140"
              height="113"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />
            <rect
              id="svg_36"
              x="2094"
              y="322"
              width="330"
              height="336"
              fill="#363d42"
              stroke="#505a61"
              strokeWidth="2"
              rx="4"
            />

            {/* Glareshield & Main Instrument Panel (Manually aligned below OHP) */}
            <path
              d="M 850 2450 L 2500 2450 L 2500 3200 L 850 3200 Z"
              fill="#363d42"
              stroke="#1f2427"
              strokeWidth="8"
            />
            <rect
              x="950"
              y="2480"
              width="1450"
              height="150"
              fill="#1c2023"
              rx="20"
            />
            <rect
              x="1000"
              y="2700"
              width="450"
              height="400"
              fill="#465158"
              stroke="#1f2427"
              strokeWidth="4"
              rx="8"
            />
            <rect
              x="1500"
              y="2700"
              width="350"
              height="400"
              fill="#465158"
              stroke="#1f2427"
              strokeWidth="4"
              rx="8"
            />
            <rect
              x="1900"
              y="2700"
              width="450"
              height="400"
              fill="#465158"
              stroke="#1f2427"
              strokeWidth="4"
              rx="8"
            />

            {/* Pedestal */}
            <path
              d="M 1350 3200 L 2000 3200 L 2000 4200 L 1350 4200 Z"
              fill="#363d42"
              stroke="#1f2427"
              strokeWidth="8"
            />
            <rect
              x="1400"
              y="3250"
              width="550"
              height="300"
              fill="#465158"
              stroke="#1f2427"
              strokeWidth="4"
              rx="8"
            />
            <rect
              x="1400"
              y="3600"
              width="250"
              height="400"
              fill="#465158"
              stroke="#1f2427"
              strokeWidth="4"
              rx="8"
            />
            <rect
              x="1700"
              y="3600"
              width="250"
              height="400"
              fill="#465158"
              stroke="#1f2427"
              strokeWidth="4"
              rx="8"
            />

            {/* Populated React Panels as ForeignObjects */}

            {/* Temperature Panel in svg_13 (Top Right) */}
            <foreignObject x="2094" y="965" width="330" height="342">
              <div className="w-full h-full flex items-center justify-center">
                <div
                  style={{
                    width: "467px",
                    height: "485px",
                    transform: "scale(0.70)",
                  }}
                >
                  <TemperaturePanel />
                </div>
              </div>
            </foreignObject>

            {/* Pneumatic Panel in svg_15 (Middle Right) */}
            <foreignObject x="2097" y="1311" width="324" height="467">
              <div className="w-full h-full flex items-center justify-center ">
                <div
                  style={{
                    width: "400px",
                    height: "550px",
                    transform: "scale(0.88)",
                  }}
                >
                  <PneumaticPanel />
                </div>
              </div>
            </foreignObject>

            {/* Cabin Altitude Control Panel in svg_24 (Bottom Right) */}
            <foreignObject x="2094" y="1782" width="330" height="436">
              <div className="w-full h-full flex items-center justify-center">
                <div
                  style={{
                    width: "330px",
                    height: "436px",
                  }}
                >
                  <CabinAltitudeControlPanel />
                </div>
              </div>
            </foreignObject>

            {/* Cabin Altitude Panel in svg_28 (Left of Alt Control) */}
            <foreignObject x="1760" y="1880" width="330" height="338">
              <div className="w-full h-full flex items-center justify-center">
                <div
                  style={{
                    width: "330px",
                    height: "338px",
                  }}
                >
                  <CabinAltitudePanel />
                </div>
              </div>
            </foreignObject>

            {/* Equipment Cooling Panel in svg_16 (Small middle square) */}
            <foreignObject x="1616" y="1447" width="140" height="160">
              <div className="w-full h-full flex items-center justify-center">
                <div
                  style={{
                    width: "345px",
                    height: "394px",
                    transform: "scale(0.40)",
                  }}
                >
                  <EquipmentCoolingPanel />
                </div>
              </div>
            </foreignObject>
          </g>
        </svg>
      </div>
    </div>
  );
}
