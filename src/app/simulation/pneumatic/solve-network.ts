import type {
  MediumState,
  PneumaticLayout,
  PneumaticNetwork,
  PneumaticNode,
  PneumaticRuntimeState,
  PneumaticSolution,
  Point,
  SolvedNodeState,
} from "./types";

const EMPTY_NODE_STATE: SolvedNodeState = {
  energized: false,
  sourceId: null,
  pressurePsi: 0,
  temperatureC: 0,
};

function shouldReplaceMedium(
  current: SolvedNodeState,
  candidate: SolvedNodeState,
) {
  return (
    !current.energized ||
    candidate.pressurePsi > current.pressurePsi ||
    (candidate.pressurePsi === current.pressurePsi &&
      candidate.sourceId === current.sourceId &&
      candidate.temperatureC !== current.temperatureC)
  );
}

function getNodePoint(nodeId: string, layout?: PneumaticLayout): Point {
  if (layout?.nodePositions[nodeId]) return layout.nodePositions[nodeId];
  const parts = nodeId.split("-");
  const y = parseFloat(parts[parts.length - 1]);
  const x = parseFloat(parts[parts.length - 2]);
  if (!isNaN(x) && !isNaN(y)) return { x, y };
  return { x: 0, y: 0 };
}

// Directional rules for check valves (non-return valves):
// A check valve allows flow ONLY in the forward direction: inlet -> valve -> outlet.
// Flow attempting to enter the valve from the outlet side is blocked.
const CHECK_VALVE_FLOW_RULES: Record<
  string,
  {
    allowedInlet: (pos: Point) => boolean;
    allowedOutlet: (pos: Point) => boolean;
  }
> = {
  // Ground Air Check Valve at (384, 256):
  // Allows UPward flow from Ground Air connection (384, 275) -> Manifold (384, 243)
  // Blocks reverse flow from Manifold (384, 243) down to Ground connection (384, 275)
  "valve-384-256": {
    allowedInlet: (pos) => pos.y > 256, // from Ground Connection (y = 275)
    allowedOutlet: (pos) => pos.y < 256, // to Manifold (y = 243)
  },
  // APU Check Valve at (366, 475):
  // Allows UPward flow from APU (371, 496) -> Manifold (363, 435)
  // Blocks reverse flow from Manifold (363, 435) down to APU line
  "valve-366-475": {
    allowedInlet: (pos) => pos.y > 475, // from APU (y = 496)
    allowedOutlet: (pos) => pos.y < 475, // to Manifold (y = 435)
  },
  // Engine 1 5th Stage Check Valve at (314, 236):
  // Allows RIGHTward flow from 5th stage source (307, 236) -> Manifold/PRSOV (320, 236)
  // Blocks reverse flow from 9th stage/manifold (320, 236) backwards into 5th stage
  "valve-314-236": {
    allowedInlet: (pos) => pos.x < 314, // from 5th stage (x = 307)
    allowedOutlet: (pos) => pos.x > 314, // to Manifold (x = 320)
  },
  // Engine 2 5th Stage Check Valve at (447, 236):
  // Allows LEFTward flow from 5th stage source (453, 236) -> Manifold/PRSOV (441, 236)
  // Blocks reverse flow from 9th stage/manifold (441, 236) backwards into 5th stage
  "valve-447-236": {
    allowedInlet: (pos) => pos.x > 447, // from 5th stage (x = 453)
    allowedOutlet: (pos) => pos.x < 447, // to Manifold (x = 441)
  },
};

export const PRECOOLER_COLD_TEMPERATURE_WEIGHT = 0.5;

type PrecoolerPort = "cold-inlet" | "hot-inlet" | "hot-outlet";

function getPrecoolerDirection(node: PneumaticNode): 1 | -1 | null {
  if (node.kind !== "accessory") return null;
  if (node.accessory.kind === "precooler") return 1;
  if (node.accessory.kind === "precooler-reverse") return -1;
  if (node.accessory.kind === "heat-exchanger") return 1;
  return null;
}

function getPrecoolerPort(
  node: PneumaticNode,
  center: Point,
  neighbor: Point,
): PrecoolerPort | null {
  const direction = getPrecoolerDirection(node);
  if (!direction) return null;

  const dx = neighbor.x - center.x;
  const dy = neighbor.y - center.y;
  if (dy < 0 && Math.abs(dy) > Math.abs(dx)) return "cold-inlet";
  return dx * direction < 0 ? "hot-inlet" : "hot-outlet";
}

function solvePrecoolerOutlet(
  hot: SolvedNodeState,
  cold?: MediumState,
): SolvedNodeState {
  if (!cold) return { ...hot };

  const coldWeight = PRECOOLER_COLD_TEMPERATURE_WEIGHT;
  return {
    ...hot,
    temperatureC: Math.round(
      hot.temperatureC * (1 - coldWeight) + cold.temperatureC * coldWeight,
    ),
  };
}

export function solvePneumaticNetwork(
  network: PneumaticNetwork,
  runtime: PneumaticRuntimeState,
  layout?: PneumaticLayout,
): PneumaticSolution {
  const nodeById = new Map(network.nodes.map((node) => [node.id, node]));
  const linksByNode = new Map<string, typeof network.links>();

  for (const link of network.links) {
    if (!linksByNode.has(link.from)) linksByNode.set(link.from, []);
    if (!linksByNode.has(link.to)) linksByNode.set(link.to, []);
    linksByNode.get(link.from)!.push(link);
    linksByNode.get(link.to)!.push(link);
  }

  const nodes = Object.fromEntries(
    network.nodes.map((node) => [node.id, { ...EMPTY_NODE_STATE }]),
  );
  const links: PneumaticSolution["links"] = Object.fromEntries(
    network.links.map((link) => [
      link.id,
      { state: "inactive" as const, medium: null },
    ]),
  );
  const queue: string[] = [];
  const precoolerHotInputs = new Map<string, SolvedNodeState>();
  const precoolerColdInputs = new Map<string, MediumState>();

  for (const node of network.nodes) {
    if (node.kind !== "source") continue;
    const source = runtime.sources[node.id];
    if (!source?.enabled) continue;
    nodes[node.id] = {
      energized: true,
      sourceId: node.id,
      pressurePsi: source.pressurePsi,
      temperatureC: source.temperatureC,
    };
    queue.push(node.id);
  }

  const ENG1_5TH = "source-engine-307-236";
  const ENG1_9TH = "source-engine-307-253";
  const ENG2_5TH = "source-engine-453-236";
  const ENG2_9TH = "source-engine-453-254";

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentState = nodes[currentId];
    const currentNode = nodeById.get(currentId)!;
    const currentPos = getNodePoint(currentId, layout);

    const currentValveOpen =
      currentNode.kind !== "accessory" ||
      (runtime.accessories[currentId]?.open ??
        currentNode.accessory.normallyOpen);

    if (!currentValveOpen) continue;

    // Handle 5th and 9th stage mixing at engine junctions:
    // When both stages are active, the temperature is the average of 5th (~200°C) and 9th (~390°C) -> 295°C
    if (
      currentId === "junction-320-253" ||
      currentId === "junction-320-254" ||
      currentId === "junction-320-245"
    ) {
      const is5thActive = runtime.sources[ENG1_5TH]?.enabled ?? false;
      const is9thActive = runtime.sources[ENG1_9TH]?.enabled ?? false;
      if (is5thActive && is9thActive) {
        const tMix = Math.round((200 + 390) / 2); // 295°C
        currentState.temperatureC = tMix;
        nodes[currentId].temperatureC = tMix;
      }
    }

    if (
      currentId === "junction-440-254" ||
      currentId === "junction-441-254" ||
      currentId === "junction-440-245" ||
      currentId === "junction-441-245"
    ) {
      const is5thActive = runtime.sources[ENG2_5TH]?.enabled ?? false;
      const is9thActive = runtime.sources[ENG2_9TH]?.enabled ?? false;
      if (is5thActive && is9thActive) {
        const tMix = Math.round((200 + 390) / 2); // 295°C
        currentState.temperatureC = tMix;
        nodes[currentId].temperatureC = tMix;
      }
    }

    for (const link of linksByNode.get(currentId) ?? []) {
      const nextId = link.from === currentId ? link.to : link.from;
      const nextNode = nodeById.get(nextId)!;
      const nextPos = getNodePoint(nextId, layout);

      const currentPrecoolerPort = getPrecoolerPort(
        currentNode,
        currentPos,
        nextPos,
      );
      if (currentPrecoolerPort && currentPrecoolerPort !== "hot-outlet") {
        continue;
      }

      const nextPrecoolerPort = getPrecoolerPort(
        nextNode,
        nextPos,
        currentPos,
      );
      if (nextPrecoolerPort) {
        // A precooler is a directional heat exchanger, not a junction:
        // cold air terminates at the cold side, while hot bleed can only cross
        // from the declared inlet to the declared outlet.
        links[link.id] = {
          state: "active",
          medium: {
            pressurePsi: currentState.pressurePsi,
            temperatureC: currentState.temperatureC,
          },
        };

        // Reverse pressure reaches the outlet face, but cannot cross the
        // exchanger/check-valve element into the engine bleed side.
        if (nextPrecoolerPort === "hot-outlet") continue;

        if (nextPrecoolerPort === "cold-inlet") {
          precoolerColdInputs.set(nextId, {
            pressurePsi: currentState.pressurePsi,
            temperatureC: currentState.temperatureC,
          });
        } else {
          const previousHot = precoolerHotInputs.get(nextId);
          if (!previousHot || shouldReplaceMedium(previousHot, currentState)) {
            precoolerHotInputs.set(nextId, { ...currentState });
          }
        }

        const hotInput = precoolerHotInputs.get(nextId);
        if (hotInput) {
          const outlet = solvePrecoolerOutlet(
            hotInput,
            precoolerColdInputs.get(nextId),
          );
          if (shouldReplaceMedium(nodes[nextId], outlet)) {
            nodes[nextId] = outlet;
            const nextPrecoolerOpen =
              runtime.accessories[nextId]?.open ??
              (nextNode.kind === "accessory" &&
                nextNode.accessory.normallyOpen);
            if (nextPrecoolerOpen) queue.push(nextId);
          }
        }
        continue;
      }

      // Check if current node is a check valve exiting towards nextId:
      const currentCheckRule = CHECK_VALVE_FLOW_RULES[currentId];
      if (currentCheckRule && !currentCheckRule.allowedOutlet(nextPos)) {
        // Flow cannot exit this check valve in the reverse direction!
        continue;
      }

      // Check if next node is a check valve being entered from currentId:
      let isBlockedByCheckValve = false;
      const nextCheckRule = CHECK_VALVE_FLOW_RULES[nextId];
      if (nextCheckRule && !nextCheckRule.allowedInlet(currentPos)) {
        // Flow is trying to enter the check valve backwards (against the flapper)!
        isBlockedByCheckValve = true;
      }

      const nextValveOpen =
        !isBlockedByCheckValve &&
        (nextNode.kind !== "accessory" ||
          (runtime.accessories[nextId]?.open ?? nextNode.accessory.normallyOpen));

      // The link receives the medium
      links[link.id] = {
        state: "active",
        medium: {
          pressurePsi: currentState.pressurePsi,
          temperatureC: currentState.temperatureC,
        },
      };

      if (!isBlockedByCheckValve && shouldReplaceMedium(nodes[nextId], currentState)) {
        nodes[nextId] = { ...currentState };
        if (nextValveOpen) queue.push(nextId);
      }
    }
  }

  return { nodes, links };
}
