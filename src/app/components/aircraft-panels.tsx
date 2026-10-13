// Cockpit instrument panels. Each panel lives in its own module under ./panels;
// this file re-exports them so existing imports keep working.
export * from "./panels/panel-parts";
export * from "./panels/digital-display";
export * from "./panels/knobs";
export * from "./panels/switches";
export * from "./panels/cabin-altitude-panel";
export * from "./panels/cabin-altitude-control-panel";
export * from "./panels/equipment-cooling-panel";
export * from "./panels/glareshield-warning-panel";
export * from "./panels/temperature-panel";
export * from "./panels/window-heat-panel";
export * from "./panels/wing-anti-ice-panel";
export * from "./panels/wiper-panels";
