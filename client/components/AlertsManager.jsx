import React, { useState, useEffect } from "react";
import "../styles/Manager.css";
import { IconBell, IconRefresh, IconTrash } from "./Icons";

export default function AlertsManager({ token }) {
  const [alerts, setAlerts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({
    projectId: "",
    type: "limit_exceeded",
    threshold: 100,
    action: "email",
  });

  useEffect(() => {
    fetchAlerts();
    fetchProjects();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(await res.json());
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(await res.json());
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          projectId: form.projectId || null,
        }),
      });

      if (res.ok) {
        setForm({
          projectId: "",
          type: "limit_exceeded",
          threshold: 100,
          action: "email",
        });
        fetchAlerts();
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Confirmar exclusão?")) return;

    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const toggleAlert = async (id) => {
    try {
      const res = await fetch(`/api/alerts/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  return (
    <div className="manager">
      <div className="manager-form">
        <h2><IconBell /> Novo alerta</h2>
        <form onSubmit={handleSubmit}>
          <select
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          >
            <option value="">Todos os projetos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="limit_exceeded">Limite Excedido</option>
            <option value="anomaly">Anomalia</option>
          </select>

          <input
            type="number"
            step="0.01"
            placeholder="Limite ($)"
            value={form.threshold}
            onChange={(e) =>
              setForm({ ...form, threshold: parseFloat(e.target.value) })
            }
            required
          />

          <select
            value={form.action}
            onChange={(e) => setForm({ ...form, action: e.target.value })}
          >
            <option value="email">Email</option>
            <option value="slack">Slack</option>
            <option value="webhook">Webhook</option>
          </select>

          <button type="submit" className="btn-primary">
            Criar Alerta
          </button>
        </form>
      </div>

      <div className="manager-list">
        <h2><IconBell /> Alertas</h2>
        {alerts.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Limite</th>
                <th>Ação</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.type}</td>
                  <td>$ {alert.threshold?.toFixed(2)}</td>
                  <td>{alert.action}</td>
                  <td>
                    <span className={`status-badge ${alert.active ? "status-on" : "status-off"}`}>
                      {alert.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => toggleAlert(alert.id)}
                      aria-label="Alternar status"
                    >
                      <IconRefresh />
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(alert.id)}
                      aria-label="Excluir"
                    >
                      <IconTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">Nenhum alerta configurado</p>
        )}
      </div>
    </div>
  );
}
