import type {
  PneumaticLayout,
  PneumaticNetwork,
  PneumaticSolution,
  Point,
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

      {network.nodes.map((node) => {
        const point = layout.nodePositions[node.id];
        const solved = solution.nodes[node.id];

        if (node.kind === "accessory") {
          return (
            <g
              key={node.id}
              data-node-id={node.id}
              data-node-kind="accessory"
              transform={`translate(${point.x} ${point.y})`}
            >
              <title>
                {`Válvula provisoria · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`}
              </title>
              <circle
                className="fill-sim-surface stroke-sim-text-muted"
                r="3.1"
                strokeWidth="0.75"
              />
              <path
                className={
                  solved.energized
                    ? "stroke-sim-cyan"
                    : "stroke-sim-line-inactive"
                }
                d="m-2-2 4 4m0-4-4 4"
                strokeWidth="0.65"
              />
            </g>
          );
        }

        if (node.kind === "source") {
          return (
            <g
              key={node.id}
              data-node-id={node.id}
              data-node-kind="source"
              transform={`translate(${point.x} ${point.y})`}
            >
              <title>
                {`${node.label} · ${solved.pressurePsi} PSI · ${solved.temperatureC} °C`}
              </title>
              <circle
                className={
                  solved.energized
                    ? "fill-sim-cyan stroke-sim-bg"
                    : "fill-sim-line-inactive stroke-sim-bg"
                }
                r="2.2"
                strokeWidth="0.75"
              />
            </g>
          );
        }

        if (node.kind === "junction") {
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
              r="1.15"
              data-node-id={node.id}
              data-node-kind="junction"
            />
          );
        }

        return null;
      })}
    </g>
  );
}
