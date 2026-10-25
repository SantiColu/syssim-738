"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { SYSTEM_ANNUNCIATORS } from "../../simulation/warning/master-caution";
import { useMasterCaution } from "../../simulation/warning/master-caution-context";

const isPushKey = (e: KeyboardEvent) => e.key === "Enter" || e.key === " ";

/**
 * Master FIRE WARN, MASTER CAUTION and system annunciator panel on one wing of
 * the glareshield (FCOM 15.10.1). The F/O side mirrors the captain's.
 */
export function GlareshieldWarningPanel({ side }: { side: "capt" | "fo" }) {
  const {
    isMasterCautionLit,
    isAnnunciatorLit,
    isFireWarnLit,
    pushFireWarn,
    pushMasterCaution,
    pressAnnunciatorPanel,
    releaseAnnunciatorPanel,
  } = useMasterCaution();

  const handleAnnunciatorPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pressAnnunciatorPanel();
  };

  return (
    <section
      className={`glareshield-warning-panel ${side}`}
      aria-label={`${side === "capt" ? "Captain" : "First officer"} master warning and caution lights`}
    >
      {/* Pushing resets the fire warning system for additional warnings */}
      <button
        type="button"
        className={`gw-light gw-fire-warn${isFireWarnLit ? " lit" : ""}`}
        aria-label="FIRE WARN, push for bell cutout"
        onClick={pushFireWarn}
      >
        <span className="gw-legend">
          FIRE
          <br />
          WARN
        </span>
        <span className="gw-sub">BELL CUTOUT</span>
      </button>

      <button
        type="button"
        className={`gw-light gw-master-caution${isMasterCautionLit ? " lit" : ""}`}
        aria-label="MASTER CAUTION, push to reset"
        onClick={pushMasterCaution}
      >
        <span className="gw-legend">
          MASTER
          <br />
          CAUTION
        </span>
        <span className="gw-sub">PUSH TO RESET</span>
      </button>

      <button
        type="button"
        className="gw-annunciators"
        aria-label="System annunciator panel, push to recall"
        onPointerDown={handleAnnunciatorPointerDown}
        onPointerUp={releaseAnnunciatorPanel}
        onPointerCancel={releaseAnnunciatorPanel}
        onKeyDown={(e) => {
          if (isPushKey(e) && !e.repeat) pressAnnunciatorPanel();
        }}
        onKeyUp={(e) => {
          if (isPushKey(e)) releaseAnnunciatorPanel();
        }}
      >
        {SYSTEM_ANNUNCIATORS[side].map((annunciator) => (
          <span
            key={annunciator}
            className={`gw-annunciator${isAnnunciatorLit(annunciator) ? " lit" : ""}`}
          >
            {annunciator}
          </span>
        ))}
      </button>
    </section>
  );
}
