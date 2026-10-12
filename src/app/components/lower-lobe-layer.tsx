// Lower lobe compartments of the 737-800, drawn as thin interior lines across
// the fuselage in the plan view. Independent of where the systems are drawn.
//
// Limits are Boeing body stations (STA, inches). The station datum is 130 in
// forward of the nose tip, and the -800 inserts two fuselage plugs whose
// frames do not advance the station number: forward between STA 500 and 520
// (500A–500I) and aft between STA 727 and 747 (727A–727J), frames ~20 in
// apart (NTSB DCA19FA143 Structures Factual). A plug frame is written as a
// string, e.g. "500G" = 7 frames (140 in) aft of STA 500.
//
// The plan view is to scale: nose tip at y = 30 and tail at y = 550.7 over the
// 39.47 m length (Boeing D6-58325-7 Rev C), which puts the nose gear (4.09 m)
// and main gear (19.69 m) on the drawn wheels. The limits follow physical
// references: forward pressure bulkhead STA 178, nose wheels (~STA 279–309),
// wing root leading edge at STA 520, main wheels (~STA 700–727A), aft pressure
// bulkhead STA 1016, and the published hold lengths (~7.7 m fwd, ~10.9 m aft).

type PlugStation = `${500 | 727}${string}`;
type Station = number | PlugStation;

// Compartment limits, Boeing body stations; edit these.
const STA: Record<string, Station> = {
  radome: 130,
  fwdArea: 178,
  noseWheelWell: 230,
  electronicsBay: 315,
  fwdCargo: 360,
  mixManifoldBay: "500G",
  packBay: 520,
  mainWheelWell: 700,
  aftCargo: "727B",
  bulkCargo: 996,
  tailcone: 1016,
  tailEnd: 1304,
};

const FRAME_PITCH_IN = 20;
const PLUG_FRAMES = { 500: "ABCDEFGHI", 727: "ABCDEFGHIJ" };
const FWD_PLUG_IN = PLUG_FRAMES[500].length * FRAME_PITCH_IN;
const AFT_PLUG_IN = PLUG_FRAMES[727].length * FRAME_PITCH_IN;

/** Physical inches aft of the nose tip for a Boeing body station on the -800. */
function stationToInches(sta: Station): number {
  if (typeof sta === "string") {
    const base = Number(sta.slice(0, 3)) as 500 | 727;
    const frame = PLUG_FRAMES[base].indexOf(sta.slice(3)) + 1;
    if (frame < 1) throw new Error(`Unknown plug station ${sta}`);
    return stationToInches(base) + frame * FRAME_PITCH_IN;
  }
  let inches = sta - 130;
  if (sta >= 520) inches += FWD_PLUG_IN;
  if (sta >= 747) inches += AFT_PLUG_IN;
  return inches;
}

// Drawing scale: nose tip at y = 30, tail at y = 550.7 over the 39.47 m length
const NOSE_Y = 30;
const PX_PER_INCH = (550.7 - NOSE_Y) / (39.47 / 0.0254);
const stationToY = (sta: Station) => NOSE_Y + stationToInches(sta) * PX_PER_INCH;

/** Drawing y of the AC distribution bay limits, for systems laid out inside it. */
export const AC_DIST_BAY_Y = { fwd: stationToY(STA.mixManifoldBay), aft: stationToY(STA.packBay) };
/** Drawing y of the forward end of the aft cargo compartment. */
export const AFT_CARGO_Y = stationToY(STA.aftCargo);

/** Drawing y of the aft pressure bulkhead, where the cabin ends. */
export const AFT_PRESSURE_BULKHEAD_Y = stationToY(STA.tailcone);

/** Compartments front to back; each one ends where the next begins. */
const COMPARTMENTS: { label: string; title: string; from: Station; to: Station; labelX?: number; labelY?: number }[] = [
  // The nose is narrow: these labels sit further inboard
  { label: "RADOME", title: "Radome / weather radar", from: STA.radome, to: STA.fwdArea, labelX: 377 },
  // Forward of the windshield, clear of the defog nozzle
  { label: "FWD AREA", title: "Area forward of the nose wheel well", from: STA.fwdArea, to: STA.noseWheelWell, labelX: 371, labelY: 50.5 },
  // Aft half of the well, clear of the flight deck wall duct above it
  { label: "NLG WELL", title: "Nose wheel well", from: STA.noseWheelWell, to: STA.electronicsBay, labelX: 364, labelY: 86 },
  { label: "E/E BAY", title: "Electrical and electronics bay", from: STA.electronicsBay, to: STA.fwdCargo, labelX: 360 },
  { label: "FWD CARGO", title: "Forward cargo compartment", from: STA.fwdCargo, to: STA.mixManifoldBay },
  { label: "AC DIST", title: "Air distribution (mix manifold) bay, forward of the wing root", from: STA.mixManifoldBay, to: STA.packBay },
  { label: "PACK BAY", title: "Center wing box and pack bays", from: STA.packBay, to: STA.mainWheelWell },
  { label: "MLG WELL", title: "Main wheel well, around the main wheels", from: STA.mainWheelWell, to: STA.aftCargo },
  { label: "AFT CARGO", title: "Aft cargo compartment", from: STA.aftCargo, to: STA.bulkCargo },
  { label: "BULK", title: "Bulk compartment / outflow valve, up to the aft pressure bulkhead", from: STA.bulkCargo, to: STA.tailcone, labelX: 363 },
  { label: "TAILCONE", title: "Tailcone and APU bay", from: STA.tailcone, to: STA.tailEnd, labelX: 377 },
];

const LABEL_X = 358.2;
// Fuselage side walls: the lines stop here instead of running into the wing
// roots; the outline clip narrows them further at the nose and tail.
const FUSELAGE_WALL_X = { left: 355, right: 405 };

export function LowerLobeLayer() {
  const boundaries = [...new Set(COMPARTMENTS.flatMap(({ from, to }) => [from, to]))];
  return (
    <g data-layer="lower-lobe" clipPath="url(#boeing-737-800-clip)">
      {boundaries.map((sta) => (
        <line
          key={sta}
          x1={FUSELAGE_WALL_X.left}
          y1={stationToY(sta)}
          x2={FUSELAGE_WALL_X.right}
          y2={stationToY(sta)}
          className="stroke-zinc-500 pointer-events-none"
          strokeWidth="0.35"
          opacity={0.45}
        />
      ))}
      {COMPARTMENTS.map(({ label, title, from, to, labelX = LABEL_X, labelY = (stationToY(from) + stationToY(to)) / 2 }) => (
        <text
          key={label}
          transform={`translate(${labelX} ${labelY}) rotate(-90)`}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="1.7"
          className="fill-zinc-400 font-sim-sans tracking-wide"
        >
          <title>{`${title} · STA ${from}–${to}`}</title>
          {label}
        </text>
      ))}
    </g>
  );
}
