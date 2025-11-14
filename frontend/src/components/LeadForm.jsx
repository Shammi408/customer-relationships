import { useEffect, useState } from "react";

const STATUS = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];

export default function LeadForm({ mode = "create", initial = null, onCancel, onSubmit }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("NEW");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const isEdit = mode === "edit";

  useEffect(() => {
    if (initial) {
      setName(initial.name || "");
      setEmail(initial.email || "");
      setPhone(initial.phone || "");
      setStatus(initial.status || "NEW");
    }
  }, [initial]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      await onSubmit({ name, email: email || undefined, phone: phone || undefined, status });
    } catch (e) {
      setErr(e?.response?.data?.error || (e?.message || "Failed to save"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{isEdit ? "Edit Lead" : "Create Lead"}</h3>
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {err && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded p-2">{err}</div>}

        <form onSubmit={submit} className="grid gap-3">
          <label className="block">
            <div className="text-sm text-gray-600 mb-1">Name *</div>
            <input
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <div className="text-sm text-gray-600 mb-1">Email</div>
            <input
              type="email"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="support@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm text-gray-600 mb-1">Phone</div>
            <input
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <select
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-3 py-2 text-sm bg-white border hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-md px-3 py-2 text-sm bg-gray-900 text-white hover:bg-black disabled:opacity-60 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-75"/>
                  </svg>
                  Saving...
                </>
              ) : (isEdit ? "Save" : "Create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
