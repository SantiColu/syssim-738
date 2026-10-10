import type {
  MediumState,
  PneumaticLink,
  PneumaticNetwork,
  PneumaticNode,
  PneumaticRuntimeState,
  PneumaticSolution,
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

/**
 * A check valve only admits flow through its declared inlet link; any other
 * link is an outlet. Returns false when flow would cross the flapper backwards.
 */
function checkValveAllows(
  node: PneumaticNode,
  link: PneumaticLink,
  direction: "enter" | "exit",
) {
  if (node.kind !== "accessory" || !node.accessory.kind.startsWith("check-valve")) {
    return true;
  }
  const isInlet = link.id === node.accessory.inletLinkId;
  return direction === "enter" ? isInlet : !isInlet;
}

export const PRECOOLER_COLD_TEMPERATURE_WEIGHT = 0.5;

type PrecoolerPort = "cold-inlet" | "hot-inlet" | "hot-outlet";

function getPrecoolerPort(
  node: PneumaticNode,
  link: PneumaticLink,
): PrecoolerPort | null {
  if (node.kind !== "accessory" || node.accessory.coldInletLinkId === undefined) {
    return null;
  }
  if (link.id === node.accessory.coldInletLinkId) return "cold-inlet";
  if (link.id === node.accessory.inletLinkId) return "hot-inlet";
  return "hot-outlet";
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

/**
 * Where two bleed stages of one engine merge, the air is a blend of both, but
 * only at nodes that air from every stage actually reaches (e.g. closing the
 * high stage valve leaves 5th stage air alone downstream).
 */
function getMixedTemperatures(
  network: PneumaticNetwork,
  runtime: PneumaticRuntimeState,
) {
  const mixedTemperatureByNode = new Map<string, number>();
  if (network.mixingZones.length === 0) return mixedTemperatureByNode;

  const unmixedNetwork = { ...network, mixingZones: [] };
  for (const zone of network.mixingZones) {
    const zoneSources = zone.sourceIds.map((id) => runtime.sources[id]);
    if (!zoneSources.every((source) => source?.enabled)) continue;

    // Solve once per stage on its own to see which nodes it reaches.
    const reachedBy = zone.sourceIds.map((sourceId) => {
      const sources = Object.fromEntries(
        Object.entries(runtime.sources).map(([id, source]) => [
          id,
          source && { ...source, enabled: id === sourceId },
        ]),
      );
      return solvePneumaticNetwork(unmixedNetwork, { ...runtime, sources }).nodes;
    });

    const average =
      zoneSources.reduce((sum, source) => sum + source!.temperatureC, 0) /
      zoneSources.length;
    for (const nodeId of zone.nodeIds) {
      if (reachedBy.every((nodes) => nodes[nodeId]?.energized)) {
        mixedTemperatureByNode.set(nodeId, Math.round(average));
      }
    }
  }
  return mixedTemperatureByNode;
}

export function solvePneumaticNetwork(
  network: PneumaticNetwork,
  runtime: PneumaticRuntimeState,
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

  const mixedTemperatureByNode = getMixedTemperatures(network, runtime);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentState = nodes[currentId];
    const currentNode = nodeById.get(currentId)!;

    const currentValveOpen =
      currentNode.kind !== "accessory" ||
      (runtime.accessories[currentId]?.open ??
        currentNode.accessory.normallyOpen);

    if (!currentValveOpen) continue;

    const mixedTemperature = mixedTemperatureByNode.get(currentId);
    if (mixedTemperature !== undefined) {
      currentState.temperatureC = mixedTemperature;
    }

    for (const link of linksByNode.get(currentId) ?? []) {
      const nextId = link.from === currentId ? link.to : link.from;
      const nextNode = nodeById.get(nextId)!;

      const currentPrecoolerPort = getPrecoolerPort(currentNode, link);
      if (currentPrecoolerPort && currentPrecoolerPort !== "hot-outlet") {
        continue;
      }

      const nextPrecoolerPort = getPrecoolerPort(nextNode, link);
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

      // Flow cannot leave a check valve through its inlet.
      if (!checkValveAllows(currentNode, link, "exit")) continue;

      // Flow reaching a check valve from its outlet side is held by the flapper.
      const isBlockedByCheckValve = !checkValveAllows(nextNode, link, "enter");

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
