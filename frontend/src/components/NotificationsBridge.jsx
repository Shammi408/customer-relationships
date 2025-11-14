import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSocket } from "../hooks/useSocket";

export default function NotificationsBridge() {
  const { events } = useSocket();
  const navigate = useNavigate();
  const lastHandled = useRef(0);

  useEffect(() => {
    if (!events.length) return;
    const e = events[0];
    if (e.t === lastHandled.current) return; // avoid duplicate handling on re-render
    lastHandled.current = e.t;

    const goLead = (leadId) => navigate(`/lead/${leadId}`);

    switch (e.name) {
      case "notification:leadAssigned":
        toast.custom((t) => (
          <div onClick={() => { toast.dismiss(t.id); goLead(e.data.leadId);} }
               style={{ background:"#333", color:"#fff", padding:"10px 12px", borderRadius:8, cursor:"pointer" }}>
            📋 Lead assigned: <b>{e.data.leadName}</b><br/><small>Click to open</small>
          </div>
        ));
        break;

      case "notification:leadUnassigned":
        toast(`🚫 Lead unassigned: ${e.data.leadName}`);
        break;

      case "lead:statusChanged":
        toast.custom((t) => (
          <div onClick={() => { toast.dismiss(t.id); goLead(e.data.leadId);} }
               style={{ background:"#333", color:"#fff", padding:"10px 12px", borderRadius:8, cursor:"pointer" }}>
            🔄 Status changed: {e.data.from} → <b>{e.data.to}</b><br/><small>Click to open</small>
          </div>
        ));
        break;

      case "activity:created":
        // e.data.lead may be included from server include; if missing, just show generic
        toast(`🗒️ New activity${e.data.lead?.name ? ` on ${e.data.lead.name}` : ""}`);
        break;

      case "lead:created":
        toast(`🆕 New lead: ${e.data.name}`);
        break;

      case "lead:updated":
        toast(`✏️ Lead updated: ${e.data.name}`);
        break;

      case "lead:deleted":
        toast(`🗑️ Lead deleted: ${e.data.name}`);
        break;

      default:
        break;
    }
  }, [events, navigate]);

  return null; // no UI, just side-effects
}
