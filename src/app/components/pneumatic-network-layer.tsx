import type {
  PneumaticLayout,
  PneumaticNetwork,
  PneumaticNode,
  PneumaticSolution,
  Point,
  SolvedNodeState,
} from "../simulation/pneumatic/types";

type PneumaticNetworkLayerProps = {
  network: PneumaticNetwork;
  layout: PneumaticLayout;
  solution: PneumaticSolution;
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
}: {
  node: Extract<PneumaticNode, { kind: "accessory" }>;
  point: Point;
  solved: SolvedNodeState;
  angle: number;
}) {
  const isEnergized = solved.energized;
  const valveKind = node.accessory.kind;
  const isOpen = node.accessory.normallyOpen;

  const isReverseCheck =
    valveKind === "check-valve-reverse" ||
    valveKind === "check-valve-invert" ||
    valveKind === "check-valve-rev";
  const isCheckValve = valveKind === "check-valve" || isReverseCheck;
  const effectiveAngle = isReverseCheck ? angle + 180 : angle;

  return (
    <g
      data-node-id={node.id}
      data-node-kind="accessory"
      data-valve-kind={valveKind}
      transform={`translate(${point.x} ${point.y})`}
      className="cursor-pointer group select-none"
    >
      <title>
        {isCheckValve
          ? `Válvula de retención (Check Valve) · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`
          : valveKind === "modulating"
            ? `Válvula moduladora / reguladora · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`
            : valveKind === "solenoid"
              ? `Válvula con solenoide (Solenoid Valve) · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`
              : `Válvula ON/OFF · ${isOpen ? "Abierta" : "Cerrada"} · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`}
      </title>

      <g transform={`rotate(${effectiveAngle})`}>
        {/* CHECK VALVE (Image 2): Miniature rectangular housing with directional flow arrow */}
        {isCheckValve && (
          <g>
            <rect
              x="-2.8"
              y="-1.9"
              width="5.6"
              height="3.8"
              rx="0.5"
              className={
                isEnergized
                  ? "fill-sim-surface stroke-sim-cyan"
                  : "fill-sim-surface stroke-sim-border"
              }
              strokeWidth="0.5"
            />
            <rect
              x="-2.0"
              y="-0.6"
              width="2.0"
              height="1.2"
              className={
                isEnergized ? "fill-sim-cyan" : "fill-sim-line-inactive"
              }
            />
            <polygon
              points="0,-1.4 2.0,0 0,1.4"
              className={
                isEnergized ? "fill-sim-cyan" : "fill-sim-line-inactive"
              }
            />
          </g>
        )}

        {/* MODULATING VALVE (Image 3): Miniature curved body caps with diagonal butterfly throttle vane & center pivot */}
        {valveKind === "modulating" && (
          <g>
            <path
              d="M -2.4 -0.7 A 2.5 2.5 0 0 1 2.4 -0.7 Z"
              className={
                isEnergized
                  ? "fill-sim-surface stroke-sim-cyan"
                  : "fill-sim-surface stroke-sim-text-muted"
              }
              strokeWidth="0.5"
            />
            <path
              d="M -2.4 0.7 A 2.5 2.5 0 0 0 2.4 0.7 Z"
              className={
                isEnergized
                  ? "fill-sim-surface stroke-sim-cyan"
                  : "fill-sim-surface stroke-sim-text-muted"
              }
              strokeWidth="0.5"
            />
            <path
              d="M -1.9 1.5 L -1.3 2 L 1.9 -1.5 L 1.3 -2 Z"
              className={
                isEnergized
                  ? "fill-sim-cyan stroke-sim-cyan"
                  : "fill-sim-line-inactive stroke-sim-line-inactive"
              }
              strokeWidth="0.25"
            />
            <circle
              r="0.5"
              className="fill-sim-surface stroke-sim-text-muted"
              strokeWidth="0.4"
            />
          </g>
        )}

        {/* SOLENOID VALVE (Image 4): Miniature butterfly body + bellows stem + circle with 'S' */}
        {valveKind === "solenoid" && (
          <g>
            <path
              d="M -2.2 -1.7 L -0.4 0 L -2.2 1.7 Z M 1.1 -1.7 L -0.4 0 L 1.1 1.7 Z"
              className={
                isEnergized
                  ? "fill-sim-cyan/20 stroke-sim-cyan"
                  : "fill-sim-surface stroke-sim-text-muted"
              }
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
            <line
              x1="1.1"
              y1="0"
              x2="2.5"
              y2="0"
              className="stroke-sim-text-muted"
              strokeWidth="0.4"
            />
            <path
              d="M 1.8 -0.9 Q 2.3 -0.5 1.8 0 Q 1.3 0.5 1.8 0.9"
              className={
                isEnergized ? "stroke-sim-cyan" : "stroke-sim-text-muted"
              }
              strokeWidth="0.4"
              fill="none"
            />
            <circle
              cx="4.2"
              cy="0"
              r="1.6"
              className={
                isEnergized
                  ? "fill-sim-surface stroke-sim-cyan"
                  : "fill-sim-surface stroke-sim-text-muted"
              }
              strokeWidth="0.5"
            />
            <text
              x="4.2"
              y="0.8"
              textAnchor="middle"
              fontSize={2.2}
              fontWeight="bold"
              className={
                isEnergized
                  ? "fill-sim-cyan font-sim-sans"
                  : "fill-sim-text-muted font-sim-sans"
              }
            >
              S
            </text>
            <line
              x1="4.2"
              y1="-1.6"
              x2="4.2"
              y2="-2.2"
              className="stroke-sim-text-muted"
              strokeWidth="0.4"
            />
          </g>
        )}

        {/* ON/OFF SHUTOFF VALVE (Image 1): Miniature inline circular housing with open inline bar / closed cross bar */}
        {(valveKind === "on-off" ||
          valveKind === "shutoff-valve" ||
          !valveKind) && (
          <g>
            <circle
              r="1.9"
              className="fill-sim-surface stroke-sim-text-muted"
              strokeWidth="0.5"
            />
            {isOpen ? (
              <line
                x1="-1.9"
                y1="0"
                x2="1.9"
                y2="0"
                className={
                  isEnergized ? "stroke-sim-green" : "stroke-sim-line-inactive"
                }
                strokeWidth="0.75"
                strokeLinecap="round"
              />
            ) : (
              <line
                x1="0"
                y1="-1.9"
                x2="0"
                y2="1.9"
                className="stroke-sim-text-muted"
                strokeWidth="0.75"
                strokeLinecap="round"
              />
            )}
            <circle
              r="0.5"
              className={
                isEnergized
                  ? "fill-sim-surface stroke-sim-green"
                  : "fill-sim-surface stroke-sim-text-muted"
              }
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

      {/* Simple small yellow circle */}
      <circle
        r="2.2"
        className={
          isEnergized
            ? "fill-amber-400 stroke-sim-bg"
            : "fill-amber-400/40 stroke-sim-bg"
        }
        strokeWidth="0.5"
      />

      {/* Subtle hover indicator ring */}
      <circle
        r="4.2"
        className="fill-transparent stroke-amber-400/0 transition-all duration-150 group-hover:stroke-amber-400/60"
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
              className={linkStateClassNames[solved.state]}
              d={path}
              strokeWidth="0.75"
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

          return (
            <circle
              key={node.id}
              className={
                solved.energized
                  ? "fill-sim-cyan"
                  : "fill-sim-line-inactive"
              }
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

          return (
            <ValveNode
              key={node.id}
              node={node}
              point={point}
              solved={solved}
              angle={angle}
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
