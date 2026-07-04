import React from 'react';
import '../styles/Dashboard.css';

export default function Dashboard({ stats, onRefresh, token }) {
  if (!stats) return <div className="loading">Carregando...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div className="card card-total">
          <h3>💰 Total Gasto</h3>
          <div className="amount">R$ {stats.total?.toFixed(2)}</div>
        </div>

        <div className="card">
          <h3>📊 Por API</h3>
          <div className="list">
            {stats.byApi?.length > 0 ? (
              stats.byApi.map((api) => (
                <div key={api.name} className="list-item">
                  <span className="api-name">{api.name}</span>
                  <span className="api-value">R$ {api.total?.toFixed(2)}</span>
                </div>
              ))
            ) : (
              <p className="empty">Nenhuma API registrada</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3>📁 Por Projeto</h3>
          <div className="list">
            {stats.byProject?.length > 0 ? (
              stats.byProject.map((project) => (
                <div key={project.id} className="list-item">
                  <div className="project-info">
                    <span className="project-name">{project.name}</span>
                    {project.client_name && (
                      <span className="project-client">{project.client_name}</span>
                    )}
                  </div>
                  <span className="project-value">R$ {project.total?.toFixed(2)}</span>
                </div>
              ))
            ) : (
              <p className="empty">Nenhum projeto registrado</p>
            )}
          </div>
        </div>
      </div>

      <button className="btn-refresh" onClick={onRefresh}>
        🔄 Atualizar
      </button>
    </div>
  );
}
