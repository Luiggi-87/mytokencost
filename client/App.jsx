import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import Dashboard from "./components/Dashboard";
import ApiManager from "./components/ApiManager";
import ProjectManager from "./components/ProjectManager";
import CostTracker from "./components/CostTracker";
import WebhooksManager from "./components/WebhooksManager";
import AlertsManager from "./components/AlertsManager";
import Login from "./components/Login";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [ws, setWs] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Setup token e usuário ao iniciar
  useEffect(() => {
    if (token) {
      validateToken();
      setupWebSocket();
    }
  }, [token]);

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
    const socket = io(window.location.origin, {
      auth: { token },
    });

    socket.on("connect", () => {
      console.log("✅ WebSocket conectado");
    });

    socket.on("cost-recorded", (data) => {
      console.log("💰 Custo registrado:", data);
      fetchStats();
      showNotification(`✅ Custo de R$ ${data.amount?.toFixed(2)} registrado!`);
    });

    socket.on("alert-triggered", (data) => {
      console.log("⚠️ Alerta disparado:", data);
      showNotification(`⚠️ Alerta: ${data.message}`);
    });

    socket.on("disconnect", () => {
      console.log("❌ WebSocket desconectado");
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>💰 MyTokenCost</h1>
          <p>Real-time API Cost Management - {user.organization}</p>
        </div>
        {stats && (
          <div className="header-stats">
            <div className="stat">
              <span>Total Gasto</span>
              <strong>R$ {stats.total?.toFixed(2)}</strong>
            </div>
            <div className="stat">
              <span>Usuário</span>
              <strong>{user.email}</strong>
            </div>
          </div>
        )}
        <button className="btn-logout" onClick={logout}>
          Logout
        </button>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-btn ${activeTab === "costs" ? "active" : ""}`}
          onClick={() => setActiveTab("costs")}
        >
          💸 Custos
        </button>
        <button
          className={`nav-btn ${activeTab === "projects" ? "active" : ""}`}
          onClick={() => setActiveTab("projects")}
        >
          📁 Projetos
        </button>
        <button
          className={`nav-btn ${activeTab === "apis" ? "active" : ""}`}
          onClick={() => setActiveTab("apis")}
        >
          🔌 APIs
        </button>
        <button
          className={`nav-btn ${activeTab === "webhooks" ? "active" : ""}`}
          onClick={() => setActiveTab("webhooks")}
        >
          🔗 Webhooks
        </button>
        <button
          className={`nav-btn ${activeTab === "alerts" ? "active" : ""}`}
          onClick={() => setActiveTab("alerts")}
        >
          🚨 Alertas
        </button>
      </nav>

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

      {/* Notificações */}
      <div className="notifications">
        {notifications.map((notif) => (
          <div key={notif.id} className="notification">
            {notif.message}
          </div>
        ))}
      </div>

      <footer className="app-footer">
        <p>© 2024 MyTokenCost - Real-time API Cost Management Dashboard</p>
      </footer>
    </div>
  );
}
