import type {
  MediumState,
  PneumaticNetwork,
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
  candidate: MediumState,
) {
  return !current.energized || candidate.pressurePsi > current.pressurePsi;
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

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentState = nodes[currentId];
    const currentNode = nodeById.get(currentId)!;
    const currentValveOpen =
      currentNode.kind !== "accessory" ||
      (runtime.accessories[currentId]?.open ??
        currentNode.accessory.normallyOpen);

    if (!currentValveOpen) continue;

    for (const link of linksByNode.get(currentId) ?? []) {
      const nextId = link.from === currentId ? link.to : link.from;
      const nextNode = nodeById.get(nextId)!;
      const nextValveOpen =
        nextNode.kind !== "accessory" ||
        (runtime.accessories[nextId]?.open ?? nextNode.accessory.normallyOpen);

      links[link.id] = {
        state: nextValveOpen ? "active" : "isolated",
        medium: {
          pressurePsi: currentState.pressurePsi,
          temperatureC: currentState.temperatureC,
        },
      };

      if (shouldReplaceMedium(nodes[nextId], currentState)) {
        nodes[nextId] = { ...currentState };
        if (nextValveOpen) queue.push(nextId);
      }
    }
  }

  return { nodes, links };
}
