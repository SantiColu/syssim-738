import type {
  MediumState,
  PneumaticLayout,
  PneumaticNetwork,
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
  candidate: MediumState,
) {
  return !current.energized || candidate.pressurePsi > current.pressurePsi;
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
  // Ground Air Check Valve at (384, 241):
  // Allows UPward flow from Ground Air connection (384, 260) -> Manifold (384, 228)
  // Blocks reverse flow from Manifold (384, 228) down to Ground connection (384, 260)
  "valve-384-241": {
    allowedInlet: (pos) => pos.y > 241, // from Ground Connection (y = 260)
    allowedOutlet: (pos) => pos.y < 241, // to Manifold (y = 228)
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
  const ENG1_FAN = "source-engine-326-212";
  const ENG1_PRECOOLER = "valve-337-253";

  const ENG2_5TH = "source-engine-453-236";
  const ENG2_9TH = "source-engine-453-254";
  const ENG2_FAN = "source-engine-434-212";
  const ENG2_PRECOOLER = "valve-424-254";

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

    // Fan Air cools the precooler, but terminates at the precooler and does not enter the bleed duct
    if (
      (currentId === ENG1_PRECOOLER && currentState.sourceId === ENG1_FAN) ||
      (currentId === ENG2_PRECOOLER && currentState.sourceId === ENG2_FAN)
    ) {
      continue;
    }

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

    // Handle Precooler heat exchange:
    // Hot bleed air is cooled by mixing/averaging with cold Fan Air (~25°C) -> ~160°C
    if (currentId === ENG1_PRECOOLER) {
      const isFanActive = runtime.sources[ENG1_FAN]?.enabled ?? false;
      if (isFanActive) {
        const tCooled = Math.round((currentState.temperatureC + 25) / 2); // e.g. (295 + 25)/2 = 160°C
        currentState.temperatureC = tCooled;
        nodes[ENG1_PRECOOLER].temperatureC = tCooled;
      }
    }

    if (currentId === ENG2_PRECOOLER) {
      const isFanActive = runtime.sources[ENG2_FAN]?.enabled ?? false;
      if (isFanActive) {
        const tCooled = Math.round((currentState.temperatureC + 25) / 2); // e.g. (295 + 25)/2 = 160°C
        currentState.temperatureC = tCooled;
        nodes[ENG2_PRECOOLER].temperatureC = tCooled;
      }
    }

    for (const link of linksByNode.get(currentId) ?? []) {
      const nextId = link.from === currentId ? link.to : link.from;
      const nextNode = nodeById.get(nextId)!;
      const nextPos = getNodePoint(nextId, layout);

      // Do not allow pneumatic air to push back into Fan Air intake
      if (nextId === ENG1_FAN || nextId === ENG2_FAN) {
        continue;
      }

      // Do not allow pneumatic bleed air from Precooler to push back into Fan Air cooling duct (y < 250)
      if (
        (currentId === ENG1_PRECOOLER || currentId === ENG2_PRECOOLER) &&
        currentState.sourceId !== ENG1_FAN &&
        currentState.sourceId !== ENG2_FAN
      ) {
        if (nextPos.y < 250) {
          continue;
        }
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
