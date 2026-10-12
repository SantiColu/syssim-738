export type Point = { x: number; y: number };

export type MediumState = {
  pressurePsi: number;
  temperatureC: number;
};

export type PneumaticColorMode = "temperature" | "pressure";

export type SourceKind = "engine" | "apu";

export type ValveKind =
  | "on-off"
  | "check-valve"
  | "check-valve-reverse"
  | "check-valve-invert"
  | "check-valve-rev"
  | "modulating"
  | "solenoid"
  | "precooler"
  | "precooler-reverse"
  | "heat-exchanger"
  | "shutoff-valve"
  | "starter-turbine";

export type ConsumerInfo = {
  label: string;
  fullLabel: string;
  category:
    | "air-conditioning"
    | "hydraulics"
    | "fuel-inerting"
    | "potable-water"
    | "anti-ice";
};

export type PneumaticNode =
  | {
      id: string;
      kind: "source";
      sourceKind: SourceKind;
      label: string;
    }
  | {
      id: string;
      kind: "junction";
    }
  | {
      id: string;
      kind: "sink";
      label: string;
    }
  | {
      id: string;
      kind: "accessory";
      accessory: {
        kind: ValveKind;
        normallyOpen: boolean;
        label?: string;
        /** Check valves and heat exchangers: the only link flow may enter through. */
        inletLinkId?: string;
        /** Heat exchangers: the link carrying the cooling (fan) air. */
        coldInletLinkId?: string;
      };
    };

export type PneumaticLink = {
  id: string;
  from: string;
  to: string;
};

/**
 * Nodes where two bleed stages of the same engine merge. When every listed
 * source is enabled, the nodes carry the average of their temperatures.
 */
export type MixingZone = {
  sourceIds: string[];
  nodeIds: string[];
};

export type PneumaticNetwork = {
  nodes: PneumaticNode[];
  links: PneumaticLink[];
  mixingZones: MixingZone[];
};

export type PneumaticLayout = {
  nodePositions: Record<string, Point>;
  linkRoutes: Record<string, Point[]>;
};

export type PneumaticRuntimeState = {
  sources: Partial<Record<string, { enabled: boolean } & MediumState>>;
  accessories: Partial<Record<string, { open: boolean }>>;
};

export type SolvedNodeState = MediumState & {
  energized: boolean;
  sourceId: string | null;
};

export type SolvedLinkState = {
  state: "active" | "inactive" | "isolated";
  medium: MediumState | null;
};

export type PneumaticSolution = {
  nodes: Record<string, SolvedNodeState>;
  links: Record<string, SolvedLinkState>;
};

export type LegacyPneumaticPoint = Point & {
  accessory?: boolean | ValveKind;
};

export type LegacyPneumaticLine = {
  id: string;
  points: LegacyPneumaticPoint[];
};

export type SourceDefinition = {
  sourceKind: SourceKind;
  label: string;
  initial: MediumState & { enabled: boolean };
};

/**
 * Semantics layered on top of the legacy drawing. Everything refers to nodes
 * by name, so the solver never has to infer behaviour from coordinates.
 */
export type NetworkSpec<Name extends string> = {
  /** Stable handles for the nodes the simulation refers to. */
  names: Record<Name, Point>;
  sources: Partial<Record<Name, SourceDefinition>>;
  consumers: Partial<Record<Name, ConsumerInfo>>;
  /** Flow may only enter the valve from the named neighbour. */
  checkValves: { valve: Name; inletFrom: Name }[];
  heatExchangers: { exchanger: Name; hotInletFrom: Name; coldInletFrom: Name }[];
  mixingZones: { sources: Name[]; nodes: Name[] }[];
};

export type MigratedPneumaticNetwork<Name extends string = string> = {
  network: PneumaticNetwork;
  layout: PneumaticLayout;
  initialState: PneumaticRuntimeState;
  /** Node id for every name in the spec. */
  ids: Record<Name, string>;
  consumers: Record<string, ConsumerInfo>;
};

type ColorStop = {
  value: number;
  color: [number, number, number];
};

const rgb = ([r, g, b]: ColorStop["color"]) => `rgb(${r}, ${g}, ${b})`;

/** Linear blend between the two stops around `value`, clamped to the ends. */
function colorAt(stops: ColorStop[], value: number): string {
  const upperIndex = stops.findIndex((stop) => value <= stop.value);
  if (upperIndex === 0) return rgb(stops[0].color);
  if (upperIndex === -1) return rgb(stops[stops.length - 1].color);
  const lower = stops[upperIndex - 1];
  const upper = stops[upperIndex];
  const ratio = (value - lower.value) / (upper.value - lower.value);
  return rgb(
    lower.color.map((channel, index) =>
      Math.round(channel + ratio * (upper.color[index] - channel)),
    ) as ColorStop["color"],
  );
}

/** No air (empty duct): dark grey on both scales. */
const NO_AIR_COLOR = "#52525b";

/**
 * Air temperature scale (°C), cold to hot: blues, celestes, yellows, oranges
 * and reds. Reference points along it:
 * - ~2°C ACM turbine outlet, ~12°C mix manifold: deep blue / blue
 * - ~25°C fan air, ~30°C ground air: celeste
 * - ~40°C secondary HX outlet: light celeste
 * - ~90°C primary HX outlet and ram exhaust: yellow to amber
 * - ~160°C post-precooler: orange
 * - ~200°C 5th stage, ~230°C APU: red
 * - ~295°C 5th + 9th stage mixed: deep red
 * - ~390°C 9th stage HP bleed: crimson
 */
export const TEMPERATURE_COLOR_STOPS: ColorStop[] = [
  { value: 0, color: [30, 58, 138] },
  { value: 8, color: [29, 78, 216] },
  { value: 16, color: [59, 130, 246] },
  { value: 26, color: [56, 189, 248] },
  { value: 40, color: [125, 211, 252] },
  { value: 55, color: [254, 240, 138] },
  { value: 80, color: [253, 224, 71] },
  { value: 105, color: [251, 191, 36] },
  { value: 130, color: [251, 146, 60] },
  { value: 160, color: [249, 115, 22] },
  { value: 195, color: [239, 68, 68] },
  { value: 240, color: [220, 38, 38] },
  { value: 320, color: [185, 28, 28] },
  { value: 400, color: [190, 18, 60] },
];

/** Maps air temperature (°C) to the scale above; 0°C and below is no air. */
export function getTemperatureColor(tempC: number): string {
  if (tempC <= 0) return NO_AIR_COLOR;
  return colorAt(TEMPERATURE_COLOR_STOPS, tempC);
}

export const PRESSURE_COLOR_STOPS: ColorStop[] = [
  { value: 0, color: [82, 82, 91] },
  { value: 10, color: [99, 102, 241] },
  { value: 20, color: [56, 189, 248] },
  { value: 30, color: [34, 197, 94] },
  { value: 40, color: [250, 204, 21] },
  { value: 50, color: [249, 115, 22] },
];

/** Maps pneumatic pressure to the same graduated 0–50 PSI scale shown in MAIN. */
export function getPressureColor(pressurePsi: number): string {
  if (pressurePsi <= 0) return NO_AIR_COLOR;
  return colorAt(PRESSURE_COLOR_STOPS, pressurePsi);
}

/** CSS gradient of a colour scale from 0 to its last stop, as in the legend. */
export function colorScaleGradient(stops: ColorStop[]): string {
  const max = stops[stops.length - 1].value;
  const parts = stops.map(({ value, color }) => `${rgb(color)} ${(value / max) * 100}%`);
  return `linear-gradient(90deg, ${NO_AIR_COLOR} 0%, ${parts.join(", ")})`;
}

export function getPneumaticColor(
  medium: MediumState,
  mode: PneumaticColorMode,
): string {
  return mode === "pressure"
    ? getPressureColor(medium.pressurePsi)
    : getTemperatureColor(medium.temperatureC);
}
