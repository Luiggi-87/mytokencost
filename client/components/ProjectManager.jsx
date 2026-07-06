import React, { useState, useEffect } from 'react';
import '../styles/Manager.css';
import { IconEdit, IconFolder, IconPlus, IconTrash } from './Icons';

export default function ProjectManager({ token, onSave }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({
    name: '',
    client_name: '',
    description: '',
    monthly_rate: 0
  });
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(await res.json());
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/projects/${editing}` : '/api/projects';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

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
    setForm(project);
    setEditing(project.id);
  };

  const resetForm = () => {
    setForm({
      name: '',
      client_name: '',
      description: '',
      monthly_rate: 0
    });
    setEditing(null);
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

          <input
            type="text"
            placeholder="Nome do Cliente"
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
          />

          <textarea
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows="3"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Taxa Mensal (R$)"
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
                <th>Cliente</th>
                <th>Taxa Mensal</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td><strong>{project.name}</strong></td>
                  <td>{project.client_name || '-'}</td>
                  <td>R$ {project.monthly_rate?.toFixed(2)}</td>
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
