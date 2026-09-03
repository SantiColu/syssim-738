export type Point = { x: number; y: number };

export type MediumState = {
  pressurePsi: number;
  temperatureC: number;
};

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
  | "heat-exchanger"
  | "shutoff-valve"
  | "starter-turbine";

export type ConsumerInfo = {
  label: string;
  fullLabel: string;
  category: "air-conditioning" | "hydraulics" | "fuel-inerting" | "potable-water";
};

export const KNOWN_CONSUMERS: Record<string, ConsumerInfo> = {
  "sink-362-172": {
    label: "pack L",
    fullLabel: "Left Air Conditioning Pack (ACM)",
    category: "air-conditioning",
  },
  "sink-397-172": {
    label: "pack R",
    fullLabel: "Right Air Conditioning Pack (ACM)",
    category: "air-conditioning",
  },
  "sink-380-285": {
    label: "Hyd Resv B",
    fullLabel: "Hydraulic System B Reservoir Pressurization",
    category: "hydraulics",
  },
  "sink-380-325": {
    label: "Hyd Resv A",
    fullLabel: "Hydraulic System A Reservoir Pressurization",
    category: "hydraulics",
  },
  "sink-380-365": {
    label: "NGS",
    fullLabel: "Nitrogen Generation System (Center Tank Inerting)",
    category: "fuel-inerting",
  },
  "sink-380-410": {
    label: "Water Tank",
    fullLabel: "Potable Water Tank Pressurization",
    category: "potable-water",
  },
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
      };
    };

export type PneumaticLink = {
  id: string;
  from: string;
  to: string;
};

export type PneumaticNetwork = {
  nodes: PneumaticNode[];
  links: PneumaticLink[];
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
  point: Point;
  sourceKind: SourceKind;
  label: string;
  initial: MediumState & { enabled: boolean };
};

export type MigratedPneumaticNetwork = {
  network: PneumaticNetwork;
  layout: PneumaticLayout;
  initialState: PneumaticRuntimeState;
};

/**
 * Maps air temperature (°C) to color:
 * - Cold air (<= 45°C, such as Fan Air at 25°C or Ground Air at 30°C): Vibrant Sky Blue (#38bdf8)
 * - Scale of reds for hot bleed air:
 *   - ~160°C (Post-precooler): Soft light red (rgb(250, 130, 130))
 *   - ~200°C (5th stage bleed): Medium-light red (rgb(243, 90, 90))
 *   - ~230°C (APU bleed): Vibrant red (rgb(235, 55, 55))
 *   - ~295°C (5th + 9th stage mixed): Deep rich red (rgb(205, 30, 30))
 *   - ~390°C (9th stage HP bleed): Fiery intense bright crimson red (rgb(255, 18, 18))
 */
export function getTemperatureColor(tempC: number): string {
  if (tempC <= 0) return "#52525b"; // unenergized cold dark grey
  if (tempC <= 45) {
    // Cold Fan Air / Cold ambient: Vibrant sky blue
    return "#38bdf8";
  }

  // Pure scale of reds for hot bleed air
  if (tempC <= 160) {
    // 45°C to 160°C (Precooler output ~160°C): soft light red
    const t = Math.max(0, Math.min(1, (tempC - 45) / (160 - 45)));
    const r = Math.round(56 + t * (250 - 56));
    const g = Math.round(189 + t * (130 - 189));
    const b = Math.round(248 + t * (130 - 248));
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (tempC <= 240) {
    // 160°C to 240°C (5th stage ~200°C, APU ~230°C):
    // Soft light red (250, 130, 130) -> Vibrant red (235, 55, 55)
    const t = (tempC - 160) / (240 - 160);
    const r = Math.round(250 + t * (235 - 250));
    const g = Math.round(130 + t * (55 - 130));
    const b = Math.round(130 + t * (55 - 130));
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (tempC <= 320) {
    // 240°C to 320°C (5th+9th mixed ~295°C):
    // Vibrant red (235, 55, 55) -> Deep rich red (200, 25, 25)
    const t = (tempC - 240) / (320 - 240);
    const r = Math.round(235 + t * (200 - 235));
    const g = Math.round(55 + t * (25 - 55));
    const b = Math.round(55 + t * (25 - 55));
    return `rgb(${r}, ${g}, ${b})`;
  }
  // > 320°C up to 400°C+ (9th stage HP ~390°C):
  // Intense fiery saturated bright red
  const t = Math.min(1, (tempC - 320) / (400 - 320));
  const r = Math.round(200 + t * (255 - 200));
  const g = Math.round(25 + t * (18 - 25));
  const b = Math.round(25 + t * (18 - 25));
  return `rgb(${r}, ${g}, ${b})`;
}
