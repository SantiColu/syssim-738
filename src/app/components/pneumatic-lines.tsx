"use client";

import { useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

export type PneumaticLineState =
  | "inactive"
  | "active"
  | "isolated"
  | "warning";

export type PneumaticPoint = {
  x: number;
  y: number;
  accessory?: boolean;
};

export type PneumaticLine = {
  id: string;
  points: PneumaticPoint[];
};

type PneumaticLineLayerProps = {
  lines: PneumaticLine[];
  editing?: boolean;
  states?: Partial<Record<string, PneumaticLineState>>;
  onLinesChange?: (lines: PneumaticLine[]) => void;
};

type PointDragState = {
  lineId: string;
  pointIndex: number;
  pointerId: number;
  mode: "move" | "branch";
  origin: PneumaticPoint;
};

type BranchPreview = {
  start: PneumaticPoint;
  end: PneumaticPoint;
};

type SelectionBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SelectionTransformDrag = {
  pointerId: number;
  mode: "move" | "scale";
  start: PneumaticPoint;
  anchor?: PneumaticPoint;
  originalLines: PneumaticLine[];
  selectedKeys: Set<string>;
};

export const LEFT_ENGINE_PNEUMATIC_LINES: PneumaticLine[] = [
  {
    id: "left-wing-anti-ice-branch",
    points: [
      { x: 358, y: 247 },
      { x: 350, y: 247, accessory: true },
      { x: 343, y: 247, accessory: true },
      { x: 337, y: 247 },
      { x: 331, y: 247 },
      { x: 325, y: 247, accessory: true },
      { x: 319, y: 247 },
    ],
  },
  {
    id: "left-main-bleed-duct",
    points: [
      { x: 358, y: 247 },
      { x: 358, y: 214 },
    ],
  },
  {
    id: "left-hydraulic-reservoir-branch",
    points: [
      { x: 358, y: 214 },
      { x: 337, y: 214, accessory: true },
      { x: 330, y: 214, accessory: true },
    ],
  },
  {
    id: "left-water-tank-branch",
    points: [
      { x: 358, y: 247 },
      { x: 358, y: 247 },
      { x: 366, y: 247 },
      { x: 373, y: 247 },
    ],
  },
  {
    id: "left-wing-anti-ice-branch-branch-1",
    points: [
      { x: 331, y: 247 },
      { x: 331, y: 254 },
      { x: 331, y: 260 },
    ],
  },
  {
    id: "left-wing-anti-ice-branch-branch-1-branch-1",
    points: [
      { x: 331, y: 260 },
      { x: 325, y: 260, accessory: true },
      { x: 318, y: 260 },
    ],
  },
  {
    id: "left-wing-anti-ice-branch-branch-1-branch-2",
    points: [
      { x: 331, y: 254 },
      { x: 326, y: 254 },
    ],
  },
  {
    id: "left-wing-anti-ice-branch-branch-2",
    points: [
      { x: 337, y: 247 },
      { x: 337, y: 241, accessory: true },
    ],
  },
  {
    id: "left-water-tank-branch-branch-1",
    points: [
      { x: 366, y: 247 },
      { x: 366, y: 207 },
    ],
  },
  {
    id: "left-water-tank-branch-branch-1-branch-1",
    points: [
      { x: 366, y: 207 },
      { x: 347, y: 207, accessory: true },
      { x: 337, y: 207, accessory: true },
    ],
  },
  {
    id: "left-water-tank-branch-branch-2",
    points: [
      { x: 373, y: 247 },
      { x: 374, y: 480, accessory: true },
      { x: 374, y: 497, accessory: true },
      { x: 374, y: 518 },
    ],
  },
  {
    id: "left-water-tank-branch-branch-2-branch-1",
    points: [
      { x: 374, y: 518 },
      { x: 380, y: 518 },
    ],
  },
  {
    id: "left-water-tank-branch-branch-2-branch-2",
    points: [
      { x: 373, y: 247 },
      { x: 373, y: 215 },
      { x: 373, y: 207 },
      { x: 373, y: 172 },
    ],
  },
  {
    id: "left-water-tank-branch-branch-2-branch-2-branch-1",
    points: [
      { x: 373, y: 215 },
      { x: 379, y: 215 },
    ],
  },
  {
    id: "left-water-tank-branch-branch-2-branch-2-branch-2",
    points: [
      { x: 373, y: 207 },
      { x: 379, y: 207 },
    ],
  },
  {
    id: "left-water-tank-branch-branch-2-branch-2-branch-3",
    points: [
      { x: 373, y: 172 },
      { x: 359, y: 172, accessory: true },
    ],
  },
  {
    id: "left-water-tank-branch-branch-2-branch-2-branch-3-branch-1",
    points: [
      { x: 373, y: 172 },
      { x: 373, y: 122 },
    ],
  },
  {
    id: "left-water-tank-branch-branch-2-branch-2-branch-3-branch-1-branch-1",
    points: [
      { x: 373, y: 172 },
      { x: 385, y: 172, accessory: true },
    ],
  },
];

const stateClassNames: Record<PneumaticLineState, string> = {
  inactive: "stroke-sim-line-inactive",
  active: "stroke-sim-cyan",
  isolated: "stroke-sim-line-isolated",
  warning: "stroke-sim-accent",
};

export function clonePneumaticLines(lines: PneumaticLine[]) {
  return lines.map((line) => ({
    ...line,
    points: line.points.map((point) => ({ ...point })),
  }));
}

export function serializePneumaticLines(lines: PneumaticLine[]) {
  return JSON.stringify(lines, null, 2);
}

function pointsToPath(points: PneumaticPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function getLocalPoint(
  target: SVGGraphicsElement,
  clientX: number,
  clientY: number,
) {
  const svg = target.ownerSVGElement;
  const matrix = target.getScreenCTM();
  if (!svg || !matrix) return null;

  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const transformed = point.matrixTransform(matrix.inverse());

  return {
    x: Math.round(transformed.x),
    y: Math.round(transformed.y),
  };
}

function projectPointOntoSegment(
  point: PneumaticPoint,
  start: PneumaticPoint,
  end: PneumaticPoint,
) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared === 0) return start;

  const ratio = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
        lengthSquared,
    ),
  );

  return {
    x: Math.round(start.x + ratio * segmentX),
    y: Math.round(start.y + ratio * segmentY),
  };
}

function getPointKey(lineId: string, pointIndex: number) {
  return `${lineId}:${pointIndex}`;
}

function getSelectionBounds(
  lines: PneumaticLine[],
  selectedKeys: Set<string>,
): SelectionBounds | null {
  const points = lines.flatMap((line) =>
    line.points.filter((_, pointIndex) =>
      selectedKeys.has(getPointKey(line.id, pointIndex)),
    ),
  );
  if (points.length === 0) return null;

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);

  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  };
}

export function PneumaticLineLayer({
  lines,
  editing = false,
  states = {},
  onLinesChange,
}: PneumaticLineLayerProps) {
  const pointDragRef = useRef<PointDragState | null>(null);
  const marqueePointerRef = useRef<{
    pointerId: number;
    start: PneumaticPoint;
  } | null>(null);
  const selectionTransformRef = useRef<SelectionTransformDrag | null>(null);
  const [branchPreview, setBranchPreview] = useState<BranchPreview | null>(null);
  const [marquee, setMarquee] = useState<BranchPreview | null>(null);
  const [selectedPointKeys, setSelectedPointKeys] = useState<string[]>([]);
  const selectedKeySet = new Set(selectedPointKeys);
  const selectionBounds = getSelectionBounds(lines, selectedKeySet);

  const startPointDrag = (
    event: ReactPointerEvent<SVGGElement>,
    lineId: string,
    pointIndex: number,
  ) => {
    if (event.button !== 0) return;
    const origin = lines.find((line) => line.id === lineId)?.points[pointIndex];
    if (!origin) return;

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointDragRef.current = {
      lineId,
      pointIndex,
      pointerId: event.pointerId,
      mode: event.altKey ? "branch" : "move",
      origin: { ...origin },
    };

    if (event.altKey) {
      setBranchPreview({ start: origin, end: origin });
    }
  };

  const movePoint = (event: ReactPointerEvent<SVGGElement>) => {
    const drag = pointDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !onLinesChange) return;

    event.stopPropagation();
    const point = getLocalPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    if (!point) return;

    if (drag.mode === "branch") {
      setBranchPreview({ start: drag.origin, end: point });
      return;
    }

    const draggedLine = lines.find((line) => line.id === drag.lineId);
    const origin = draggedLine?.points[drag.pointIndex];
    if (!origin) return;

    onLinesChange(
      lines.map((line) => ({
        ...line,
        points: line.points.map((currentPoint) =>
          currentPoint.x === origin.x && currentPoint.y === origin.y
            ? { ...currentPoint, ...point }
            : currentPoint,
        ),
      })),
    );
  };

  const finishPointDrag = (
    event: ReactPointerEvent<SVGGElement>,
    createBranch = true,
  ) => {
    const drag = pointDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();

    if (drag.mode === "branch" && createBranch && onLinesChange) {
      const end = getLocalPoint(
        event.currentTarget,
        event.clientX,
        event.clientY,
      );

      if (end && (end.x !== drag.origin.x || end.y !== drag.origin.y)) {
        const idPrefix = `${drag.lineId}-branch`;
        let branchNumber = 1;
        while (lines.some((line) => line.id === `${idPrefix}-${branchNumber}`)) {
          branchNumber += 1;
        }

        onLinesChange([
          ...lines,
          {
            id: `${idPrefix}-${branchNumber}`,
            points: [drag.origin, end],
          },
        ]);
      }
    }

    pointDragRef.current = null;
    setBranchPreview(null);
  };

  const addPoint = (
    event: ReactMouseEvent<SVGPathElement>,
    lineId: string,
  ) => {
    event.stopPropagation();
    if (!onLinesChange) return;

    const clickedPoint = getLocalPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    const line = lines.find((currentLine) => currentLine.id === lineId);
    if (!clickedPoint || !line || line.points.length < 2) return;

    let closestSegmentIndex = 0;
    let closestPoint = line.points[0];
    let closestDistanceSquared = Number.POSITIVE_INFINITY;

    for (let index = 0; index < line.points.length - 1; index += 1) {
      const projectedPoint = projectPointOntoSegment(
        clickedPoint,
        line.points[index],
        line.points[index + 1],
      );
      const distanceSquared =
        (clickedPoint.x - projectedPoint.x) ** 2 +
        (clickedPoint.y - projectedPoint.y) ** 2;

      if (distanceSquared < closestDistanceSquared) {
        closestSegmentIndex = index;
        closestPoint = projectedPoint;
        closestDistanceSquared = distanceSquared;
      }
    }

    onLinesChange(
      lines.map((currentLine) =>
        currentLine.id === lineId
          ? {
              ...currentLine,
              points: [
                ...currentLine.points.slice(0, closestSegmentIndex + 1),
                closestPoint,
                ...currentLine.points.slice(closestSegmentIndex + 1),
              ],
            }
          : currentLine,
      ),
    );
  };

  const removePoint = (
    event: ReactMouseEvent<SVGGElement>,
    lineId: string,
    pointIndex: number,
  ) => {
    event.stopPropagation();
    if (!onLinesChange) return;

    const line = lines.find((currentLine) => currentLine.id === lineId);
    if (!line) return;

    if (line.points.length <= 2) {
      setSelectedPointKeys([]);
      onLinesChange(lines.filter((currentLine) => currentLine.id !== lineId));
      return;
    }

    onLinesChange(
      lines.map((currentLine) =>
        currentLine.id === lineId
          ? {
              ...currentLine,
              points: currentLine.points.filter(
                (_, index) => index !== pointIndex,
              ),
            }
          : currentLine,
      ),
    );
    setSelectedPointKeys([]);
  };

  const toggleAccessory = (
    event: ReactMouseEvent<SVGGElement>,
    lineId: string,
    pointIndex: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!onLinesChange) return;

    const selectedPoint = lines.find((line) => line.id === lineId)?.points[
      pointIndex
    ];
    if (!selectedPoint) return;
    const accessory = !selectedPoint.accessory;

    onLinesChange(
      lines.map((line) => ({
        ...line,
        points: line.points.map((point) =>
          point.x === selectedPoint.x && point.y === selectedPoint.y
            ? { ...point, accessory: accessory || undefined }
            : point,
        ),
      })),
    );
  };

  const startMarquee = (event: ReactPointerEvent<SVGRectElement>) => {
    if (event.button !== 0) return;

    if (!event.shiftKey) {
      setSelectedPointKeys([]);
      return;
    }

    const start = getLocalPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    if (!start) return;

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    marqueePointerRef.current = { pointerId: event.pointerId, start };
    setMarquee({ start, end: start });
  };

  const moveMarquee = (event: ReactPointerEvent<SVGRectElement>) => {
    const drag = marqueePointerRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.stopPropagation();
    const end = getLocalPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    if (end) setMarquee({ start: drag.start, end });
  };

  const finishMarquee = (
    event: ReactPointerEvent<SVGRectElement>,
    applySelection = true,
  ) => {
    const drag = marqueePointerRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();

    const end = getLocalPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );

    if (applySelection && end) {
      const left = Math.min(drag.start.x, end.x);
      const right = Math.max(drag.start.x, end.x);
      const top = Math.min(drag.start.y, end.y);
      const bottom = Math.max(drag.start.y, end.y);
      const nextSelection = lines.flatMap((line) =>
        line.points.flatMap((point, pointIndex) =>
          point.x >= left &&
          point.x <= right &&
          point.y >= top &&
          point.y <= bottom
            ? [getPointKey(line.id, pointIndex)]
            : [],
        ),
      );
      setSelectedPointKeys(nextSelection);
    }

    marqueePointerRef.current = null;
    setMarquee(null);
  };

  const startSelectionTransform = (
    event: ReactPointerEvent<SVGGraphicsElement>,
    mode: "move" | "scale",
    start: PneumaticPoint,
    anchor?: PneumaticPoint,
  ) => {
    const pointer = getLocalPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    if (event.button !== 0 || !pointer) return;

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectionTransformRef.current = {
      pointerId: event.pointerId,
      mode,
      start: mode === "move" ? pointer : start,
      anchor,
      originalLines: clonePneumaticLines(lines),
      selectedKeys: new Set(selectedPointKeys),
    };
  };

  const moveSelectionTransform = (
    event: ReactPointerEvent<SVGGraphicsElement>,
  ) => {
    const drag = selectionTransformRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !onLinesChange) return;

    event.stopPropagation();
    const pointer = getLocalPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    if (!pointer) return;

    let transformPoint: (point: PneumaticPoint) => PneumaticPoint;

    if (drag.mode === "move") {
      const offsetX = pointer.x - drag.start.x;
      const offsetY = pointer.y - drag.start.y;
      transformPoint = (point) => ({
        x: Math.round(point.x + offsetX),
        y: Math.round(point.y + offsetY),
      });
    } else {
      if (!drag.anchor) return;
      const startDistance = Math.hypot(
        drag.start.x - drag.anchor.x,
        drag.start.y - drag.anchor.y,
      );
      const currentDistance = Math.hypot(
        pointer.x - drag.anchor.x,
        pointer.y - drag.anchor.y,
      );
      const scale = Math.max(0.05, currentDistance / Math.max(1, startDistance));
      transformPoint = (point) => ({
        x: Math.round(drag.anchor!.x + (point.x - drag.anchor!.x) * scale),
        y: Math.round(drag.anchor!.y + (point.y - drag.anchor!.y) * scale),
      });
    }

    onLinesChange(
      drag.originalLines.map((line) => ({
        ...line,
        points: line.points.map((point, pointIndex) =>
          drag.selectedKeys.has(getPointKey(line.id, pointIndex))
            ? { ...point, ...transformPoint(point) }
            : point,
        ),
      })),
    );
  };

  const finishSelectionTransform = (
    event: ReactPointerEvent<SVGGraphicsElement>,
  ) => {
    if (selectionTransformRef.current?.pointerId !== event.pointerId) return;
    event.stopPropagation();
    selectionTransformRef.current = null;
  };

  return (
    <g
      className="fill-none [stroke-linecap:round] [stroke-linejoin:round]"
      aria-label="Líneas del sistema neumático del motor izquierdo"
    >
      {editing && (
        <rect
          className="fill-transparent"
          width="760"
          height="580"
          pointerEvents="all"
          onPointerDown={startMarquee}
          onPointerMove={moveMarquee}
          onPointerUp={finishMarquee}
          onPointerCancel={(event) => finishMarquee(event, false)}
        />
      )}
      {lines.map((line) => {
        const state = states[line.id] ?? "inactive";
        const path = pointsToPath(line.points);

        return (
          <g
            key={line.id}
            id={`pneumatic-line-${line.id}`}
            data-line-id={line.id}
            data-state={state}
          >
            <path
              className="stroke-sim-bg"
              d={path}
              strokeWidth="2.25"
              aria-hidden="true"
            />
            <path
              className={stateClassNames[state]}
              d={path}
              strokeWidth="0.75"
              strokeDasharray={state === "isolated" ? "7 5" : undefined}
            />
            {editing && (
              <path
                className="cursor-copy stroke-transparent"
                d={path}
                strokeWidth="12"
                pointerEvents="stroke"
                onPointerDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => addPoint(event, line.id)}
              />
            )}
            {editing &&
              line.points.map((point, pointIndex) => (
                <g
                  key={`${line.id}-${pointIndex}`}
                  className="cursor-move"
                  onPointerDown={(event) =>
                    startPointDrag(event, line.id, pointIndex)
                  }
                  onPointerMove={movePoint}
                  onPointerUp={finishPointDrag}
                  onPointerCancel={(event) => finishPointDrag(event, false)}
                  onDoubleClick={(event) =>
                    removePoint(event, line.id, pointIndex)
                  }
                  onContextMenu={(event) =>
                    toggleAccessory(event, line.id, pointIndex)
                  }
                >
                  <circle
                    className="fill-transparent stroke-transparent"
                    cx={point.x}
                    cy={point.y}
                    r="6"
                    pointerEvents="all"
                  />
                  {point.accessory ? (
                    <rect
                      className="pointer-events-none fill-sim-accent stroke-sim-surface"
                      x={point.x - 1.7}
                      y={point.y - 1.7}
                      width="3.4"
                      height="3.4"
                      strokeWidth="0.6"
                      transform={`rotate(45 ${point.x} ${point.y})`}
                    />
                  ) : (
                    <circle
                      className="pointer-events-none fill-sim-surface stroke-sim-cyan"
                      cx={point.x}
                      cy={point.y}
                      r="1.4"
                      strokeWidth="0.6"
                    />
                  )}
                </g>
              ))}
          </g>
        );
      })}
      {editing && branchPreview && (
        <path
          className="pointer-events-none stroke-sim-cyan"
          d={pointsToPath([branchPreview.start, branchPreview.end])}
          strokeWidth="0.75"
          strokeDasharray="4 3"
        />
      )}
      {editing && marquee && (
        <rect
          className="pointer-events-none fill-sim-cyan/10 stroke-sim-cyan"
          x={Math.min(marquee.start.x, marquee.end.x)}
          y={Math.min(marquee.start.y, marquee.end.y)}
          width={Math.abs(marquee.end.x - marquee.start.x)}
          height={Math.abs(marquee.end.y - marquee.start.y)}
          strokeWidth="0.75"
          strokeDasharray="4 3"
        />
      )}
      {editing && selectionBounds && (
        <g>
          <rect
            className="cursor-move fill-sim-cyan/5 stroke-sim-cyan"
            x={selectionBounds.x - 4}
            y={selectionBounds.y - 4}
            width={selectionBounds.width + 8}
            height={selectionBounds.height + 8}
            strokeWidth="0.75"
            strokeDasharray="4 3"
            pointerEvents="all"
            onPointerDown={(event) =>
              startSelectionTransform(
                event,
                "move",
                { x: selectionBounds.x, y: selectionBounds.y },
              )
            }
            onPointerMove={moveSelectionTransform}
            onPointerUp={finishSelectionTransform}
            onPointerCancel={finishSelectionTransform}
          />
          {[
            {
              point: { x: selectionBounds.x, y: selectionBounds.y },
              anchor: {
                x: selectionBounds.x + selectionBounds.width,
                y: selectionBounds.y + selectionBounds.height,
              },
            },
            {
              point: {
                x: selectionBounds.x + selectionBounds.width,
                y: selectionBounds.y,
              },
              anchor: {
                x: selectionBounds.x,
                y: selectionBounds.y + selectionBounds.height,
              },
            },
            {
              point: {
                x: selectionBounds.x + selectionBounds.width,
                y: selectionBounds.y + selectionBounds.height,
              },
              anchor: { x: selectionBounds.x, y: selectionBounds.y },
            },
            {
              point: {
                x: selectionBounds.x,
                y: selectionBounds.y + selectionBounds.height,
              },
              anchor: {
                x: selectionBounds.x + selectionBounds.width,
                y: selectionBounds.y,
              },
            },
          ].map(({ point, anchor }, index) => (
            <g
              key={index}
              className="cursor-nwse-resize"
              onPointerDown={(event) =>
                startSelectionTransform(event, "scale", point, anchor)
              }
              onPointerMove={moveSelectionTransform}
              onPointerUp={finishSelectionTransform}
              onPointerCancel={finishSelectionTransform}
            >
              <circle
                className="fill-transparent"
                cx={point.x}
                cy={point.y}
                r="6"
                pointerEvents="all"
              />
              <circle
                className="pointer-events-none fill-sim-surface stroke-sim-cyan"
                cx={point.x}
                cy={point.y}
                r="2"
                strokeWidth="0.75"
              />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}
