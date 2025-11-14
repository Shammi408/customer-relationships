import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../store/auth";
import toast from "react-hot-toast";

const TYPES = ["NOTE", "CALL", "MEETING"];
const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];

export default function LeadDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { events } = useSocket();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [note, setNote] = useState("");
  const [type, setType] = useState("NOTE");
  const [saving, setSaving] = useState(false);

  const [statusLocal, setStatusLocal] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    if (lead) setStatusLocal(lead.status || "NEW");
  }, [lead]);

  const canChangeStatus =
    user?.role === "ADMIN" ||
    user?.role === "MANAGER" ||
    (user?.role === "SALES_EXEC" && lead?.ownerId === user?.id);

  const refresh = async () => {
    try {
      setLoading(true);
      setErr("");
      const { data } = await api.get(`/api/leads/${id}`);
      setLead(data);
    } catch (e) {
      if (e.response?.status === 404) setErr("Lead not found (maybe deleted).");
      else setErr(e.response?.data?.error || "Failed to load lead");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [id]);

  // Auto refresh on socket events for this lead
  const last = useMemo(() => events[0], [events]);
  useEffect(() => {
    if (!last) return;
    const { name, data } = last;
    if (["lead:updated", "lead:statusChanged", "activity:created"].includes(name)) {
      // leadId might be in different shapes; try both
      if (data?.leadId === id || data?.id === id || data?.id === lead?.id) refresh();
    }
  }, [last?.t]);

  const saveStatus = async () => {
    if (!canChangeStatus) return alert("You don’t have permission to change status.");
    
    const previous = lead.status;     // store old status
    setLead((prev) => ({ ...prev, status: statusLocal })); // immediate UI update
    try {
      setSavingStatus(true);
      await api.put(`/api/leads/${id}`, { status: statusLocal });
      // success — socket + backend will sync automatically
    } catch (e) {
      // rollback if failed
      setLead((prev) => ({ ...prev, status: previous }));
      setStatusLocal(previous);
      // alert(e.response?.data?.error || "Failed to change status");
      toast.error("Failed to change status");
    } finally {
      setSavingStatus(false);
    }
  };


  const addActivity = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post("/api/activities", { leadId: id, type, note: note || undefined });
      setNote("");
      setType("NOTE");
      await refresh();
    } catch (e) {
      alert(e.response?.data?.error || "Failed to add activity");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (err) return <div className="p-4 text-red-700">{err}</div>;
  if (!lead) return <div className="p-4">Not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-4">
        <Link to="/" className="text-gray-600 hover:underline">← Back</Link>
        <h2 className="text-2xl font-semibold">{lead.name}</h2>
        <div className="ml-auto text-sm text-gray-600">Owner: <span className="font-medium">{lead.owner?.name || "-"}</span></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="font-medium">Status</div>
              <select
                value={statusLocal}
                onChange={(e) => setStatusLocal(e.target.value)}
                disabled={!canChangeStatus}
                className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={saveStatus}
                disabled={!canChangeStatus || savingStatus}
                className="ml-auto rounded-md px-3 py-2 text-sm bg-gray-900 text-white hover:bg-black disabled:opacity-60"
              >
                {savingStatus ? "Saving..." : "Save"}
              </button>
            </div>

            <div className="text-sm text-gray-700">
              <div className="py-1"><span className="font-medium">Email:</span> {lead.email || "-"}</div>
              <div className="py-1"><span className="font-medium">Phone:</span> {lead.phone || "-"}</div>
              <div className="py-1"><span className="font-medium">Updated:</span> {new Date(lead.updatedAt).toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <div className="font-medium mb-2">Details</div>
            <div className="text-sm text-gray-700">
              {/* Expand later with more fields */}
              <div className="py-1"><span className="font-medium">Created:</span> {new Date(lead.createdAt).toLocaleString()}</div>
              <div className="py-1"><span className="font-medium">Owner Email:</span> {lead.owner?.email || "-"}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <form onSubmit={addActivity} className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Add Activity</h3>
            <div className="grid gap-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <textarea
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />

              <div className="text-right">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md px-3 py-2 text-sm bg-gray-900 text-white hover:bg-black disabled:opacity-60"
                >
                  {saving ? "Adding..." : "Add Activity"}
                </button>
              </div>
            </div>
          </form>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Activity Timeline</h3>
            <ul className="space-y-3">
              {lead.activities.length === 0 ? (
                <div className="text-sm text-gray-600">No activities yet.</div>
              ) : (
                lead.activities.map(a => (
                  <li key={a.id} className="border rounded-md p-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{a.type}</div>
                      <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</div>
                    </div>
                    {a.note && <div className="mt-2 text-sm text-gray-700">{a.note}</div>}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
