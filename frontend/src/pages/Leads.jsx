import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { useSocket } from "../hooks/useSocket";
import EventLog from "../components/EventLog";
import LeadForm from "../components/LeadForm";
import AssignOwnerModal from "../components/AssignOwnerModal";
import { useAuth } from "../store/auth";
import { Link } from "react-router-dom";

export default function Leads() {
  const { connected, events } = useSocket();
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0, limit: 10 });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const { user } = useAuth();
  const [assignLead, setAssignLead] = useState(null);
  const enableDebug = (import.meta.env.MODE !== "production" && import.meta.env.VITE_ENABLE_DEBUG === "true")   || (user && (user.role === "ADMIN" || user.role === "MANAGER"));

  const params = useMemo(() => ({
    page, limit: 10, q: q || undefined, status: status || undefined, mine: mine ? "true" : undefined,
    sort: "updatedAt", order: "desc"
  }), [page, q, status, mine]);

  const createLead = async (payload) => {
    // owner will default to the logged-in user on the backend (we set that logic)
    await api.post("/api/leads", payload);
    setShowCreate(false);
    await fetchLeads();
  };

  const fetchLeads = async () => {
    const { data } = await api.get("/api/leads", { params });
    setData(data);
    setPage(data.page || 1);
  };
 
  const saveLead = async (id, payload) => {
    await api.put(`/api/leads/${id}`, payload);
    setEditLead(null);
    await fetchLeads();
 };

  const deleteLead = async (id) => {
    if (!confirm("Delete this lead?")) return;
    await api.delete(`/api/leads/${id}`);
    await fetchLeads();
  };

  // useEffect(() => { fetchLeads(); }, [JSON.stringify(params)]);
  useEffect(() => { fetchLeads(); }, [page, q, status, mine]);
  useEffect(() => {
    if (!events.length) return;
    const recent = events[0].name;
    if (["lead:created","lead:updated","lead:deleted","lead:statusChanged"].includes(recent)) {
        fetchLeads();
    }
  }, [events]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-xl font-semibold mb-3">Leads</h2>

      {/* Filters row */}
      <div className="bg-white border rounded-lg p-3 mb-3 flex flex-wrap items-center gap-2">
        <input
          className="border rounded-md px-3 py-2 w-48"
          placeholder="Search..."
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1); }}
        />
        <select
          className="border rounded-md px-3 py-2"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All</option>
          <option>NEW</option><option>CONTACTED</option>
          <option>QUALIFIED</option><option>WON</option><option>LOST</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mine}
            onChange={e => { setMine(e.target.checked); setPage(1); }}
          />
          Mine
        </label>
        <button
          className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          onClick={fetchLeads}
        >
          Refresh
        </button>
        <div className="ml-auto" />
        <button
          className="inline-flex items-center rounded-md bg-gray-900 text-white px-3 py-2 text-sm hover:bg-black"
          onClick={() => setShowCreate(true)}
        >
          + New Lead
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="table-auto w-full">
          <thead className="bg-gray-50 text-left">
            <tr className="text-sm text-gray-600">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2">Details</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.items.map((l, i) => (
              <tr
                key={l.id}
                className={`border-t ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition`}
              >
                <td className="px-3 py-2">{l.name}</td>
                <td className="px-3 py-2">{l.status}</td>
                <td className="px-3 py-2">{l.owner ? l.owner.name : "-"}</td>
                <td className="px-3 py-2">{l.email || "-"}</td>
                <td className="px-3 py-2">{new Date(l.updatedAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <Link className="text-blue-600 hover:underline" to={`/lead/${l.id}`}>Open</Link>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button
                    className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs md:text-sm hover:bg-gray-50"
                    onClick={() => setEditLead(l)}
                  >
                    Edit
                  </button>{" "}
                  <button
                    className="inline-flex items-center rounded-md bg-red-600 text-white px-3 py-1.5 text-xs md:text-sm hover:bg-red-700"
                    onClick={() => deleteLead(l.id)}
                  >
                    Delete
                  </button>{" "}
                  {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
                    <button
                      className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs md:text-sm hover:bg-gray-50"
                      onClick={() => setAssignLead(l)}
                    >
                      Assign
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* Pagination */}
      <div className="mt-3 flex items-center gap-2">
        <button
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage(p => p - 1)}
        >
          Prev
        </button>
        <div className="text-sm text-gray-600">Page {data.page} / {data.pages} (total {data.total})</div>
        <button
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={page >= data.pages}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>

      {/* Modals */}
      {showCreate && (
        <LeadForm
          mode="create"
          onCancel={() => setShowCreate(false)}
          onSubmit={createLead}
        />
      )}

      {editLead && (
        <LeadForm
          mode="edit"
          initial={editLead}
          onCancel={() => setEditLead(null)}
          onSubmit={(payload) => saveLead(editLead.id, payload)}
        />
      )}

      {assignLead && (
        <AssignOwnerModal
          lead={assignLead}
          onClose={() => setAssignLead(null)}
          onAssigned={fetchLeads}
        />
      )}

      {/*  Event log
      <div className="mt-4">
        <EventLog connected={connected} events={events} />
      </div> */ }
      {enableDebug && (
      <div className="mt-4">
          {/* limit events forwarded to the UI to last 100 entries to avoid bloat */}
          <EventLog connected={connected} events={(events || []).slice(-100)} />
        </div>
      )}
    </div>
  );

}
