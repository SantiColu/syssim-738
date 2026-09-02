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
  | "shutoff-valve";

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
