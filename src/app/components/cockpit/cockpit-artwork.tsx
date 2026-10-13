// Static cockpit artwork. The overhead panel outlines are traced from
// public/OHP.svg; the glareshield, main instrument panel (MIP) and pedestal are
// traced from ref/Cockpit.jpg at the same scale as the overhead (1 image px ≈
// 1.004 SVG units) and centered on its axis (x = 1682). Rendered inside
// <g id="cockpit-artwork">, which the minimap reuses through
// <use href="#cockpit-artwork" />.

type CockpitRect = { id: string; x: number; y: number; width: number; height: number };
type CockpitCircle = { id: string; cx: number; cy: number; r: number };

const GLARESHIELD_PATH =
  "M 1682 2396 L 2284 2396 C 2445 2396 2545 2419 2626 2442 L 3228 2564 C 3263 2571 3286 2590 3284 2615 C 3282 2651 3248 2700 3203 2698 C 3138 2686 3017 2621 2927 2621 C 2857 2621 2806 2635 2766 2635 L 1682 2635 L 598 2635 C 558 2635 507 2621 437 2621 C 347 2621 226 2686 161 2698 C 116 2700 82 2651 80 2615 C 78 2590 101 2571 136 2564 L 738 2442 C 819 2419 919 2396 1080 2396 L 1682 2396 Z";
// Seams where the glareshield wings start.
const GLARESHIELD_WING_SEAMS = [738, 2626];
const GLARESHIELD_WING_SEAM_Y = [2442, 2635];

const GLARESHIELD_PANELS: CockpitRect[] = [
  { id: "mcp", x: 1083, y: 2431, width: 1198, height: 184 },
  { id: "efis-capt", x: 776, y: 2456, width: 304, height: 161 },
  { id: "efis-fo", x: 2284, y: 2456, width: 304, height: 161 },
  { id: "warning-annunciators-capt", x: 482, y: 2540, width: 256, height: 77 },
  { id: "warning-annunciators-fo", x: 2626, y: 2540, width: 256, height: 77 },
];

const GLARESHIELD_LIGHTS: CockpitRect[] = [
  { id: "six-pack-capt", x: 618, y: 2546, width: 110, height: 65 },
  { id: "six-pack-fo", x: 2636, y: 2546, width: 110, height: 65 },
  { id: "master-caution-capt", x: 555, y: 2547, width: 55, height: 50 },
  { id: "master-caution-fo", x: 2754, y: 2547, width: 55, height: 50 },
  { id: "fire-warn-capt", x: 492, y: 2547, width: 55, height: 50 },
  { id: "fire-warn-fo", x: 2817, y: 2547, width: 55, height: 50 },
];

const MIP_PATH =
  "M 1682 2635 L 2230 2635 L 2451 2732 L 2984 2780 L 3239 2868 L 3263 3328 L 3263 3510 L 1682 3510 L 101 3510 L 101 3328 L 125 2868 L 380 2780 L 913 2732 L 1134 2635 L 1682 2635 Z";

// Panels are drawn up to the glareshield and clipped by the MIP outline.
const MIP_PANELS: CockpitRect[] = [
  { id: "mip-outboard-capt", x: 103, y: 2617, width: 298, height: 703 },
  { id: "mip-outboard-fo", x: 2963, y: 2617, width: 298, height: 703 },
  { id: "mip-upper-outboard-capt", x: 405, y: 2617, width: 317, height: 267 },
  { id: "mip-upper-outboard-fo", x: 2642, y: 2617, width: 317, height: 267 },
  { id: "mip-du-select-capt", x: 726, y: 2617, width: 235, height: 267 },
  { id: "mip-du-select-fo", x: 2403, y: 2617, width: 235, height: 267 },
  { id: "mip-afds-capt", x: 965, y: 2617, width: 315, height: 267 },
  { id: "mip-afds-fo", x: 2084, y: 2617, width: 315, height: 267 },
  { id: "mip-main-capt", x: 405, y: 2888, width: 875, height: 432 },
  { id: "mip-main-fo", x: 2084, y: 2888, width: 875, height: 432 },
  { id: "mip-standby", x: 1284, y: 2617, width: 227, height: 703 },
  { id: "mip-center-left", x: 1515, y: 2617, width: 180, height: 284 },
  { id: "mip-center-right", x: 1699, y: 2617, width: 251, height: 284 },
  { id: "mip-center-du", x: 1515, y: 2905, width: 435, height: 415 },
  { id: "mip-gear", x: 1954, y: 2617, width: 126, height: 703 },
  { id: "mip-lower-outboard-capt", x: 103, y: 3324, width: 425, height: 184 },
  { id: "mip-lower-outboard-fo", x: 2836, y: 3324, width: 425, height: 184 },
  { id: "mip-lower-lights-capt", x: 532, y: 3324, width: 295, height: 184 },
  { id: "mip-lower-lights-fo", x: 2537, y: 3324, width: 295, height: 184 },
  { id: "mip-lower-inboard-capt", x: 831, y: 3324, width: 316, height: 184 },
  { id: "mip-lower-inboard-fo", x: 2217, y: 3324, width: 316, height: 184 },
];

const MIP_BEZELS: CockpitRect[] = [
  { id: "pfd-capt", x: 420, y: 2903, width: 407, height: 399 },
  { id: "pfd-fo", x: 2537, y: 2903, width: 407, height: 399 },
  { id: "nd-capt", x: 860, y: 2903, width: 402, height: 399 },
  { id: "nd-fo", x: 2102, y: 2903, width: 402, height: 399 },
  { id: "upper-du", x: 1532, y: 2905, width: 397, height: 393 },
  { id: "lower-du", x: 1481, y: 3348, width: 402, height: 398 },
];

const SCREENS: CockpitRect[] = [
  { id: "pfd-screen-capt", x: 432, y: 2915, width: 383, height: 375 },
  { id: "pfd-screen-fo", x: 2549, y: 2915, width: 383, height: 375 },
  { id: "nd-screen-capt", x: 872, y: 2915, width: 378, height: 375 },
  { id: "nd-screen-fo", x: 2114, y: 2915, width: 378, height: 375 },
  { id: "upper-du-screen", x: 1544, y: 2917, width: 373, height: 369 },
  { id: "lower-du-screen", x: 1493, y: 3360, width: 378, height: 374 },
  { id: "cdu-screen-capt", x: 1186, y: 3348, width: 243, height: 180 },
  { id: "cdu-screen-fo", x: 1935, y: 3348, width: 243, height: 180 },
];

const INSTRUMENT_HOUSINGS: CockpitRect[] = [
  { id: "clock-capt", x: 208, y: 2904, width: 179, height: 178 },
  { id: "clock-fo", x: 2977, y: 2904, width: 179, height: 178 },
  { id: "selcal-capt", x: 210, y: 3221, width: 176, height: 60 },
  { id: "selcal-fo", x: 2978, y: 3221, width: 176, height: 60 },
  { id: "nose-wheel-steering", x: 191, y: 3124, width: 198, height: 81 },
  { id: "afds-annunciators-capt", x: 992, y: 2731, width: 176, height: 85 },
  { id: "afds-annunciators-fo", x: 2196, y: 2731, width: 176, height: 85 },
  { id: "standby-box", x: 1301, y: 2732, width: 189, height: 152 },
  { id: "isfd-placard", x: 1319, y: 2884, width: 155, height: 35 },
  { id: "isfd", x: 1327, y: 2919, width: 138, height: 158 },
  { id: "rmi", x: 1317, y: 3129, width: 161, height: 145 },
  { id: "gear-lights", x: 1958, y: 2716, width: 112, height: 115 },
  { id: "foot-air-capt", x: 305, y: 3377, width: 222, height: 131 },
  { id: "foot-air-fo", x: 2837, y: 3377, width: 222, height: 131 },
  { id: "vent-capt", x: 151, y: 3364, width: 128, height: 129 },
  { id: "vent-fo", x: 3085, y: 3364, width: 128, height: 129 },
  { id: "cdu-keypad-capt", x: 1186, y: 3538, width: 243, height: 237 },
  { id: "cdu-keypad-fo", x: 1935, y: 3538, width: 243, height: 237 },
];

const DIALS: CockpitCircle[] = [
  { id: "clock-capt-dial", cx: 297, cy: 2989, r: 78 },
  { id: "clock-fo-dial", cx: 3067, cy: 2989, r: 78 },
  { id: "yaw-damper", cx: 1344, cy: 2691, r: 30 },
  { id: "rmi-dial", cx: 1397, cy: 3202, r: 64 },
  { id: "flap-position", cx: 1883, cy: 2774, r: 52 },
  { id: "brake-pressure", cx: 2145, cy: 2786, r: 40 },
];

// Silhouettes of the lower center stack and the pedestal, top to bottom.
const PEDESTAL_BASES: CockpitRect[] = [
  { id: "lower-stack", x: 1149, y: 3322, width: 1066, height: 486 },
  { id: "fire", x: 1373, y: 4415, width: 618, height: 168 },
  { id: "aft-pedestal", x: 1214, y: 4583, width: 936, height: 1019 },
];

const LOWER_PANELS: CockpitRect[] = [
  { id: "cdu-capt", x: 1151, y: 3324, width: 310, height: 482 },
  { id: "cdu-fo", x: 1903, y: 3324, width: 310, height: 482 },
  { id: "lower-center", x: 1465, y: 3324, width: 434, height: 482 },
  { id: "fire-panel", x: 1375, y: 4417, width: 614, height: 164 },
];

const THROTTLE_QUADRANT: CockpitRect = { id: "throttle-quadrant", x: 1463, y: 3808, width: 438, height: 607 };
const TRIM_WHEELS: CockpitRect[] = [
  { id: "stab-trim-wheel-capt", x: 1399, y: 3813, width: 51, height: 515 },
  { id: "stab-trim-wheel-fo", x: 1914, y: 3813, width: 51, height: 515 },
];
const PEDESTAL_SLOTS: CockpitRect[] = [
  { id: "speedbrake-lane", x: 1533, y: 3870, width: 59, height: 171 },
  { id: "thrust-lever-lane-capt", x: 1632, y: 3830, width: 22, height: 417 },
  { id: "thrust-lever-lane-fo", x: 1710, y: 3830, width: 22, height: 417 },
  { id: "flap-lane", x: 1780, y: 3914, width: 46, height: 396 },
  { id: "stab-trim-indicator-capt", x: 1471, y: 4055, width: 60, height: 132 },
  { id: "stab-trim-indicator-fo", x: 1825, y: 4055, width: 60, height: 132 },
  { id: "stab-trim-cutout", x: 1742, y: 4319, width: 143, height: 68 },
  { id: "parking-brake", x: 1483, y: 4337, width: 68, height: 37 },
];
const FIRE_HANDLES: CockpitRect[] = [
  { id: "fire-handle-1", x: 1509, y: 4448, width: 41, height: 109 },
  { id: "fire-handle-apu", x: 1663, y: 4448, width: 38, height: 109 },
  { id: "fire-handle-2", x: 1814, y: 4448, width: 41, height: 109 },
];

const AFT_PEDESTAL_PANELS: CockpitRect[] = [
  { id: "vhf-1", x: 1216, y: 4585, width: 299, height: 131 },
  { id: "nav-1", x: 1216, y: 4720, width: 299, height: 128 },
  { id: "acp-capt", x: 1216, y: 4852, width: 299, height: 261 },
  { id: "adf", x: 1216, y: 5117, width: 299, height: 152 },
  { id: "aft-blank-l", x: 1216, y: 5273, width: 299, height: 114 },
  { id: "stab-trim-door", x: 1216, y: 5391, width: 299, height: 97 },
  { id: "lights-capt", x: 1216, y: 5492, width: 299, height: 108 },
  { id: "cargo-fire", x: 1519, y: 4585, width: 326, height: 131 },
  { id: "transponder", x: 1519, y: 4720, width: 326, height: 128 },
  { id: "wx-radar", x: 1519, y: 4852, width: 326, height: 146 },
  { id: "rudder-trim-ind", x: 1519, y: 5002, width: 326, height: 66 },
  { id: "aileron-rudder-trim", x: 1519, y: 5072, width: 326, height: 137 },
  { id: "printer", x: 1519, y: 5213, width: 326, height: 275 },
  { id: "aft-blank-c", x: 1519, y: 5492, width: 326, height: 108 },
  { id: "vhf-2", x: 1849, y: 4585, width: 299, height: 131 },
  { id: "nav-2", x: 1849, y: 4720, width: 299, height: 128 },
  { id: "acp-fo", x: 1849, y: 4852, width: 299, height: 261 },
  { id: "vhf-3", x: 1849, y: 5117, width: 299, height: 152 },
  { id: "aft-blank-r", x: 1849, y: 5273, width: 299, height: 215 },
  { id: "entry-video", x: 1849, y: 5492, width: 299, height: 108 },
];

function CockpitRects({
  rects,
  fill = "var(--color-cockpit-fill-structure)",
  stroke = "var(--color-cockpit-stroke)",
  strokeWidth = 2,
  rx = 4,
}: {
  rects: CockpitRect[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
}) {
  return rects.map(({ id, x, y, width, height }) => (
    <rect
      key={id}
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      rx={rx}
    />
  ));
}

export function CockpitArtwork() {
  return (
    <>
      <path
        id="svg_3"
        d="m2417.6464,15.29411l5.88235,2279.99938l-357.64696,79.99998c1.17605,1.17608 -765.88257,-1.17686 -767.05904,-1.17686c-1.17647,0 -356.47049,-76.47056 -357.64654,-77.64665l1.56293,-2280.59642l1474.90726,-0.57943z"
        fill="var(--color-cockpit-fill-base)"
        stroke="none"
      />
      <path
        id="svg_26"
        d="m946.66667,2218.33333"
        fill="var(--color-cockpit-fill-base)"
        stroke="none"
      />
      <path
        id="svg_27"
        d="m940,2298.33334l-1.66667,-85l1485,6.66667l-5,80l-356.66667,78.33333l-768.33333,-3.33333l-353.33333,-76.66667z"
        fill="var(--color-cockpit-fill-base)"
        stroke="none"
      />

      {/* OHP.svg Rects - Perfectly aligned to a grid */}
      <rect
        id="svg_4"
        x="948"
        y="882"
        width="330"
        height="470"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_6"
        x="1616"
        y="882"
        width="140"
        height="212"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_7"
        x="1282"
        y="965"
        width="330"
        height="451"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_8"
        x="948"
        y="1356"
        width="330"
        height="346"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_9"
        x="1282"
        y="1420"
        width="330"
        height="240"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_10"
        x="1616"
        y="1098"
        width="140"
        height="345"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_11"
        x="1760"
        y="882"
        width="330"
        height="339"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_12"
        x="2094"
        y="882"
        width="330"
        height="79"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_13"
        x="2094"
        y="965"
        width="330"
        height="342"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_14"
        x="1760"
        y="1225"
        width="330"
        height="191"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_15"
        x="2094"
        y="1311"
        width="330"
        height="467"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_16"
        x="1616"
        y="1447"
        width="140"
        height="160"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_17"
        x="1760"
        y="1420"
        width="330"
        height="187"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_18"
        x="948"
        y="1706"
        width="330"
        height="512"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_19"
        x="1282"
        y="1706"
        width="330"
        height="512"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_20"
        x="1616"
        y="1611"
        width="140"
        height="142"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_22"
        x="1616"
        y="1757"
        width="140"
        height="461"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_23"
        x="1760"
        y="1611"
        width="330"
        height="130"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_23n"
        x="1760"
        y="1745"
        width="330"
        height="131"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_24"
        x="2094"
        y="1782"
        width="330"
        height="436"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_28"
        x="1760"
        y="1880"
        width="330"
        height="338"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_29"
        x="948"
        y="500"
        width="330"
        height="158"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_30"
        x="948"
        y="662"
        width="1476"
        height="149"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_31"
        x="1282"
        y="444"
        width="330"
        height="214"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_32"
        x="1282"
        y="178"
        width="330"
        height="256"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_33"
        x="1760"
        y="80"
        width="330"
        height="253"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_34"
        x="1760"
        y="333"
        width="330"
        height="325"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_35"
        x="1616"
        y="396"
        width="140"
        height="113"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />
      <rect
        id="svg_36"
        x="2094"
        y="322"
        width="330"
        height="336"
        fill="var(--color-cockpit-fill-structure)"
        stroke="var(--color-cockpit-stroke)"
        strokeWidth="2"
        rx="4"
      />

      {/* Main instrument panel: panels are clipped to the MIP outline */}
      <defs>
        <clipPath id="cockpit-mip-clip">
          <path d={MIP_PATH} />
        </clipPath>
      </defs>
      <path d={MIP_PATH} fill="var(--color-cockpit-fill-base)" stroke="none" />
      <g clipPath="url(#cockpit-mip-clip)">
        <CockpitRects rects={MIP_PANELS} />
      </g>

      {/* Lower center stack and pedestal */}
      <CockpitRects
        rects={PEDESTAL_BASES}
        fill="var(--color-cockpit-fill-base)"
        stroke="none"
        rx={0}
      />
      <CockpitRects rects={LOWER_PANELS} />
      <CockpitRects rects={[THROTTLE_QUADRANT]} />
      <CockpitRects rects={AFT_PEDESTAL_PANELS} />
      <CockpitRects
        rects={TRIM_WHEELS}
        fill="var(--color-cockpit-fill-shadow)"
        rx={25}
      />
      <CockpitRects
        rects={PEDESTAL_SLOTS}
        fill="var(--color-cockpit-fill-shadow)"
        stroke="var(--color-cockpit-stroke-dark)"
      />
      <CockpitRects
        rects={FIRE_HANDLES}
        fill="var(--color-cockpit-fill-secondary)"
        stroke="var(--color-cockpit-stroke-dark)"
      />

      {/* Displays and instruments */}
      <CockpitRects
        rects={MIP_BEZELS}
        fill="var(--color-cockpit-fill-secondary)"
        stroke="var(--color-cockpit-stroke-dark)"
        rx={10}
      />
      <CockpitRects
        rects={SCREENS}
        fill="var(--color-cockpit-fill-shadow)"
        stroke="var(--color-cockpit-stroke-dark)"
      />
      <CockpitRects
        rects={INSTRUMENT_HOUSINGS}
        fill="var(--color-cockpit-fill-shadow)"
      />
      {DIALS.map(({ id, cx, cy, r }) => (
        <circle
          key={id}
          cx={cx}
          cy={cy}
          r={r}
          fill="var(--color-cockpit-fill-shadow)"
          stroke="var(--color-cockpit-stroke)"
          strokeWidth="2"
        />
      ))}

      {/* Glareshield */}
      <path
        d={GLARESHIELD_PATH}
        fill="var(--color-cockpit-fill-shadow)"
        stroke="var(--color-cockpit-stroke-dark)"
        strokeWidth="4"
      />
      {GLARESHIELD_WING_SEAMS.map((x) => (
        <line
          key={x}
          x1={x}
          y1={GLARESHIELD_WING_SEAM_Y[0]}
          x2={x}
          y2={GLARESHIELD_WING_SEAM_Y[1]}
          stroke="var(--color-cockpit-stroke-dark)"
          strokeWidth="3"
        />
      ))}
      <CockpitRects rects={GLARESHIELD_PANELS} />
      <CockpitRects
        rects={GLARESHIELD_LIGHTS}
        fill="var(--color-cockpit-fill-secondary)"
        stroke="var(--color-cockpit-stroke-dark)"
      />
    </>
  );
}
