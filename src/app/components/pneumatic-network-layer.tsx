import {
  getTemperatureColor,
  type PneumaticLayout,
  type PneumaticNetwork,
  type PneumaticNode,
  type PneumaticRuntimeState,
  type PneumaticSolution,
  type Point,
  type SolvedNodeState,
} from "../simulation/pneumatic/types";

type PneumaticNetworkLayerProps = {
  network: PneumaticNetwork;
  layout: PneumaticLayout;
  solution: PneumaticSolution;
  runtimeState?: PneumaticRuntimeState;
};

const linkStateClassNames = {
  active: "stroke-sim-cyan",
  inactive: "stroke-sim-line-inactive",
  isolated: "stroke-sim-line-isolated",
} as const;

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
}: {
  node: Extract<PneumaticNode, { kind: "accessory" }>;
  point: Point;
  solved: SolvedNodeState;
  angle: number;
  isOpen: boolean;
}) {
  const valveKind = node.accessory.kind;

  const isReverseCheck =
    valveKind === "check-valve-reverse" ||
    valveKind === "check-valve-invert" ||
    valveKind === "check-valve-rev";
  const isCheckValve = valveKind === "check-valve" || isReverseCheck;
  const isPrecooler =
    valveKind === "precooler" || valveKind === "heat-exchanger";
  const effectiveAngle = isReverseCheck ? angle + 180 : angle;
  const isEnergized = solved.energized;
  const tempColor = isEnergized
    ? getTemperatureColor(solved.temperatureC)
    : "#38bdf8";

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
      <title>
        {isPrecooler
          ? `Precooler / Intercambiador de calor · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`
          : isCheckValve
            ? `Válvula de retención (Check Valve) · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`
            : valveKind === "modulating"
              ? `Válvula moduladora / reguladora · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`
              : valveKind === "solenoid"
                ? `Válvula con solenoide (Solenoid Valve) · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`
                : `Válvula ON/OFF · ${isOpen ? "Abierta" : "Cerrada"} · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`}
      </title>

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
}: {
  node: Extract<PneumaticNode, { kind: "source" }>;
  point: Point;
  solved: SolvedNodeState;
}) {
  const isEnergized = solved.energized;
  const tempColor = getTemperatureColor(solved.temperatureC);

  return (
    <g
      data-node-id={node.id}
      data-node-kind="source"
      data-source-kind={node.sourceKind}
      data-energized={isEnergized}
      transform={`translate(${point.x} ${point.y})`}
      className="cursor-pointer group select-none"
    >
      <title>
        {`${node.label} · ${isEnergized ? `${solved.pressurePsi} PSI · ${solved.temperatureC} °C` : "OFF / STANDBY"} (Punto de toma de presión)`}
      </title>

      {/* Small circle colored according to temperature: Blue for cold fan air, scale of reds for hot air */}
      <circle
        r="2.2"
        fill={isEnergized ? tempColor : "#3f3f46"}
        stroke="#090d16"
        strokeWidth="0.5"
      />

      {/* Subtle hover indicator ring */}
      <circle
        r="4.2"
        fill="none"
        stroke={isEnergized ? tempColor : "#71717a"}
        className="opacity-0 transition-opacity duration-150 group-hover:opacity-60"
        strokeWidth="0.5"
        strokeDasharray="1.5 1"
      />
    </g>
  );
}

export function PneumaticNetworkLayer({
  network,
  layout,
  solution,
  runtimeState,
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
        const tempColor = solved.medium
          ? getTemperatureColor(solved.medium.temperatureC)
          : "#38bdf8";

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
              stroke={solved.state !== "inactive" ? tempColor : undefined}
              d={path}
              strokeWidth="0.85"
              strokeDasharray={solved.state === "isolated" ? "7 5" : undefined}
            />
          </g>
        );
      })}

      {/* 2. Junction Nodes */}
      {network.nodes
        .filter((node) => node.kind === "junction")
        .map((node) => {
          const point = layout.nodePositions[node.id];
          const solved = solution.nodes[node.id];
          const tempColor = solved.energized
            ? getTemperatureColor(solved.temperatureC)
            : undefined;

          return (
            <circle
              key={node.id}
              className={
                solved.energized ? undefined : "fill-sim-line-inactive"
              }
              fill={tempColor}
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
            />
          );
        })}

      {/* 4. Pressure Inlet Sources: Simple small yellow circles without labels */}
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
            />
          );
        })}
    </g>
  );
}
