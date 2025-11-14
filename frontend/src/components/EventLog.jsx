export default function EventLog({ connected, events }) {
  return (
    <div style={{ fontFamily: "monospace", fontSize: 12, background: "#111", color: "#0f0", padding: 10, borderRadius: 8 }}>
      <div>socket: {connected ? "connected" : "disconnected"}</div>
      <div style={{ maxHeight: 180, overflow: "auto", marginTop: 8 }}>
        {events.map((e, i) => (
          <div key={i}>
            [{new Date(e.t).toLocaleTimeString()}] {e.name} {JSON.stringify(e.data)}
          </div>
        ))}
      </div>
    </div>
  );
}
