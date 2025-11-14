import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../store/auth";

export default function Logs() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [logs, setLogs] = useState({ items: [], page:1, limit:20, total:0 });
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [resource, setResource] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const url = isAdmin ? "/api/logs" : "/api/logs/mine";
      const { data } = await api.get(url, { params: { page, limit: logs.limit, action: action || undefined, resource: resource || undefined, userId: userIdFilter || undefined } });
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">Activity Logs</h2>
        {isAdmin && <div className="ml-auto flex gap-2">
          <input className="border rounded px-2 py-1 text-sm" placeholder="userId" value={userIdFilter} onChange={e=>setUserIdFilter(e.target.value)} />
          <input className="border rounded px-2 py-1 text-sm" placeholder="action" value={action} onChange={e=>setAction(e.target.value)} />
          <input className="border rounded px-2 py-1 text-sm" placeholder="resource" value={resource} onChange={e=>setResource(e.target.value)} />
          <button className="px-3 py-1 bg-gray-900 text-white rounded text-sm" onClick={()=>{ setPage(1); load(); }}>Filter</button>
        </div>}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="table-auto w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Resource</th>
              <th className="px-3 py-2 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.items.map(l => (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-2">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{l.userId || "-"}</td>
                <td className="px-3 py-2">{l.action}</td>
                <td className="px-3 py-2">{l.resource} {l.resourceId ? `(${l.resourceId})` : ""}</td>
                <td className="px-3 py-2"><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(l.meta || {}, null, 2)}</pre></td>
              </tr>
            ))}
            {logs.items.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-600">No logs</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
        <div className="text-sm text-gray-600">Page {logs.page} / {Math.ceil(logs.total / logs.limit || 1)}</div>
        <button className="px-3 py-1 border rounded disabled:opacity-50" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(logs.total / logs.limit || 1)}>Next</button>
      </div>
    </div>
  );
}
