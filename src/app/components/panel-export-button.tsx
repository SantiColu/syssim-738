"use client";

import { useState } from "react";
import type { RefObject } from "react";

const EXPORT_PIXEL_RATIO = 3;

// html-to-image deep-clones inline SVGs without copying the computed styles of
// their descendants. Most of our schematics are styled with Tailwind classes,
// so those styles need to become inline declarations on an isolated copy.
const SVG_STYLE_PROPERTIES = [
  "color",
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stop-color",
  "stop-opacity",
  "opacity",
  "display",
  "visibility",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
  "paint-order",
  "shape-rendering",
  "vector-effect",
  "filter",
  "marker-start",
  "marker-mid",
  "marker-end",
] as const;

type PanelExportButtonProps = {
  panelRef: RefObject<HTMLElement | null>;
  fileName: string;
  label: string;
  className?: string;
  createPng?: () => Promise<string>;
};

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

function resolveCssVariables(value: string, style: CSSStyleDeclaration) {
  let resolved = value;

  for (let pass = 0; pass < 10 && resolved.includes("var("); pass += 1) {
    const next = resolved.replace(
      /var\((--[^,\s)]+)(?:,\s*([^)]*))?\)/g,
      (_match, variable: string, fallback = "") =>
        style.getPropertyValue(variable).trim() || fallback.trim(),
    );
    if (next === resolved) break;
    resolved = next;
  }

  return resolved;
}

function createExportClone(panel: HTMLElement) {
  const rect = panel.getBoundingClientRect();
  const clone = panel.cloneNode(true) as HTMLElement;
  const sourceSvgElements = Array.from(
    panel.querySelectorAll<SVGElement>("svg, svg *"),
  );
  const clonedSvgElements = Array.from(
    clone.querySelectorAll<SVGElement>("svg, svg *"),
  );

  sourceSvgElements.forEach((element, index) => {
    const clonedElement = clonedSvgElements[index];
    if (!clonedElement) return;

    const computedStyle = window.getComputedStyle(element);
    const parentStyle = element.parentElement
      ? window.getComputedStyle(element.parentElement)
      : null;

    SVG_STYLE_PROPERTIES.forEach((property) => {
      const rawValue = computedStyle.getPropertyValue(property);
      const inheritedValue = parentStyle?.getPropertyValue(property) ?? "";
      const isExplicit =
        element.style.getPropertyValue(property) !== "" ||
        element.hasAttribute(property);

      // Do not freeze SVG defaults such as fill:black onto definitions. A
      // <use> element must be able to pass its own inherited fill/stroke into
      // the referenced shape.
      if (!isExplicit && rawValue === inheritedValue) return;

      const value = resolveCssVariables(
        rawValue,
        computedStyle,
      );
      if (value) clonedElement.style.setProperty(property, value);
    });
  });

  clone.setAttribute("aria-hidden", "true");
  clone.style.position = "fixed";
  clone.style.left = `${-(rect.width + 100)}px`;
  clone.style.top = "0";
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.pointerEvents = "none";
  document.body.appendChild(clone);

  return { clone, width: rect.width, height: rect.height };
}

type SvgViewport = { x: number; y: number; width: number; height: number };

function loadSvgImage(svg: SVGSVGElement) {
  const serialized = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(
    new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }),
  );

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo rasterizar el SVG del cockpit"));
    };
    image.src = url;
  });
}

function loadDataUrlImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("No se pudo cargar un panel del cockpit"));
    image.src = url;
  });
}

export async function renderCockpitSvgToPng(
  svg: SVGSVGElement,
  viewport: SvgViewport,
  outputSize: { width: number; height: number },
) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const sourceElements = [svg, ...Array.from(svg.querySelectorAll("*"))];
  const clonedElements = [clone, ...Array.from(clone.querySelectorAll("*"))];

  sourceElements.forEach((source, index) => {
    const target = clonedElements[index];
    if (!(target instanceof Element)) return;

    const computedStyle = window.getComputedStyle(source);

    if (source instanceof HTMLElement && target instanceof HTMLElement) {
      Array.from(computedStyle).forEach((property) => {
        const value = resolveCssVariables(
          computedStyle.getPropertyValue(property),
          computedStyle,
        );
        if (value) target.style.setProperty(property, value);
      });
      return;
    }

    if (!(target instanceof SVGElement)) return;
    const parentStyle = source.parentElement
      ? window.getComputedStyle(source.parentElement)
      : null;

    SVG_STYLE_PROPERTIES.forEach((property) => {
      const rawValue = computedStyle.getPropertyValue(property);
      const inheritedValue = parentStyle?.getPropertyValue(property) ?? "";
      const isExplicit =
        (source instanceof SVGElement &&
          source.style.getPropertyValue(property) !== "") ||
        source.hasAttribute(property);
      if (!isExplicit && rawValue === inheritedValue) return;

      const value = resolveCssVariables(rawValue, computedStyle);
      if (value) target.style.setProperty(property, value);
    });
  });

  const sourcePanels = Array.from(svg.querySelectorAll("foreignObject"));
  const clonedPanels = Array.from(clone.querySelectorAll("foreignObject"));
  const { toPng } = await import("html-to-image");

  const renderedPanels = await Promise.all(
    sourcePanels.map(async (sourcePanel, index) => {
      const clonedPanel = clonedPanels[index];
      const content = sourcePanel.firstElementChild;
      if (!(content instanceof HTMLElement) || !clonedPanel) return null;

      const panelImageUrl = await toPng(content, {
        pixelRatio: EXPORT_PIXEL_RATIO,
        cacheBust: true,
        skipFonts: true,
      });
      clonedPanel.remove();

      return {
        image: await loadDataUrlImage(panelImageUrl),
        x: Number(sourcePanel.getAttribute("x") ?? 0),
        y: Number(sourcePanel.getAttribute("y") ?? 0),
        width: Number(sourcePanel.getAttribute("width") ?? 0),
        height: Number(sourcePanel.getAttribute("height") ?? 0),
      };
    }),
  );

  const width = Math.max(1, Math.round(outputSize.width * EXPORT_PIXEL_RATIO));
  const height = Math.max(
    1,
    Math.round(outputSize.height * EXPORT_PIXEL_RATIO),
  );
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute(
    "viewBox",
    `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`,
  );
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("preserveAspectRatio", "none");

  const image = await loadSvgImage(clone);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo crear el canvas de exportación");

  const rootStyle = window.getComputedStyle(document.documentElement);
  const background = rootStyle.getPropertyValue("--color-sim-bg").trim();
  const grid = rootStyle.getPropertyValue("--color-sim-grid").trim();
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = grid;
  context.lineWidth = EXPORT_PIXEL_RATIO;
  const gridStep = 20 * EXPORT_PIXEL_RATIO;
  for (let x = 0; x <= width; x += gridStep) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += gridStep) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.drawImage(image, 0, 0, width, height);

  renderedPanels.forEach((panel) => {
    if (!panel) return;

    context.drawImage(
      panel.image,
      ((panel.x - viewport.x) / viewport.width) * width,
      ((panel.y - viewport.y) / viewport.height) * height,
      (panel.width / viewport.width) * width,
      (panel.height / viewport.height) * height,
    );
  });

  return canvas.toDataURL("image/png");
}

export function PanelExportButton({
  panelRef,
  fileName,
  label,
  className = "",
  createPng,
}: PanelExportButtonProps) {
  const [status, setStatus] = useState<"idle" | "exporting" | "error">(
    "idle",
  );

  const exportPanel = async () => {
    const panel = panelRef.current;
    if (!panel || status === "exporting") return;

    setStatus("exporting");
    let exportClone: HTMLElement | null = null;

    try {
      if (createPng) {
        downloadDataUrl(await createPng(), fileName);
        setStatus("idle");
        return;
      }

      const { toPng } = await import("html-to-image");
      const { clone, width, height } = createExportClone(panel);
      exportClone = clone;

      const dataUrl = await toPng(clone, {
        pixelRatio: EXPORT_PIXEL_RATIO,
        cacheBust: true,
        // The UI font is already resolved in the computed styles copied above.
        // Re-parsing Next's generated font rules is both unnecessary and fails
        // in Firefox when the snapshot contains nested SVG/foreignObject nodes.
        skipFonts: true,
        width,
        height,
        style: {
          position: "relative",
          left: "0",
          top: "0",
        },
        filter: (node) =>
          !(node instanceof HTMLElement) ||
          !node.hasAttribute("data-export-exclude"),
      });

      downloadDataUrl(dataUrl, fileName);
      setStatus("idle");
    } catch (error) {
      console.error(`No se pudo exportar ${label}`, error);
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2500);
    } finally {
      exportClone?.remove();
    }
  };

  const buttonLabel =
    status === "exporting"
      ? "EXPORTANDO…"
      : status === "error"
        ? "ERROR"
        : "PNG";

  return (
    <button
      type="button"
      data-export-exclude
      onClick={exportPanel}
      disabled={status === "exporting"}
      aria-label={`Exportar ${label} como PNG de alta resolución`}
      title={`Exportar ${label} como PNG de alta resolución`}
      className={`absolute z-40 flex h-7 cursor-pointer items-center gap-1.5 border border-sim-border bg-sim-surface px-2.5 text-[7px] tracking-[0.14em] text-sim-text-muted shadow-lg transition-colors hover:bg-sim-bg hover:text-sim-text-strong disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      <svg
        aria-hidden="true"
        className="size-3"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M8 2v8m0 0 3-3m-3 3L5 7M3 12.5h10"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
      {buttonLabel}
    </button>
  );
}
