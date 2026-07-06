import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import Dashboard from "./components/Dashboard";
import ApiManager from "./components/ApiManager";
import ProjectManager from "./components/ProjectManager";
import CostTracker from "./components/CostTracker";
import WebhooksManager from "./components/WebhooksManager";
import AlertsManager from "./components/AlertsManager";
import Login from "./components/Login";
import { getInitialTheme, applyTheme } from "./theme";
import {
  IconBell,
  IconCoin,
  IconDashboard,
  IconFolder,
  IconLogout,
  IconMoon,
  IconPlug,
  IconSun,
  IconWebhook,
} from "./components/Icons";
import "./App.css";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: IconDashboard },
  { key: "costs", label: "Custos", icon: IconCoin },
  { key: "projects", label: "Projetos", icon: IconFolder },
  { key: "apis", label: "APIs", icon: IconPlug },
  { key: "webhooks", label: "Webhooks", icon: IconWebhook },
  { key: "alerts", label: "Alertas", icon: IconBell },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [ws, setWs] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [theme, setTheme] = useState(getInitialTheme());

  // Setup token e usuário ao iniciar
  useEffect(() => {
    if (token) {
      validateToken();
      setupWebSocket();
    }
  }, [token]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  // Validar token
  const validateToken = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        fetchStats();
      } else {
        logout();
      }
    } catch (error) {
      console.error("Token validation error:", error);
      logout();
    }
  };

  // Setup WebSocket
  const setupWebSocket = () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    let wsUrl = window.location.origin;
    if (apiUrl) {
      wsUrl = apiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    }
    const socket = io(wsUrl, {
      auth: { token },
    });

    socket.on("connect", () => {
      console.log("WebSocket conectado");
    });

    socket.on("cost-recorded", (data) => {
      fetchStats();
      showNotification(`Custo de R$ ${data.amount?.toFixed(2)} registrado`);
    });

    socket.on("alert-triggered", (data) => {
      showNotification(`Alerta: ${data.message}`);
    });

    socket.on("disconnect", () => {
      console.log("WebSocket desconectado");
    });

    setWs(socket);
  };

  // Buscar estatísticas
  const fetchStats = async () => {
    try {
      const res = await fetch("/api/dashboard/summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  // Mostrar notificação
  const showNotification = (message) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  };

  // Login
  const handleLogin = (userData, newToken) => {
    setUser(userData);
    setToken(newToken);
    localStorage.setItem("token", newToken);
    setupWebSocket();
    fetchStats();
  };

  // Logout
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    if (ws) ws.disconnect();
    setWs(null);
  };

  // Refresh
  const handleRefresh = () => {
    fetchStats();
  };

  // Tela de login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const activeLabel = NAV_ITEMS.find((item) => item.key === activeTab)?.label;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.svg" alt="" className="brand-logo" />
          <span>MyTokenCost</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`nav-item ${activeTab === key ? "active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
          {theme === "dark" ? "Tema claro" : "Tema escuro"}
        </button>
      </aside>

      <div className="app-body">
        <header className="topbar">
          <div className="topbar-title">{activeLabel}</div>
          <div className="topbar-right">
            {stats && (
              <div className="topbar-stat">
                <span>Total gasto</span>
                <strong>R$ {stats.total?.toFixed(2)}</strong>
              </div>
            )}
            <span className="topbar-user">{user.organization || user.email}</span>
            <button className="btn-logout" onClick={logout} aria-label="Sair">
              <IconLogout />
            </button>
          </div>
        </header>

        <main className="app-main">
          {activeTab === "dashboard" && (
            <Dashboard stats={stats} onRefresh={handleRefresh} token={token} />
          )}
          {activeTab === "costs" && (
            <CostTracker token={token} onSave={handleRefresh} />
          )}
          {activeTab === "projects" && (
            <ProjectManager token={token} onSave={handleRefresh} />
          )}
          {activeTab === "apis" && <ApiManager token={token} onSave={handleRefresh} />}
          {activeTab === "webhooks" && <WebhooksManager token={token} />}
          {activeTab === "alerts" && <AlertsManager token={token} />}
        </main>

        <footer className="app-footer">
          <p>© 2026 MyTokenCost</p>
        </footer>
      </div>

      <div className="notifications">
        {notifications.map((notif) => (
          <div key={notif.id} className="notification">
            {notif.message}
          </div>
        ))}
      </div>
    </div>
  );
}
