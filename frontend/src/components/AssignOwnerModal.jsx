import { useEffect, useState } from "react";
import api from "../api";

export default function AssignOwnerModal({ lead, onClose, onAssigned }) {
  const [users, setUsers] = useState([]);
  const [ownerId, setOwnerId] = useState(lead?.ownerId || "");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/users", { params: { role: "SALES_EXEC" } });
        setUsers(data);
      } catch (e) {
        setErr(e.response?.data?.error || "Failed to load users");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    try {
      setSubmitting(true);
      await api.put(`/api/leads/${lead.id}`, { ownerId: ownerId || null });
      onAssigned?.();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to assign owner");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-xl bg-white rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Assign Owner</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-600">Loading users…</div>
        ) : (
          <>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Choose owner</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="">— Unassigned —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>

            {err && <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded p-2">{err}</div>}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-md px-3 py-2 bg-white border hover:bg-gray-50">Cancel</button>
              <button
                onClick={save}
                disabled={submitting}
                className="rounded-md px-3 py-2 bg-gray-900 text-white hover:bg-black disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
