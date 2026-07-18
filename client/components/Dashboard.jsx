import React, { useState } from 'react';
import '../styles/Dashboard.css';
import { IconCoin, IconDashboard, IconFolder, IconRefresh } from './Icons';

function toggle(set, id) {
  const next = new Set(set);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
}

function projectPath(project, companiesById, clientsById) {
  const company = companiesById.get(project.company_id);
  if (!company) return null;
  const client = clientsById.get(project.client_id);
  return client ? `${company.name} / ${client.name}` : company.name;
}

export default function Dashboard({ stats, onRefresh, token }) {
  const [expandedCompanies, setExpandedCompanies] = useState(new Set());
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  if (!stats) return <div className="loading">Carregando...</div>;

  const companies = stats.companies || [];
  const clients = stats.clients || [];
  const byProject = stats.byProject || [];
  const projectApis = stats.projectApis || [];

  const companiesById = new Map(companies.map((c) => [c.id, c]));
  const clientsById = new Map(clients.map((c) => [c.id, c]));

  const companyTree = companies.map((company) => {
    const companyProjects = byProject.filter((p) => p.company_id === company.id);
    const companyClients = clients
      .filter((c) => c.company_id === company.id)
      .map((client) => ({
        ...client,
        total: byProject
          .filter((p) => p.client_id === client.id)
          .reduce((sum, p) => sum + (p.total || 0), 0)
      }));
    const directProjects = companyProjects.filter((p) => !p.client_id);
    return {
      ...company,
      total: companyProjects.reduce((sum, p) => sum + (p.total || 0), 0),
      clients: companyClients,
      directProjects
    };
  });

  const unassignedTotal = byProject
    .filter((p) => !p.company_id)
    .reduce((sum, p) => sum + (p.total || 0), 0);

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div className="card card-total">
          <h3><IconCoin /> Total gasto</h3>
          <div className="amount">$ {stats.total?.toFixed(2)}</div>
        </div>

        <div className="card">
          <h3><IconDashboard /> Por empresa</h3>
          {companyTree.length > 0 || unassignedTotal > 0 ? (
            <div className="tree">
              {companyTree.map((company) => {
                const isOpen = expandedCompanies.has(company.id);
                const hasChildren = company.clients.length > 0 || company.directProjects.length > 0;
                return (
                  <div key={company.id} className="tree-node">
                    <div
                      className={`tree-row ${hasChildren ? 'clickable' : ''}`}
                      onClick={() => hasChildren && setExpandedCompanies(toggle(expandedCompanies, company.id))}
                    >
                      <span className="tree-label">
                        {hasChildren && <span className={`chevron ${isOpen ? 'open' : ''}`}>▸</span>}
                        {company.name}
                      </span>
                      <span className="tree-value">$ {company.total.toFixed(2)}</span>
                    </div>
                    {isOpen && (
                      <div className="tree-children">
                        {company.clients.map((client) => (
                          <div key={client.id} className="tree-row tree-child">
                            <span className="tree-label">↳ {client.name}</span>
                            <span className="tree-value">$ {client.total.toFixed(2)}</span>
                          </div>
                        ))}
                        {company.directProjects.map((project) => (
                          <div key={project.id} className="tree-row tree-child">
                            <span className="tree-label">↳ {project.name} <em>(sem cliente)</em></span>
                            <span className="tree-value">$ {(project.total || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {unassignedTotal > 0 && (
                <div className="tree-row">
                  <span className="tree-label muted">Sem empresa atribuída</span>
                  <span className="tree-value">$ {unassignedTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="empty">Nenhuma empresa cadastrada</p>
          )}
        </div>

        <div className="card">
          <h3><IconFolder /> Por projeto</h3>
          {byProject.length > 0 ? (
            <div className="tree">
              {byProject.map((project) => {
                const path = projectPath(project, companiesById, clientsById);
                const apis = projectApis.filter((a) => a.project_id === project.id);
                const isOpen = expandedProjects.has(project.id);
                return (
                  <div key={project.id} className="tree-node">
                    <div
                      className={`tree-row ${apis.length > 0 ? 'clickable' : ''}`}
                      onClick={() => apis.length > 0 && setExpandedProjects(toggle(expandedProjects, project.id))}
                    >
                      <span className="tree-label">
                        {apis.length > 0 && <span className={`chevron ${isOpen ? 'open' : ''}`}>▸</span>}
                        {project.name}
                        {path && <span className="tree-path"> ({path})</span>}
                      </span>
                      <span className="tree-value">$ {(project.total || 0).toFixed(2)}</span>
                    </div>
                    {isOpen && (
                      <div className="tree-children">
                        {apis.map((api) => (
                          <div key={api.api_id} className="tree-row tree-child">
                            <span className="tree-label">↳ {api.api_name}</span>
                            <span className="tree-value">$ {api.total.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty">Nenhum projeto registrado</p>
          )}
        </div>
      </div>

      <button className="btn-refresh" onClick={onRefresh}>
        <IconRefresh /> Atualizar
      </button>
    </div>
  );
}
