import React, { useState, useEffect } from "react";
import "../styles/Manager.css";
import { IconTrash, IconWebhook } from "./Icons";

export default function WebhooksManager({ token }) {
  const [webhooks, setWebhooks] = useState([]);
  const [form, setForm] = useState({
    url: "",
    event: "cost.recorded",
  });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const res = await fetch("/api/webhooks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWebhooks(await res.json());
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setForm({ url: "", event: "cost.recorded" });
        fetchWebhooks();
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Confirmar exclusão?")) return;

    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchWebhooks();
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  return (
    <div className="manager">
      <div className="manager-form">
        <h2><IconWebhook /> Novo webhook</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="url"
            placeholder="URL do webhook"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
          />

          <select
            value={form.event}
            onChange={(e) => setForm({ ...form, event: e.target.value })}
          >
            <option value="cost.recorded">Custo Registrado</option>
            <option value="alert.triggered">Alerta Disparado</option>
            <option value="project.created">Projeto Criado</option>
          </select>

          <button type="submit" className="btn-primary">
            Adicionar
          </button>
        </form>
      </div>

      <div className="manager-list">
        <h2><IconWebhook /> Webhooks configurados</h2>
        {webhooks.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Evento</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <tr key={webhook.id}>
                  <td>{webhook.url}</td>
                  <td>{webhook.event}</td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(webhook.id)}
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
          <p className="empty">Nenhum webhook configurado</p>
        )}
      </div>
    </div>
  );
}
