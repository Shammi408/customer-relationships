import { create } from "zustand";
import api from "../api";

export const useAuth = create((set,get) => ({
  user: null,
  token: localStorage.getItem("token") || null,
  loading: false,
  error: null,
  hydrated: false,

  hydrate: async () => {
    const { token, hydrated } = get();
    if (hydrated) return; // avoid duplicate calls
    if (!token) { set({ hydrated: true }); return; }

    try {
      const { data } = await api.get("/api/auth/me");
      set({ user: data, hydrated: true });
    } catch {
      // token might be invalid/expired
      localStorage.removeItem("token");
      set({ user: null, token: null, hydrated: true });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch (e) {
      set({ error: e.response?.data?.error || "Login failed", loading: false });
      return false;
    }
  },

  register: async (payload) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post("/api/auth/register", payload);
      set({ loading: false });
      return data;
    } catch (e) {
      set({ error: e.response?.data?.error || "Registration failed", loading: false });
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },
}));
