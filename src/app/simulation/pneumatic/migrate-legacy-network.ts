import type {
  ConsumerInfo,
  LegacyPneumaticLine,
  MigratedPneumaticNetwork,
  NetworkSpec,
  PneumaticLink,
  PneumaticNode,
  Point,
  SourceDefinition,
  ValveKind,
} from "./types";

const pointKey = ({ x, y }: Point) => `${x},${y}`;

const slugPoint = ({ x, y }: Point) => `${x}-${y}`;

function samePoint(left: Point, right: Point) {
  return left.x === right.x && left.y === right.y;
}

function sinkLabel(index: number) {
  return `OUTLET ${String(index + 1).padStart(2, "0")}`;
}

export function isCheckValveKind(kind: ValveKind) {
  return kind.startsWith("check-valve");
}

export function isHeatExchangerKind(kind: ValveKind) {
  return (
    kind === "precooler" ||
    kind === "precooler-reverse" ||
    kind === "heat-exchanger"
  );
}

export function migrateLegacyNetwork<Name extends string>(
  legacyLines: LegacyPneumaticLine[],
  spec: NetworkSpec<Name>,
): MigratedPneumaticNetwork<Name> {
  const names = Object.keys(spec.names) as Name[];
  const pointOf = (name: Name) => spec.names[name];

  const sourceByPoint = new Map<string, SourceDefinition>();
  const consumerByPoint = new Map<string, ConsumerInfo>();
  for (const name of names) {
    const source = spec.sources[name];
    const consumer = spec.consumers[name];
    if (source) sourceByPoint.set(pointKey(pointOf(name)), source);
    if (consumer) consumerByPoint.set(pointKey(pointOf(name)), consumer);
  }

  const accessoryPoints = new Map<string, ValveKind>();
  const positions = new Map<string, Point>();
  const neighbors = new Map<string, Set<string>>();

  const connect = (left: Point, right: Point) => {
    if (samePoint(left, right)) return;
    const leftKey = pointKey(left);
    const rightKey = pointKey(right);
    positions.set(leftKey, { x: left.x, y: left.y });
    positions.set(rightKey, { x: right.x, y: right.y });

    if (!neighbors.has(leftKey)) neighbors.set(leftKey, new Set());
    if (!neighbors.has(rightKey)) neighbors.set(rightKey, new Set());
    neighbors.get(leftKey)!.add(rightKey);
    neighbors.get(rightKey)!.add(leftKey);
  };

  for (const line of legacyLines) {
    for (const point of line.points) {
      positions.set(pointKey(point), { x: point.x, y: point.y });
      if (point.accessory) {
        const valveKind: ValveKind =
          typeof point.accessory === "string" ? point.accessory : "on-off";
        accessoryPoints.set(pointKey(point), valveKind);
      }
    }

    for (let index = 0; index < line.points.length - 1; index += 1) {
      connect(line.points[index], line.points[index + 1]);
    }
  }

  const protectedPoints = new Set<string>();
  for (const [key, pointNeighbors] of neighbors) {
    if (
      pointNeighbors.size !== 2 ||
      accessoryPoints.has(key) ||
      sourceByPoint.has(key) ||
      consumerByPoint.has(key)
    ) {
      protectedPoints.add(key);
    }
  }

  const nodeIdByPoint = new Map<string, string>();
  const nodes: PneumaticNode[] = [];
  const nodePositions: Record<string, Point> = {};
  const consumers: Record<string, ConsumerInfo> = {};
  let sinkIndex = 0;

  for (const key of [...protectedPoints].sort()) {
    const position = positions.get(key)!;
    const source = sourceByPoint.get(key);
    const degree = neighbors.get(key)?.size ?? 0;
    const id = source
      ? `source-${source.sourceKind}-${slugPoint(position)}`
      : accessoryPoints.has(key)
        ? `valve-${slugPoint(position)}`
        : degree <= 1
          ? `sink-${slugPoint(position)}`
          : `junction-${slugPoint(position)}`;

    nodeIdByPoint.set(key, id);
    nodePositions[id] = position;

    const consumer = consumerByPoint.get(key);
    if (consumer) consumers[id] = consumer;

    if (source) {
      nodes.push({
        id,
        kind: "source",
        sourceKind: source.sourceKind,
        label: source.label,
      });
    } else if (accessoryPoints.has(key)) {
      const valveKind = accessoryPoints.get(key) ?? "on-off";
      nodes.push({
        id,
        kind: "accessory",
        accessory: { kind: valveKind, normallyOpen: true },
      });
    } else if (degree <= 1) {
      nodes.push({
        id,
        kind: "sink",
        label: consumer ? consumer.label : sinkLabel(sinkIndex),
      });
      sinkIndex += 1;
    } else {
      nodes.push({ id, kind: "junction" });
    }
  }

  const visitedSegments = new Set<string>();
  const links: PneumaticLink[] = [];
  const linkRoutes: Record<string, Point[]> = {};
  const segmentKey = (left: string, right: string) =>
    [left, right].sort().join("|");

  for (const startKey of protectedPoints) {
    for (const firstNeighbor of neighbors.get(startKey) ?? []) {
      const firstSegment = segmentKey(startKey, firstNeighbor);
      if (visitedSegments.has(firstSegment)) continue;

      const route: Point[] = [positions.get(startKey)!];
      let previousKey = startKey;
      let currentKey = firstNeighbor;
      visitedSegments.add(firstSegment);

      while (!protectedPoints.has(currentKey)) {
        route.push(positions.get(currentKey)!);
        const nextKey = [...(neighbors.get(currentKey) ?? [])].find(
          (candidate) => candidate !== previousKey,
        );
        if (!nextKey) break;
        visitedSegments.add(segmentKey(currentKey, nextKey));
        previousKey = currentKey;
        currentKey = nextKey;
      }

      route.push(positions.get(currentKey)!);
      const from = nodeIdByPoint.get(startKey);
      const to = nodeIdByPoint.get(currentKey);
      if (!from || !to || from === to) continue;

      const id = `link-${String(links.length + 1).padStart(3, "0")}`;
      links.push({ id, from, to });
      linkRoutes[id] = route;
    }
  }

  // Resolve the spec's names against the drawing. A name whose point is not a
  // node (e.g. the point was moved in the drawing but not here) is an error.
  const ids = {} as Record<Name, string>;
  for (const name of names) {
    const id = nodeIdByPoint.get(pointKey(pointOf(name)));
    if (!id) {
      throw new Error(
        `Pneumatic node "${name}" at ${pointKey(pointOf(name))} is not a node of the drawing`,
      );
    }
    ids[name] = id;
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const linkBetween = (left: Name, right: Name) => {
    const candidates = links.filter(
      (link) =>
        (link.from === ids[left] && link.to === ids[right]) ||
        (link.from === ids[right] && link.to === ids[left]),
    );
    if (candidates.length !== 1) {
      throw new Error(
        `Expected exactly one link between "${left}" and "${right}", found ${candidates.length}`,
      );
    }
    return candidates[0].id;
  };

  const accessoryOf = (name: Name, isExpectedKind: (kind: ValveKind) => boolean) => {
    const node = nodeById.get(ids[name]);
    if (node?.kind !== "accessory" || !isExpectedKind(node.accessory.kind)) {
      throw new Error(`Pneumatic node "${name}" has an unexpected kind`);
    }
    return node.accessory;
  };

  for (const { valve, inletFrom } of spec.checkValves) {
    accessoryOf(valve, isCheckValveKind).inletLinkId = linkBetween(valve, inletFrom);
  }

  for (const { exchanger, hotInletFrom, coldInletFrom } of spec.heatExchangers) {
    const accessory = accessoryOf(exchanger, isHeatExchangerKind);
    accessory.inletLinkId = linkBetween(exchanger, hotInletFrom);
    accessory.coldInletLinkId = linkBetween(exchanger, coldInletFrom);
  }

  const mixingZones = spec.mixingZones.map((zone) => ({
    sourceIds: zone.sources.map((name) => ids[name]),
    nodeIds: zone.nodes.map((name) => ids[name]),
  }));

  const initialState = {
    sources: Object.fromEntries(
      names
        .filter((name) => spec.sources[name])
        .map((name) => [ids[name], spec.sources[name]!.initial]),
    ),
    accessories: Object.fromEntries(
      nodes
        .filter((node) => node.kind === "accessory")
        .map((node) => [node.id, { open: node.accessory.normallyOpen }]),
    ),
  };

  return {
    network: { nodes, links, mixingZones },
    layout: { nodePositions, linkRoutes },
    initialState,
    ids,
    consumers,
  };
}

export function validatePneumaticNetwork({
  network,
  layout,
}: MigratedPneumaticNetwork) {
  const errors: string[] = [];
  const nodeIds = new Set(network.nodes.map((node) => node.id));
  const linkIds = new Set(network.links.map((link) => link.id));

  if (nodeIds.size !== network.nodes.length) errors.push("Duplicate node ids");

  for (const node of network.nodes) {
    if (!layout.nodePositions[node.id]) {
      errors.push(`Missing position for node ${node.id}`);
    }
    if (node.kind !== "accessory") continue;

    const { kind, inletLinkId, coldInletLinkId } = node.accessory;
    if (isCheckValveKind(kind) && !inletLinkId) {
      errors.push(`Check valve ${node.id} has no declared inlet`);
    }
    if (isHeatExchangerKind(kind) && (!inletLinkId || !coldInletLinkId)) {
      errors.push(`Heat exchanger ${node.id} has no declared hot/cold inlets`);
    }
    for (const linkId of [inletLinkId, coldInletLinkId]) {
      if (linkId && !linkIds.has(linkId)) {
        errors.push(`Accessory ${node.id} references unknown link ${linkId}`);
      }
    }
  }

  for (const link of network.links) {
    if (!nodeIds.has(link.from) || !nodeIds.has(link.to)) {
      errors.push(`Link ${link.id} references an unknown node`);
    }
    if (!layout.linkRoutes[link.id]?.length) {
      errors.push(`Missing route for link ${link.id}`);
    }
  }

  for (const zone of network.mixingZones) {
    for (const id of [...zone.sourceIds, ...zone.nodeIds]) {
      if (!nodeIds.has(id)) errors.push(`Mixing zone references unknown node ${id}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid pneumatic network:\n${errors.join("\n")}`);
  }
}
