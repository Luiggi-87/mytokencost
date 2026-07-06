import React, { useState, useEffect } from 'react';
import '../styles/Manager.css';
import { IconCoin, IconDashboard, IconTrash } from './Icons';

export default function CostTracker({ token, onSave }) {
  const [costs, setCosts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [apis, setApis] = useState([]);
  const [form, setForm] = useState({
    project_id: '',
    api_id: '',
    amount: 0,
    units: null,
    unit_type: 'tokens',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [costsRes, projectsRes, apisRes] = await Promise.all([
        fetch('/api/costs', { headers }),
        fetch('/api/projects', { headers }),
        fetch('/api/apis', { headers })
      ]);

      setCosts(await costsRes.json());
      setProjects(await projectsRes.json());
      setApis(await apisRes.json());
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/costs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setForm({
          project_id: '',
          api_id: '',
          amount: 0,
          units: null,
          unit_type: 'tokens',
          description: ''
        });
        fetchData();
        onSave();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Confirmar exclusão?')) return;

    try {
      const res = await fetch(`/api/costs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
        onSave();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  return (
    <div className="manager">
      <div className="manager-form">
        <h2><IconCoin /> Registrar custo</h2>
        <form onSubmit={handleSubmit}>
          <select
            value={form.project_id}
            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            required
          >
            <option value="">Selecionar Projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={form.api_id}
            onChange={(e) => setForm({ ...form, api_id: e.target.value })}
            required
          >
            <option value="">Selecionar API</option>
            {apis.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <input
            type="number"
            step="0.01"
            placeholder="Valor ($)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) })}
            required
          />

          <input
            type="number"
            placeholder="Quantidade (opcional)"
            value={form.units || ''}
            onChange={(e) => setForm({ ...form, units: e.target.value ? parseInt(e.target.value) : null })}
          />

          <select
            value={form.unit_type}
            onChange={(e) => setForm({ ...form, unit_type: e.target.value })}
          >
            <option value="tokens">Tokens</option>
            <option value="requisicoes">Requisições</option>
            <option value="minutos">Minutos</option>
            <option value="gb">GB</option>
            <option value="horas">Horas</option>
          </select>

          <textarea
            placeholder="Descrição (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows="2"
          />

          <button type="submit" className="btn-primary">
            Registrar Custo
          </button>
        </form>
      </div>

      <div className="manager-list">
        <h2><IconDashboard /> Histórico de custos</h2>
        {costs.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Projeto</th>
                <th>API</th>
                <th>Quantidade</th>
                <th>Valor</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((cost) => (
                <tr key={cost.id}>
                  <td>{new Date(cost.date).toLocaleDateString('pt-BR')}</td>
                  <td>{cost.project_name}</td>
                  <td>{cost.api_name}</td>
                  <td>{cost.units} {cost.unit_type}</td>
                  <td><strong>$ {cost.amount?.toFixed(2)}</strong></td>
                  <td>
                    <button className="btn-delete" onClick={() => handleDelete(cost.id)} aria-label="Excluir"><IconTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">Nenhum custo registrado</p>
        )}
      </div>
    </div>
  );
}
