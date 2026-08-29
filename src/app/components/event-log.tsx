const rows = [
  [
    "00:14:27.6",
    "STATE",
    "PRSOV 1",
    "Valve position stabilized",
    "OPEN · 100%",
  ],
  [
    "00:14:25.1",
    "FLOW",
    "PACK R",
    "Mass flow calculation updated",
    "0.52 kg/s",
  ],
  [
    "00:14:22.8",
    "STATE",
    "ISOLATION",
    "Valve commanded by AUTO logic",
    "CLOSED",
  ],
  [
    "00:14:18.8",
    "INFO",
    "MODEL",
    "Normal cruise condition loaded",
    "FL350 / M.78",
  ],
];
export function EventLog() {
  return (
    <section className="event-log">
      <div className="event-title">
        <span>EVENT LOG</span>
        <span>4 ENTRIES · AUTO SCROLL</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>SIM TIME</th>
            <th>CLASS</th>
            <th>SOURCE</th>
            <th>MESSAGE</th>
            <th>VALUE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={j === 1 ? c.toLowerCase() : ""}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
