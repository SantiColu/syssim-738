import {
  KNOWN_CONSUMERS,
  type LegacyPneumaticLine,
  type MigratedPneumaticNetwork,
  type PneumaticLink,
  type PneumaticNode,
  type Point,
  type SourceDefinition,
  type ValveKind,
} from "./types";

const pointKey = ({ x, y }: Point) => `${x},${y}`;

const slugPoint = ({ x, y }: Point) => `${x}-${y}`;

function samePoint(left: Point, right: Point) {
  return left.x === right.x && left.y === right.y;
}

function sinkLabel(index: number) {
  return `OUTLET ${String(index + 1).padStart(2, "0")}`;
}

export function migrateLegacyNetwork(
  legacyLines: LegacyPneumaticLine[],
  sources: SourceDefinition[],
): MigratedPneumaticNetwork {
  const sourceByPoint = new Map(
    sources.map((source) => [pointKey(source.point), source]),
  );
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
    const pos = positions.get(key)!;
    const isKnownConsumer = [
      `junction-${slugPoint(pos)}`,
      `sink-${slugPoint(pos)}`,
      `valve-${slugPoint(pos)}`,
    ].some((id) => Boolean(KNOWN_CONSUMERS[id]));

    if (
      pointNeighbors.size !== 2 ||
      accessoryPoints.has(key) ||
      sourceByPoint.has(key) ||
      isKnownConsumer
    ) {
      protectedPoints.add(key);
    }
  }

  const nodeIdByPoint = new Map<string, string>();
  const nodes: PneumaticNode[] = [];
  const nodePositions: Record<string, Point> = {};
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
      const consumer = KNOWN_CONSUMERS[id];
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

  const initialState = {
    sources: Object.fromEntries(
      sources.map((source) => {
        const id = nodeIdByPoint.get(pointKey(source.point));
        if (!id) {
          throw new Error(
            `Source is not connected at ${pointKey(source.point)}`,
          );
        }
        return [id, source.initial];
      }),
    ),
    accessories: Object.fromEntries(
      nodes
        .filter((node) => node.kind === "accessory")
        .map((node) => [node.id, { open: node.accessory.normallyOpen }]),
    ),
  };

  return {
    network: { nodes, links },
    layout: { nodePositions, linkRoutes },
    initialState,
  };
}

export function validatePneumaticNetwork({
  network,
  layout,
}: MigratedPneumaticNetwork) {
  const errors: string[] = [];
  const nodeIds = new Set(network.nodes.map((node) => node.id));

  if (nodeIds.size !== network.nodes.length) errors.push("Duplicate node ids");

  for (const node of network.nodes) {
    if (!layout.nodePositions[node.id]) {
      errors.push(`Missing position for node ${node.id}`);
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

  if (errors.length > 0) {
    throw new Error(`Invalid pneumatic network:\n${errors.join("\n")}`);
  }
}
