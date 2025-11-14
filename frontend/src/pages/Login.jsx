import { useState } from "react";
import { useAuth } from "../store/auth";

export default function Login({ onLoggedIn }) {
  const { login, loading, error, register } = useAuth();
  const [email, setEmail] = useState("admin1@example.com");
  const [password, setPassword] = useState("secret123");
  const [name, setName] = useState("Admin One");
  const [mode, setMode] = useState("login"); // or 'register'

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "login") {
      const ok = await login(email, password);
      if (ok) onLoggedIn?.();
    } else {
      const created = await register({ name, email, password, role: "ADMIN" });
      if (created) alert("Registered! Now switch to login.");
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "60px auto", padding: 20, border: "1px solid #ddd", borderRadius: 8 }}>
      <h2>{mode === "login" ? "Login" : "Register"}</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        {mode === "register" && (
          <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
        )}
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button disabled={loading}>{loading ? "..." : (mode === "login" ? "Login" : "Register")}</button>
      </form>
      {error && <div style={{ color: "crimson", marginTop: 8 }}>{typeof error === "string" ? error : "Error"}</div>}
      <div style={{ marginTop: 10 }}>
        <button onClick={() => setMode(mode === "login" ? "register" : "login")}>
          Switch to {mode === "login" ? "Register" : "Login"}
        </button>
      </div>
    </div>
  );
}
