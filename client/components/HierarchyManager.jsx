import React, { useState, useEffect } from 'react';
import '../styles/Manager.css';
import '../styles/Dashboard.css';
import { IconBuilding, IconUser, IconFolder, IconKey, IconPlus } from './Icons';
import { API_TYPES } from './ApiManager';

function toggle(set, id) {
  const next = new Set(set);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
}

export default function HierarchyManager({ token, onSave }) {
  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [apis, setApis] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [form, setForm] = useState(null);

  const authHeaders = { Authorization: `Bearer ${token}` };
  const headers = { 'Content-Type': 'application/json', ...authHeaders };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [c, cl, p, a] = await Promise.all([
        fetch('/api/companies', { headers: authHeaders }).then((r) => r.json()),
        fetch('/api/clients', { headers: authHeaders }).then((r) => r.json()),
        fetch('/api/projects', { headers: authHeaders }).then((r) => r.json()),
        fetch('/api/apis', { headers: authHeaders }).then((r) => r.json())
      ]);
      setCompanies(c);
      setClients(cl);
      setProjects(p);
      setApis(a);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const openForm = (slot, kind, ctx = {}) => setForm({ slot, kind, name: '', type: 'anthropic', api_key: '', ...ctx });
  const closeForm = () => setForm(null);

  const submitForm = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;

    const expandKeys = [];
    if (form.companyId) expandKeys.push(`co:${form.companyId}`);
    if (form.clientId) expandKeys.push(`cl:${form.clientId}`);

    try {
      if (form.kind === 'company') {
        await fetch('/api/companies', { method: 'POST', headers, body: JSON.stringify({ name }) });
      } else if (form.kind === 'client') {
        await fetch('/api/clients', { method: 'POST', headers, body: JSON.stringify({ name, company_id: form.companyId }) });
      } else if (form.kind === 'project') {
        await fetch('/api/projects', { method: 'POST', headers, body: JSON.stringify({ name, company_id: form.companyId, client_id: form.clientId || null }) });
      } else if (form.kind === 'key') {
        let projectId = form.projectId;
        if (!projectId) {
          const project = await fetch('/api/projects', {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: form.fallbackProjectName, company_id: form.companyId, client_id: form.clientId || null })
          }).then((r) => r.json());
          projectId = project.id;
        }
        expandKeys.push(`pr:${projectId}`);
        await fetch('/api/apis', {
          method: 'POST',
          headers,
          body: JSON.stringify({ name, type: form.type, api_key: form.api_key || null, pricing_model: 'por_token', unit_cost: 0, project_id: projectId })
        });
      }

      closeForm();
      await fetchAll();
      setExpanded((prev) => new Set([...prev, ...expandKeys]));
      onSave();
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const renderNameForm = (placeholder) => (
    <form className="inline-add-form" onSubmit={submitForm}>
      <input
        type="text"
        autoFocus
        placeholder={placeholder}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <button type="submit" className="btn-primary">Criar</button>
      <button type="button" className="btn-secondary" onClick={closeForm}>Cancelar</button>
    </form>
  );

  const renderKeyForm = () => (
    <form className="inline-add-form inline-add-form-key" onSubmit={submitForm}>
      <input
        type="text"
        autoFocus
        placeholder="Nome da chave"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
        {Object.entries(API_TYPES).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <input
        type="password"
        placeholder="API Key (opcional)"
        value={form.api_key}
        onChange={(e) => setForm({ ...form, api_key: e.target.value })}
      />
      <button type="submit" className="btn-primary">Criar</button>
      <button type="button" className="btn-secondary" onClick={closeForm}>Cancelar</button>
    </form>
  );

  const renderProjectRow = (project, companyId, clientId) => {
    const nodeKey = `pr:${project.id}`;
    const isOpen = expanded.has(nodeKey);
    const projectApis = apis.filter((a) => a.project_id === project.id);

    return (
      <div key={project.id} className="tree-node">
        <div className="tree-row tree-child">
          <span
            className={`tree-label ${projectApis.length > 0 ? 'clickable' : ''}`}
            onClick={() => projectApis.length > 0 && setExpanded(toggle(expanded, nodeKey))}
          >
            {projectApis.length > 0 ? <span className={`chevron ${isOpen ? 'open' : ''}`}>▸</span> : <span className="chevron-spacer" />}
            <IconFolder /> {project.name} {!clientId && <em>(sem cliente)</em>}
          </span>
          <span className="tree-actions">
            <button type="button" className="btn-accent" onClick={() => openForm(`pr:${project.id}:key`, 'key', { companyId, clientId, projectId: project.id })}>
              <IconKey /> Chave
            </button>
          </span>
        </div>
        {form?.slot === `pr:${project.id}:key` && renderKeyForm()}
        {isOpen && (
          <div className="tree-children">
            {projectApis.map((api) => (
              <div key={api.id} className="tree-row tree-child">
                <span className="tree-label"><IconKey /> {api.name}</span>
                <span className="tree-path">{API_TYPES[api.type] || api.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const unassignedProjects = projects.filter((p) => !p.company_id);
  const unassignedApis = apis.filter((a) => !a.project_id);

  return (
    <div className="hierarchy-manager">
      <div className="hierarchy-header">
        <h2><IconBuilding /> Empresas</h2>
        <button type="button" className="btn-primary" onClick={() => openForm('root', 'company')}>
          <IconPlus /> Nova empresa
        </button>
      </div>
      {form?.slot === 'root' && renderNameForm('Nome da empresa')}

      {companies.length > 0 ? (
        <div className="tree hierarchy-tree">
          {companies.map((company) => {
            const nodeKey = `co:${company.id}`;
            const isOpen = expanded.has(nodeKey);
            const companyClients = clients.filter((c) => c.company_id === company.id);
            const directProjects = projects.filter((p) => p.company_id === company.id && !p.client_id);
            const hasChildren = companyClients.length > 0 || directProjects.length > 0;

            return (
              <div key={company.id} className="tree-node">
                <div className="tree-row">
                  <span
                    className={`tree-label ${hasChildren ? 'clickable' : ''}`}
                    onClick={() => hasChildren && setExpanded(toggle(expanded, nodeKey))}
                  >
                    {hasChildren ? <span className={`chevron ${isOpen ? 'open' : ''}`}>▸</span> : <span className="chevron-spacer" />}
                    <IconBuilding /> {company.name}
                  </span>
                  <span className="tree-actions">
                    <button type="button" onClick={() => openForm(`co:${company.id}:client`, 'client', { companyId: company.id })}>
                      <IconPlus /> Cliente
                    </button>
                    <button type="button" onClick={() => openForm(`co:${company.id}:project`, 'project', { companyId: company.id })}>
                      <IconPlus /> Projeto
                    </button>
                  </span>
                </div>
                {form?.slot === `co:${company.id}:client` && renderNameForm('Nome do cliente')}
                {form?.slot === `co:${company.id}:project` && renderNameForm('Nome do projeto')}

                {isOpen && (
                  <div className="tree-children">
                    {companyClients.map((client) => {
                      const clientNodeKey = `cl:${client.id}`;
                      const clientOpen = expanded.has(clientNodeKey);
                      const clientProjects = projects.filter((p) => p.client_id === client.id);

                      return (
                        <div key={client.id} className="tree-node">
                          <div className="tree-row tree-child">
                            <span
                              className={`tree-label ${clientProjects.length > 0 ? 'clickable' : ''}`}
                              onClick={() => clientProjects.length > 0 && setExpanded(toggle(expanded, clientNodeKey))}
                            >
                              {clientProjects.length > 0 ? <span className={`chevron ${clientOpen ? 'open' : ''}`}>▸</span> : <span className="chevron-spacer" />}
                              <IconUser /> {client.name}
                            </span>
                            <span className="tree-actions">
                              <button
                                type="button"
                                onClick={() => openForm(`cl:${client.id}:project`, 'project', { companyId: company.id, clientId: client.id })}
                              >
                                <IconPlus /> Projeto
                              </button>
                              <button
                                type="button"
                                className="btn-accent"
                                onClick={() => openForm(`cl:${client.id}:key`, 'key', {
                                  companyId: company.id,
                                  clientId: client.id,
                                  projectId: clientProjects[0]?.id || null,
                                  fallbackProjectName: client.name
                                })}
                              >
                                <IconKey /> Chave
                              </button>
                            </span>
                          </div>
                          {form?.slot === `cl:${client.id}:project` && renderNameForm('Nome do projeto')}
                          {form?.slot === `cl:${client.id}:key` && renderKeyForm()}

                          {clientOpen && (
                            <div className="tree-children">
                              {clientProjects.map((project) => renderProjectRow(project, company.id, client.id))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {directProjects.map((project) => renderProjectRow(project, company.id, null))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="empty">Nenhuma empresa cadastrada ainda</p>
      )}

      {unassignedProjects.length > 0 && (
        <div className="tree hierarchy-tree hierarchy-unassigned">
          <div className="tree-row"><span className="tree-label muted">Projetos sem empresa</span></div>
          <div className="tree-children">
            {unassignedProjects.map((project) => renderProjectRow(project, null, null))}
          </div>
        </div>
      )}

      {unassignedApis.length > 0 && (
        <div className="tree hierarchy-tree hierarchy-unassigned">
          <div className="tree-row"><span className="tree-label muted">Chaves sem projeto</span></div>
          <div className="tree-children">
            {unassignedApis.map((api) => (
              <div key={api.id} className="tree-row tree-child">
                <span className="tree-label"><IconKey /> {api.name}</span>
                <span className="tree-path">{API_TYPES[api.type] || api.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
