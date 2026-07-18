import React, { useState, useEffect } from 'react';
import '../styles/Manager.css';
import { IconEdit, IconFolder, IconPlus, IconTrash } from './Icons';

export default function ProjectManager({ token, onSave }) {
  const [projects, setProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    monthly_rate: 0,
    company_id: '',
    client_id: ''
  });
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchProjects();
    fetchCompanies();
    fetchClients();
  }, []);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } });
      setProjects(await res.json());
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies', { headers: { Authorization: `Bearer ${token}` } });
      setCompanies(await res.json());
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients', { headers: { Authorization: `Bearer ${token}` } });
      setClients(await res.json());
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    const res = await fetch('/api/companies', { method: 'POST', headers, body: JSON.stringify({ name: newCompanyName.trim() }) });
    if (res.ok) {
      const company = await res.json();
      setCompanies((prev) => [company, ...prev]);
      setForm((f) => ({ ...f, company_id: company.id, client_id: '' }));
      setNewCompanyName('');
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim() || !form.company_id) return;
    const res = await fetch('/api/clients', { method: 'POST', headers, body: JSON.stringify({ name: newClientName.trim(), company_id: form.company_id }) });
    if (res.ok) {
      const client = await res.json();
      setClients((prev) => [client, ...prev]);
      setForm((f) => ({ ...f, client_id: client.id }));
      setNewClientName('');
    }
  };

  const handleRenameCompany = async (company) => {
    const name = prompt('Novo nome da empresa', company.name);
    if (!name || !name.trim() || name.trim() === company.name) return;
    const res = await fetch(`/api/companies/${company.id}`, { method: 'PUT', headers, body: JSON.stringify({ name: name.trim() }) });
    if (res.ok) fetchCompanies();
  };

  const handleDeleteCompany = async (company) => {
    if (!confirm(`Excluir empresa "${company.name}"? Clientes e projetos vinculados ficam sem empresa.`)) return;
    const res = await fetch(`/api/companies/${company.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      if (form.company_id === company.id) setForm((f) => ({ ...f, company_id: '', client_id: '' }));
      fetchCompanies();
      fetchClients();
      fetchProjects();
      onSave();
    }
  };

  const handleRenameClient = async (client) => {
    const name = prompt('Novo nome do cliente', client.name);
    if (!name || !name.trim() || name.trim() === client.name) return;
    const res = await fetch(`/api/clients/${client.id}`, { method: 'PUT', headers, body: JSON.stringify({ name: name.trim(), company_id: client.company_id }) });
    if (res.ok) fetchClients();
  };

  const handleDeleteClient = async (client) => {
    if (!confirm(`Excluir cliente "${client.name}"? Projetos vinculados ficam direto na empresa.`)) return;
    const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      if (form.client_id === client.id) setForm((f) => ({ ...f, client_id: '' }));
      fetchClients();
      fetchProjects();
      onSave();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_id) {
      alert('Selecione ou crie uma empresa para o projeto');
      return;
    }

    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/projects/${editing}` : '/api/projects';

    try {
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });

      if (res.ok) {
        resetForm();
        fetchProjects();
        onSave();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Confirmar exclusão? Todos os custos associados serão removidos.')) return;

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchProjects();
        onSave();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleEdit = (project) => {
    setForm({
      name: project.name,
      description: project.description || '',
      monthly_rate: project.monthly_rate || 0,
      company_id: project.company_id || '',
      client_id: project.client_id || ''
    });
    setEditing(project.id);
  };

  const resetForm = () => {
    setForm({ name: '', description: '', monthly_rate: 0, company_id: '', client_id: '' });
    setEditing(null);
  };

  const companiesById = new Map(companies.map((c) => [c.id, c]));
  const clientsById = new Map(clients.map((c) => [c.id, c]));
  const clientsForSelectedCompany = clients.filter((c) => c.company_id === form.company_id);

  const projectPath = (project) => {
    const company = companiesById.get(project.company_id);
    if (!company) return project.client_name || '-';
    const client = clientsById.get(project.client_id);
    return client ? `${company.name} / ${client.name}` : company.name;
  };

  return (
    <div className="manager">
      <div className="manager-form">
        <h2>{editing ? <><IconEdit /> Editar projeto</> : <><IconPlus /> Novo projeto</>}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nome do Projeto"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="inline-field">
            <select
              value={form.company_id}
              onChange={(e) => setForm({ ...form, company_id: e.target.value, client_id: '' })}
            >
              <option value="">Selecionar Empresa...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="ou nova empresa..."
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
            />
            <button type="button" className="btn-secondary" onClick={handleCreateCompany}>+</button>
          </div>

          {companies.length > 0 && (
            <div className="mini-list">
              {companies.map((c) => (
                <div key={c.id} className="mini-list-row">
                  <span>{c.name}</span>
                  <span className="actions">
                    <button type="button" className="btn-edit" onClick={() => handleRenameCompany(c)} aria-label="Renomear empresa"><IconEdit /></button>
                    <button type="button" className="btn-delete" onClick={() => handleDeleteCompany(c)} aria-label="Excluir empresa"><IconTrash /></button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {form.company_id && (
            <div className="inline-field">
              <select
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              >
                <option value="">Sem cliente (direto na empresa)</option>
                {clientsForSelectedCompany.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="ou novo cliente..."
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
              <button type="button" className="btn-secondary" onClick={handleCreateClient}>+</button>
            </div>
          )}

          {form.company_id && clientsForSelectedCompany.length > 0 && (
            <div className="mini-list">
              {clientsForSelectedCompany.map((c) => (
                <div key={c.id} className="mini-list-row">
                  <span>{c.name}</span>
                  <span className="actions">
                    <button type="button" className="btn-edit" onClick={() => handleRenameClient(c)} aria-label="Renomear cliente"><IconEdit /></button>
                    <button type="button" className="btn-delete" onClick={() => handleDeleteClient(c)} aria-label="Excluir cliente"><IconTrash /></button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <textarea
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows="3"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Taxa Mensal ($)"
            value={form.monthly_rate}
            onChange={(e) => setForm({ ...form, monthly_rate: parseFloat(e.target.value) })}
          />

          <div className="form-buttons">
            <button type="submit" className="btn-primary">
              {editing ? 'Atualizar' : 'Criar'}
            </button>
            {editing && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="manager-list">
        <h2><IconFolder /> Projetos</h2>
        {projects.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Projeto</th>
                <th>ID (copiar para código)</th>
                <th>Empresa / Cliente</th>
                <th>Taxa Mensal</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td><strong>{project.name}</strong></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85em', cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(project.id); alert('ID copiado!'); }} title="Clique para copiar">
                    {project.id.substring(0, 8)}...
                  </td>
                  <td>{projectPath(project)}</td>
                  <td>$ {project.monthly_rate?.toFixed(2)}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(project)} aria-label="Editar"><IconEdit /></button>
                    <button className="btn-delete" onClick={() => handleDelete(project.id)} aria-label="Excluir"><IconTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">Nenhum projeto criado</p>
        )}
      </div>
    </div>
  );
}
