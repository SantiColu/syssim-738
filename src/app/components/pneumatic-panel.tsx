function Knob({
  label,
  sub = "AUTO",
  angle = 0,
}: {
  label: string;
  sub?: string;
  angle?: number;
}) {
  return (
    <div className="knob-unit">
      <b>{label}</b>
      <span className="knob-sub">{sub}</span>
      <div
        className="knob"
        style={{ "--angle": `${angle}deg` } as React.CSSProperties}
      >
        <i />
      </div>
    </div>
  );
}
function Annunciator({ children }: { children: React.ReactNode }) {
  return <div className="annunciator">{children}</div>;
}

export function PneumaticPanel() {
  return (
    <section className="cockpit-area" aria-label="Panel neumático P5">
      <div className="panel-caption">P5 / FORWARD OVERHEAD</div>
      <div className="overhead-panel">
        <span className="screw tl" />
        <span className="screw tr" />
        <span className="screw bl" />
        <span className="screw br" />
        <div className="panel-top">
          <Knob label="L RECIRC FAN" />
          <div className="bleed-group">
            <small>DUAL BLEED</small>
            <div>
              <Annunciator>
                RAM DOOR
                <br />
                FULL OPEN
              </Annunciator>
              <Annunciator>
                RAM DOOR
                <br />
                FULL OPEN
              </Annunciator>
            </div>
          </div>
          <Knob label="R RECIRC FAN" />
        </div>
        <div className="panel-rule" />
        <div className="panel-mid">
          <div className="gauge-wrap">
            <b>DUCT PRESS</b>
            <div className="gauge">
              <span className="tick t0">0</span>
              <span className="tick t20">20</span>
              <span className="tick t40">40</span>
              <span className="tick t60">60</span>
              <span className="tick t80">80</span>
              <i className="needle" />
              <em>PSI</em>
            </div>
          </div>
          <Knob label="OVHT TEST" sub="TEST" angle={25} />
        </div>
        <div className="panel-controls">
          <Knob label="L PACK" />
          <Knob label="ISOLATION VALVE" angle={0} />
          <Knob label="R PACK" />
        </div>
        <div className="panel-lower">
          <div>
            <Annunciator>
              PACK
              <br />
              TRIP OFF
            </Annunciator>
            <Annunciator>
              WING-BODY
              <br />
              OVERHEAT
            </Annunciator>
            <Annunciator>
              BLEED
              <br />
              TRIP OFF
            </Annunciator>
            <Knob label="" sub="ON       OFF" angle={-5} />
          </div>
          <div className="anti-ice">
            <b>WING ANTI ICE</b>
            <div className="anti-row">
              <span>ON</span>
              <Knob label="" sub="PRESS" angle={45} />
              <span>OFF</span>
            </div>
            <div className="anti-row">
              <span>ON</span>
              <Knob label="" sub="TRIP OFF" angle={-45} />
              <span>OFF</span>
            </div>
          </div>
          <div>
            <Annunciator>
              PACK
              <br />
              TRIP OFF
            </Annunciator>
            <Annunciator>
              WING-BODY
              <br />
              OVERHEAT
            </Annunciator>
            <Annunciator>
              BLEED
              <br />
              TRIP OFF
            </Annunciator>
            <Knob label="" sub="ON       OFF" angle={5} />
          </div>
        </div>
        <div className="panel-footer">AIR COND / PNEUMATIC</div>
      </div>
    </section>
  );
}
