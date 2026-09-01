const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="control-icon">{children}</span>
);
export function SimulatorHeader() {
  return (
    <header className="sim-header">
      <div className="topbar">
        <div className="brand">
          {/* <span className="brand-number">36</span> */}
          <span>
            <strong>AIRPLANE SYSTEM SIMULATOR</strong>
            <small>B737-800 NG · CFM56-7B26</small>
          </span>
        </div>
        <nav className="tabs" aria-label="Secciones">
          <button className="active">PNEUMATIC</button>
          <button>FUEL</button>
          <button>NAVCOM</button>
        </nav>
      </div>
      <div className="toolbar">
        {/* <button className="pause">
          <Icon>Ⅱ</Icon> PAUSE
        </button>
        <button>
          <Icon>↻</Icon> RESET
        </button> */}
        {/* <label>
          <span>CONDITION</span>
          <select defaultValue="cruise">
            <option value="cruise">CRUISE · FL350</option>
          </select>
        </label>
        <label>
          <span>CONFIG</span>
          <select defaultValue="yc">
            <option value="yc">YC496–YW164</option>
          </select>
        </label> */}
        <button className="failure">
          <Icon>△</Icon> INSERT FAILURE
        </button>
        {/* <button className="layers">
          <Icon>▣</Icon> LAYERS
        </button> */}
        {/* <div className="clock">
          <span>SIM TIME</span>
          <strong>00:14:27.6</strong>
          <small>×1.0</small>
        </div> */}
      </div>
    </header>
  );
}
