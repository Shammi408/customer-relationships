import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { useAuth } from "../store/auth";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";

export default function Analytics() {
  const { user } = useAuth();
  const [mine, setMine] = useState(false); // managers/admins can toggle; sales execs are implicitly mine
  const isSales = user?.role === "SALES_EXEC";
  const scopeMine = isSales ? true : mine;

  const [overview, setOverview] = useState(null);
  const [byOwner, setByOwner] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const [ov, owners] = await Promise.all([
        api.get("/api/analytics/overview", { params: { mine: scopeMine ? "true" : undefined } }),
        user?.role !== "SALES_EXEC" ? api.get("/api/analytics/by-owner") : Promise.resolve({ data: [] }),
      ]);
      setOverview(ov.data);
      setByOwner(owners.data);
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [scopeMine]);

  const cards = useMemo(() => {
    if (!overview) return [];
    const { totals, winRate } = overview;
    return [
      { label: "Total Leads", value: totals.total },
      { label: "Won", value: totals.won },
      { label: "Lost", value: totals.lost },
      { label: "Qualified", value: totals.qualified },
      { label: "Contacted", value: totals.contacted },
      { label: "New", value: totals.new },
      { label: "Win Rate", value: `${Math.round((winRate || 0) * 100)}%` },
    ];
  }, [overview]);

  return (
    <div style={{ maxWidth: 1200, margin: "20px auto", padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Analytics</h2>
        <div className="ml-auto">
          {isSales ? (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Showing analytics for <b>your assigned leads</b> only
            </div>
          ) : (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mine}
                onChange={e => setMine(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show only my leads
            </label>
          )}
        </div>

      </div>

      {loading && <div style={{ marginTop: 10 }}>Loading…</div>}
      {err && <div style={{ color: "crimson", marginTop: 10 }}>{err}</div>}
      {!loading && overview && (
        <>
          {/* Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
            gap: 12,
            marginTop: 12
          }}>
            {cards.map((c) => (
              <div key={c.label} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Leads by Status */}
          <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Leads by Status</h3>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={overview.countsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Leads created last 30 days */}
          <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Leads Created (Last 30 Days)</h3>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={overview.leads30d}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activities last 7 days */}
          <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Activities (Last 7 Days)</h3>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={overview.activities7d}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top performers (admins/managers only) */}
          {user?.role !== "SALES_EXEC" && (
            <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>Top Performers (Sales Execs)</h3>
              <div style={{ overflowX: "auto" }}>
                <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>Owner</th><th>Total</th><th>Win Rate</th>
                      <th>New</th><th>Contacted</th><th>Qualified</th><th>Won</th><th>Lost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byOwner.map((r) => (
                      <tr key={r.ownerId}>
                        <td>{r.ownerName} ({r.ownerEmail})</td>
                        <td>{r.total}</td>
                        <td>{Math.round((r.winRate || 0) * 100)}%</td>
                        <td>{r.NEW || 0}</td>
                        <td>{r.CONTACTED || 0}</td>
                        <td>{r.QUALIFIED || 0}</td>
                        <td>{r.WON || 0}</td>
                        <td>{r.LOST || 0}</td>
                      </tr>
                    ))}
                    {byOwner.length === 0 && (
                      <tr><td colSpan={8}>No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
