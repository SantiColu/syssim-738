import {
  getPneumaticColor,
  KNOWN_CONSUMERS,
  type PneumaticLayout,
  type PneumaticColorMode,
  type PneumaticNetwork,
  type PneumaticNode,
  type PneumaticRuntimeState,
  type PneumaticSolution,
  type Point,
  type SolvedNodeState,
  type ValveKind,
} from "../simulation/pneumatic/types";

type PneumaticNetworkLayerProps = {
  network: PneumaticNetwork;
  layout: PneumaticLayout;
  solution: PneumaticSolution;
  runtimeState?: PneumaticRuntimeState;
  colorMode?: PneumaticColorMode;
};


function pointsToPath(points: Point[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function getValveAngle(
  nodeId: string,
  point: Point,
  network: PneumaticNetwork,
  layout: PneumaticLayout,
): number {
  const outgoing = network.links.find((l) => l.from === nodeId);
  if (outgoing) {
    const route = layout.linkRoutes[outgoing.id];
    if (route && route.length >= 2) {
      const dx = route[1].x - point.x;
      const dy = route[1].y - point.y;
      return (Math.atan2(dy, dx) * 180) / Math.PI;
    }
  }
  const incoming = network.links.find((l) => l.to === nodeId);
  if (incoming) {
    const route = layout.linkRoutes[incoming.id];
    if (route && route.length >= 2) {
      const prev = route[route.length - 2];
      const dx = point.x - prev.x;
      const dy = point.y - prev.y;
      return (Math.atan2(dy, dx) * 180) / Math.PI;
    }
  }
  return 0;
}

function ValveNode({
  node,
  point,
  solved,
  angle,
  isOpen,
  colorMode,
  showTitle = true,
}: {
  node: Extract<PneumaticNode, { kind: "accessory" }>;
  point: Point;
  solved: SolvedNodeState;
  angle: number;
  isOpen: boolean;
  colorMode: PneumaticColorMode;
  showTitle?: boolean;
}) {
  const valveKind = node.accessory.kind;

  const isReverseCheck =
    valveKind === "check-valve-reverse" ||
    valveKind === "check-valve-invert" ||
    valveKind === "check-valve-rev";
  const isCheckValve = valveKind === "check-valve" || isReverseCheck;
  const isPrecooler =
    valveKind === "precooler" ||
    valveKind === "precooler-reverse" ||
    valveKind === "heat-exchanger";
  const effectiveAngle =
    valveKind === "starter-turbine"
      ? 0
      : isReverseCheck
        ? angle + 180
        : angle;
  const isEnergized = solved.energized;
  const mediumColor = isEnergized
    ? getPneumaticColor(solved, colorMode)
    : "#ef4444";

  return (
    <g
      data-node-id={node.id}
      data-node-kind="accessory"
      data-valve-kind={valveKind}
      data-energized={isEnergized}
      data-valve-open={isOpen}
      transform={`translate(${point.x} ${point.y})`}
      className="cursor-pointer select-none"
    >
      {showTitle && (
        <title>
          {isPrecooler
            ? `Precooler / Intercambiador de calor · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`
            : isCheckValve
              ? `Válvula de retención (Check Valve) · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`
              : valveKind === "starter-turbine"
                ? `Turbina de arranque (Air Starter Turbine) · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`
                : valveKind === "modulating"
                  ? `Válvula moduladora / reguladora · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`
                  : valveKind === "solenoid"
                    ? `Válvula con solenoide (Solenoid Valve) · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`
                    : `Válvula ON/OFF · ${isOpen ? "Abierta" : "Cerrada"} · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`}
        </title>
      )}

      <g transform={`rotate(${effectiveAngle})`}>
        {/* PRECOOLER / HEAT EXCHANGER: Clean white / zinc-gray / dark surface core */}
        {isPrecooler && (
          <g>
            <rect
              x="-3.8"
              y="-2.6"
              width="7.6"
              height="5.2"
              rx="0.5"
              className="fill-sim-surface stroke-white"
              strokeWidth="0.55"
            />
            {/* Internal diamond mesh / heat exchanger fin matrix */}
            <g
              className="stroke-zinc-300"
              opacity={0.85}
              strokeWidth="0.32"
              strokeLinecap="round"
            >
              {/* Diagonals downwards-right */}
              <line x1="-3.4" y1="-1.3" x2="-2.1" y2="-2.4" />
              <line x1="-3.4" y1="0.5" x2="0.0" y2="-2.4" />
              <line x1="-3.4" y1="2.3" x2="2.1" y2="-2.4" />
              <line x1="-1.3" y1="2.4" x2="3.4" y2="-1.5" />
              <line x1="0.8" y1="2.4" x2="3.4" y2="0.3" />
              <line x1="2.9" y1="2.4" x2="3.4" y2="2.0" />

              {/* Diagonals upwards-right */}
              <line x1="-3.4" y1="1.3" x2="-2.1" y2="2.4" />
              <line x1="-3.4" y1="-0.5" x2="0.0" y2="2.4" />
              <line x1="-3.4" y1="-2.3" x2="2.1" y2="2.4" />
              <line x1="-1.3" y1="-2.4" x2="3.4" y2="1.5" />
              <line x1="0.8" y1="-2.4" x2="3.4" y2="-0.3" />
              <line x1="2.9" y1="-2.4" x2="3.4" y2="-2.0" />
            </g>
            {/* Corner reinforcement rivets */}
            <circle cx="-3.1" cy="-1.9" r="0.25" className="fill-white" />
            <circle cx="3.1" cy="-1.9" r="0.25" className="fill-white" />
            <circle cx="-3.1" cy="1.9" r="0.25" className="fill-white" />
            <circle cx="3.1" cy="1.9" r="0.25" className="fill-white" />
          </g>
        )}

        {/* CHECK VALVE: White / Zinc-Gray / Dark Surface housing with directional flow arrow */}
        {isCheckValve && (
          <g>
            <rect
              x="-2.8"
              y="-1.9"
              width="5.6"
              height="3.8"
              rx="0.5"
              className="fill-sim-surface stroke-white"
              strokeWidth="0.55"
            />
            <rect
              x="-2.0"
              y="-0.6"
              width="2.0"
              height="1.2"
              className="fill-zinc-200"
            />
            <polygon
              points="0,-1.4 2.0,0 0,1.4"
              className="fill-zinc-200"
            />
          </g>
        )}

        {/* MODULATING VALVE: White / Zinc-Gray / Dark Surface body caps with animated butterfly throttle vane */}
        {valveKind === "modulating" && (
          <g>
            <path
              d="M -2.4 -0.7 A 2.5 2.5 0 0 1 2.4 -0.7 Z"
              className="fill-sim-surface stroke-white"
              strokeWidth="0.55"
            />
            <path
              d="M -2.4 0.7 A 2.5 2.5 0 0 0 2.4 0.7 Z"
              className="fill-sim-surface stroke-white"
              strokeWidth="0.55"
            />
            {/* Animated rotating butterfly vane: white when open, gray when closed */}
            <line
              x1="-2.1"
              y1="0"
              x2="2.1"
              y2="0"
              className={isOpen ? "stroke-white" : "stroke-zinc-400"}
              strokeWidth="0.85"
              strokeLinecap="round"
              style={{
                transform: isOpen ? "rotate(35deg)" : "rotate(90deg)",
                transformOrigin: "0 0",
                transition: "transform 0.25s ease-in-out",
              }}
            />
            <circle
              r="0.5"
              className="fill-sim-surface stroke-white"
              strokeWidth="0.4"
            />
          </g>
        )}

        {/* SOLENOID VALVE: White / Zinc-Gray / Dark Surface butterfly body + bellows stem + circle with 'S' */}
        {valveKind === "solenoid" && (
          <g>
            <path
              d="M -2.2 -1.7 L -0.4 0 L -2.2 1.7 Z M 1.1 -1.7 L -0.4 0 L 1.1 1.7 Z"
              className="fill-sim-surface stroke-white"
              strokeWidth="0.55"
              strokeLinejoin="round"
            />
            {/* Animated shutoff gate */}
            <line
              x1="-0.4"
              y1="-2.1"
              x2="-0.4"
              y2="2.1"
              className={isOpen ? "stroke-white" : "stroke-zinc-400"}
              strokeWidth="0.85"
              strokeLinecap="round"
              style={{
                transform: isOpen ? "rotate(0deg)" : "rotate(90deg)",
                transformOrigin: "-0.4px 0px",
                transition: "transform 0.25s ease-in-out",
              }}
            />
            <line
              x1="1.1"
              y1="0"
              x2="2.5"
              y2="0"
              className="stroke-zinc-300"
              strokeWidth="0.45"
            />
            <path
              d="M 1.8 -0.9 Q 2.3 -0.5 1.8 0 Q 1.3 0.5 1.8 0.9"
              className="stroke-zinc-300"
              strokeWidth="0.45"
              fill="none"
            />
            <circle
              cx="4.2"
              cy="0"
              r="1.6"
              className="fill-sim-surface stroke-white"
              strokeWidth="0.55"
            />
            <text
              x="4.2"
              y="0.8"
              textAnchor="middle"
              fontSize={2.2}
              fontWeight="bold"
              className="fill-white font-sim-sans"
            >
              S
            </text>
            <line
              x1="4.2"
              y1="-1.6"
              x2="4.2"
              y2="-2.2"
              className="stroke-zinc-300"
              strokeWidth="0.45"
            />
          </g>
        )}

        {/* STARTER TURBINE: Vertical radial/axial air turbine matching technical schematic */}
        {valveKind === "starter-turbine" && (
          <g>
            {/* Wide rotor wheel base on top */}
            <rect
              x="-2.7"
              y="-3.0"
              width="5.4"
              height="0.75"
              rx="0.25"
              className="fill-zinc-200 stroke-white"
              strokeWidth="0.38"
            />
            {/* Horn/funnel body tapering downwards to bottom nozzle */}
            <path
              d="M -2.5 -2.25 Q -0.9 0.2 -0.75 1.6 L 0.75 1.6 Q 0.9 0.2 2.5 -2.25 Z"
              className="fill-sim-surface stroke-white"
              strokeWidth="0.45"
            />
            {/* Fine inner contour of color when energized with flow */}
            {isEnergized && solved.pressurePsi > 0 && (
              <path
                d="M -2.1 -2.0 Q -0.75 0.15 -0.55 1.3 L 0.55 1.3 Q 0.75 0.15 2.1 -2.0 Z"
                fill="none"
                stroke={mediumColor}
                strokeWidth="0.32"
              />
            )}
            {/* Inlet nozzle collar on bottom */}
            <rect
              x="-0.85"
              y="1.6"
              width="1.7"
              height="0.75"
              rx="0.2"
              className="fill-zinc-300 stroke-white"
              strokeWidth="0.32"
            />
            {/* Internal curved turbine blades radiating from bottom nozzle */}
            <path
              d="M -0.4 1.6 Q -0.6 0.0 -1.8 -1.8"
              className="stroke-zinc-300 fill-none"
              strokeWidth="0.32"
              strokeLinecap="round"
            />
            <path
              d="M -0.15 1.6 Q -0.2 0.0 -0.6 -2.0"
              className="stroke-zinc-300 fill-none"
              strokeWidth="0.32"
              strokeLinecap="round"
            />
            <path
              d="M 0.15 1.6 Q 0.2 0.0 0.6 -2.0"
              className="stroke-zinc-300 fill-none"
              strokeWidth="0.32"
              strokeLinecap="round"
            />
            <path
              d="M 0.4 1.6 Q 0.6 0.0 1.8 -1.8"
              className="stroke-zinc-300 fill-none"
              strokeWidth="0.32"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* ON/OFF SHUTOFF VALVE: White / Zinc-Gray / Dark Surface circular housing with animated rotating bar */}
        {(valveKind === "on-off" ||
          valveKind === "shutoff-valve" ||
          !valveKind) && (
          <g>
            <circle
              r="2.2"
              className="fill-sim-surface stroke-white"
              strokeWidth="0.55"
            />
            <line
              x1="-2.1"
              y1="0"
              x2="2.1"
              y2="0"
              className={isOpen ? "stroke-white" : "stroke-zinc-400"}
              strokeWidth="0.85"
              strokeLinecap="round"
              style={{
                transform: isOpen ? "rotate(0deg)" : "rotate(90deg)",
                transformOrigin: "0 0",
                transition: "transform 0.25s ease-in-out",
              }}
            />
            <circle
              r="0.5"
              className="fill-sim-surface stroke-white"
              strokeWidth="0.35"
            />
          </g>
        )}
      </g>
    </g>
  );
}

function SourceInletNode({
  node,
  point,
  solved,
  colorMode = "temperature",
  showTitle = true,
}: {
  node: Extract<PneumaticNode, { kind: "source" }>;
  point: Point;
  solved: SolvedNodeState;
  colorMode?: PneumaticColorMode;
  showTitle?: boolean;
}) {
  const isEnergized = solved.energized;
  const mediumColor = getPneumaticColor(solved, colorMode);

  return (
    <g
      data-node-id={node.id}
      data-node-kind="source"
      data-source-kind={node.sourceKind}
      data-energized={isEnergized}
      transform={`translate(${point.x} ${point.y})`}
      className="cursor-pointer group select-none"
    >
      {showTitle && (
        <title>
          {`${node.label} · ${isEnergized ? `${solved.pressurePsi} PSI · ${solved.temperatureC} °C` : "OFF / STANDBY"} (Punto de toma de presión)`}
        </title>
      )}

      {/* Source marker follows the selected pressure/temperature color scale. */}
      <circle
        r="2.2"
        fill={isEnergized ? mediumColor : "#3f3f46"}
        stroke="#090d16"
        strokeWidth="0.5"
      />

      {/* Subtle hover indicator ring */}
      <circle
        r="4.2"
        fill="none"
        stroke={isEnergized ? mediumColor : "#71717a"}
        className="opacity-0 transition-opacity duration-150 group-hover:opacity-60"
        strokeWidth="0.5"
        strokeDasharray="1.5 1"
      />
    </g>
  );
}

const LEGEND_MEDIUM: SolvedNodeState = {
  energized: true,
  pressurePsi: 36,
  temperatureC: 200,
  sourceId: "legend",
};

export function PneumaticAccessoryLegendIcon({
  kind,
  colorMode,
}: {
  kind: ValveKind;
  colorMode: PneumaticColorMode;
}) {
  const node: Extract<PneumaticNode, { kind: "accessory" }> = {
    id: `legend-${kind}`,
    kind: "accessory",
    accessory: { kind, normallyOpen: true },
  };

  return (
    <svg
      className="h-4 w-5 shrink-0 overflow-visible"
      viewBox="-7 -5 14 10"
      aria-hidden="true"
    >
      <ValveNode
        node={node}
        point={{ x: 0, y: 0 }}
        solved={LEGEND_MEDIUM}
        angle={0}
        isOpen
        colorMode={colorMode}
        showTitle={false}
      />
    </svg>
  );
}

export function PneumaticSourceLegendIcon({
  colorMode,
}: {
  colorMode: PneumaticColorMode;
}) {
  const node: Extract<PneumaticNode, { kind: "source" }> = {
    id: "legend-source",
    kind: "source",
    sourceKind: "engine",
    label: "Air source",
  };

  return (
    <svg className="size-4 shrink-0 overflow-visible" viewBox="-5 -5 10 10" aria-hidden="true">
      <SourceInletNode
        node={node}
        point={{ x: 0, y: 0 }}
        solved={LEGEND_MEDIUM}
        colorMode={colorMode}
        showTitle={false}
      />
    </svg>
  );
}

function ConsumerNode({
  node,
  point,
  solved,
  colorMode,
}: {
  node: PneumaticNode;
  point: Point;
  solved: SolvedNodeState;
  colorMode: PneumaticColorMode;
}) {
  const consumer = KNOWN_CONSUMERS[node.id];
  if (!consumer) return null;

  const isEnergized = solved.energized && solved.pressurePsi > 0;
  const mediumColor = isEnergized
    ? getPneumaticColor(solved, colorMode)
    : "#ef4444";

  const isPack = node.id.includes("209");
  const isCowl = node.id === "sink-303-213" || node.id === "sink-457-213";
  const isWing = node.id === "sink-268-282" || node.id === "sink-492-282";

  const offsetX =
    node.id === "sink-362-209"
      ? 6
      : node.id === "sink-397-209"
        ? -6
        : node.id === "sink-303-213"
          ? 8
          : node.id === "sink-457-213"
            ? -8
            : 0;

  const offsetY = isCowl ? -0.5 : 0;

  const rotation =
    node.id === "sink-268-282"
      ? -28.2
      : node.id === "sink-492-282"
        ? 28.2
        : 0;

  const width = isPack ? 18 : isCowl || isWing ? 16 : 22;
  const height = isCowl || isWing ? 5.5 : 8.5;
  const rx = isCowl || isWing ? 1.4 : 1.8;

  return (
    <g
      data-node-id={node.id}
      data-consumer-id={node.id}
      data-energized={isEnergized}
      transform={`translate(${point.x + offsetX} ${point.y + offsetY}) rotate(${rotation})`}
      className="cursor-pointer group select-none"
    >
      <title>
        {`${consumer.fullLabel} · ${
          isEnergized
            ? `ACTIVE (${solved.pressurePsi} PSI · ${solved.temperatureC} °C)`
            : "OFF / UNPRESSURIZED"
        }`}
      </title>

      {/* Clean card body matching technical sketch */}
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={rx}
        fill="#090d16"
        stroke="#ffffff"
        strokeWidth="0.65"
      />

      {/* Fine inner contour follows the selected scale when pressurized. */}
      {isEnergized && (
        <rect
          x={-width / 2 + 0.6}
          y={-height / 2 + 0.6}
          width={width - 1.2}
          height={height - 1.2}
          rx={Math.max(0.6, rx - 0.4)}
          fill="none"
          stroke={mediumColor}
          strokeWidth="0.32"
        />
      )}

      {/* Centered technical label */}
      <text
        x={0}
        y={isCowl || isWing ? 0.65 : 0.8}
        textAnchor="middle"
        fontSize={isCowl || isWing ? 1.9 : isPack ? 2.4 : 2.1}
        fontWeight="bold"
        className="fill-white font-sim-sans tracking-wide"
      >
        {consumer.label}
      </text>
    </g>
  );
}

export function PneumaticNetworkLayer({
  network,
  layout,
  solution,
  runtimeState,
  colorMode = "temperature",
}: PneumaticNetworkLayerProps) {
  return (
    <g
      className="fill-none [stroke-linecap:round] [stroke-linejoin:round]"
      aria-label="Red neumática calculada"
    >
      {/* 1. Duct Links */}
      {network.links.map((link) => {
        const solved = solution.links[link.id];
        const route = layout.linkRoutes[link.id];
        const path = pointsToPath(route);
        const mediumColor = solved.medium
          ? getPneumaticColor(solved.medium, colorMode)
          : "#52525b";

        return (
          <g
            key={link.id}
            data-link-id={link.id}
            data-state={solved.state}
          >
            <title>
              {solved.medium
                ? `${solved.medium.pressurePsi} PSI · ${solved.medium.temperatureC} °C`
                : "Sin presión"}
            </title>
            <path
              className="stroke-sim-bg"
              d={path}
              strokeWidth="2.25"
              aria-hidden="true"
            />
            <path
              className={
                solved.state === "inactive"
                  ? "stroke-sim-line-inactive"
                  : undefined
              }
              stroke={solved.state !== "inactive" ? mediumColor : undefined}
              d={path}
              strokeWidth="0.85"
              strokeDasharray={solved.state === "isolated" ? "7 5" : undefined}
            />
          </g>
        );
      })}

      {/* 2. Junction Nodes */}
      {network.nodes
        .filter((node) => node.kind === "junction" && !KNOWN_CONSUMERS[node.id])
        .map((node) => {
          const point = layout.nodePositions[node.id];
          const solved = solution.nodes[node.id];
          const mediumColor = solved.energized
            ? getPneumaticColor(solved, colorMode)
            : undefined;

          return (
            <circle
              key={node.id}
              className={
                solved.energized ? undefined : "fill-sim-line-inactive"
              }
              fill={mediumColor}
              cx={point.x}
              cy={point.y}
              r="0.9"
              data-node-id={node.id}
              data-node-kind="junction"
            />
          );
        })}

      {/* 3. Accessory Valves */}
      {network.nodes
        .filter(
          (node): node is Extract<PneumaticNode, { kind: "accessory" }> =>
            node.kind === "accessory",
        )
        .map((node) => {
          const point = layout.nodePositions[node.id];
          const solved = solution.nodes[node.id];
          const angle = getValveAngle(node.id, point, network, layout);
          const isOpen =
            runtimeState?.accessories[node.id]?.open ??
            node.accessory.normallyOpen;

          return (
            <ValveNode
              key={node.id}
              node={node}
              point={point}
              solved={solved}
              angle={angle}
              isOpen={isOpen}
              colorMode={colorMode}
            />
          );
        })}

      {/* 4. Pressure inlet sources */}
      {network.nodes
        .filter(
          (node): node is Extract<PneumaticNode, { kind: "source" }> =>
            node.kind === "source",
        )
        .map((node) => {
          const point = layout.nodePositions[node.id];
          const solved = solution.nodes[node.id];

          return (
            <SourceInletNode
              key={node.id}
              node={node}
              point={point}
              solved={solved}
              colorMode={colorMode}
            />
          );
        })}

      {/* 5. Consumer Blocks: Pack L, Pack R, Hyd Resv B, Hyd Resv A, NGS, Water Tank, Cowl TAI, Wing TAI */}
      {network.nodes
        .filter((node) => Boolean(KNOWN_CONSUMERS[node.id]))
        .map((node) => {
          const point = layout.nodePositions[node.id];
          const solved = solution.nodes[node.id];

          return (
            <ConsumerNode
              key={node.id}
              node={node}
              point={point}
              solved={solved}
              colorMode={colorMode}
            />
          );
        })}
    </g>
  );
}
