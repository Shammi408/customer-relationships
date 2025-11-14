import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../store/auth";

export function useSocket() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL); // http://localhost:3000
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      if (user?.id) {
        socket.emit("join", { userId: user.id });
      }
    });
    socket.on("disconnect", () => setConnected(false));

    const names = [
      "lead:created","lead:updated","lead:deleted","lead:statusChanged",
      "notification:leadAssigned","notification:leadUnassigned","activity:created"
    ];
    names.forEach(n =>
      socket.on(n, (data) => setEvents(prev => [{ name:n, data, t:Date.now() }, ...prev].slice(0,50)))
    );
    
    return () => socket.close();
  }, [user?.id]); // reconnect when user changes (login/logout)

  return { connected, events, socket: socketRef.current };
}
