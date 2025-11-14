import { useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useAuth } from "./store/auth";
import Login from "./pages/Login";
import Leads from "./pages/Leads";
import Analytics from "./pages/Analytics";
import Logs from "./pages/Logs";
import LeadDetail from "./pages/LeadDetail";
import NotificationsBridge from "./components/NotificationsBridge";
import "./index.css";

function Protected({ children, roles }) {
  const { token, user, hydrated } = useAuth();
  if (!hydrated) return <div className="p-4">Loading…</div>;
  if (!token) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { token, logout, user, hydrate, hydrated } = useAuth();

  useEffect(() => { hydrate(); }, [hydrate]);
  if (!hydrated) return <div className="p-4">Loading…</div>;

  return (
    <BrowserRouter>
      {token ? (
        <div className="min-h-screen bg-gray-50 text-gray-900">
          <div className="flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r">
              <div className="px-4 py-4 text-xl font-bold">Mini CRM</div>
              <nav className="px-2 space-y-1">
                <NavItem to="/" label="Leads" />
                <NavItem to="/analytics/overview" label="Analytics" />
                <NavItem to="/logs" label="Activity Logs" />
              </nav>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col">
              {/* Topbar */}
              <header className="sticky top-0 z-10 bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
                  <button
                    className="md:hidden inline-flex items-center rounded-lg border px-2 py-1 text-sm"
                    onClick={() => alert("Mobile menu: TODO")}
                  >
                    ☰
                  </button>
                  <div className="font-semibold">Dashboard</div>
                  <div className="ml-auto flex items-center gap-3">
                    <span className="text-sm text-gray-500">{user?.email}</span>
                    <span className="text-xs rounded-full bg-gray-100 px-2 py-1">{user?.role}</span>
                    <button
                      onClick={logout}
                      className="rounded-md bg-gray-900 text-white px-3 py-1.5 text-sm hover:bg-black"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </header>

              {/* Routes */}
              <main className="max-w-7xl mx-auto w-full p-4">
                <Routes>
                  <Route path="/" element={<Protected><Leads /></Protected>} />
                  <Route path="/lead/:id" element={<Protected><LeadDetail /></Protected>} />
                  {/* Your request: make analytics be /analytics/overview */}
                  <Route
                    path="/analytics/overview"
                    element={<Protected><Analytics /></Protected>}
                  />
                  {/* Redirect /analytics -> /analytics/overview */}
                  <Route path="/analytics" element={<Navigate to="/analytics/overview" replace />} />
                  <Route path="/logs" element={<Protected ><Logs /></Protected>} />
                  {/* Auth routes */}
                  <Route path="/login" element={<Navigate to="/" replace />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </div>

          {/* Global socket → toasts & deep links */}
          <NotificationsBridge />
        </div>
      ) : (
        // Public layout (login screen centered)
        <div className="min-h-screen grid place-items-center bg-gray-50">
          <div className="w-full max-w-md">
            <Login />
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          "block rounded-md px-3 py-2 text-sm",
          isActive ? "bg-gray-900 text-white" : "hover:bg-gray-100"
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}
