import React, { useState, useEffect } from 'react';
import '../styles/Manager.css';
import { IconEdit, IconPlug, IconPlus, IconTrash } from './Icons';

const API_TYPES = {
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI',
  google: 'Google Gemini',
  groq: 'Groq',
  mistral: 'Mistral AI',
  cohere: 'Cohere',
  huggingface: 'Hugging Face',
  replicate: 'Replicate',
  firecrawl: 'Firecrawl',
  perplexity: 'Perplexity AI',
  bedrock: 'AWS Bedrock',
  azure: 'Azure OpenAI',
  together: 'Together AI',
  other: 'Outro'
};

// Mapeamento entre o tipo da UI e o ID da tabela prices.json
const PRICING_PROVIDER_MAP = {
  anthropic: 'anthropic-claude',
  openai: 'openai-gpt',
  google: 'google-gemini',
  groq: 'groq',
  mistral: 'mistral',
  cohere: 'cohere',
  huggingface: 'huggingface',
  replicate: 'replicate',
  firecrawl: 'firecrawl',
  perplexity: 'perplexity',
  bedrock: 'claude-ai-bedrock',
  azure: 'azure-openai',
  together: 'together-ai'
};

export default function ApiManager({ token, onSave }) {
  const [apis, setApis] = useState([]);
  const [projects, setProjects] = useState([]);
  const [models, setModels] = useState({});
  const [form, setForm] = useState({
    name: '',
    type: 'anthropic',
    api_key: '',
    base_url: '',
    pricing_model: 'por_token',
    unit_cost: 0,
    model: '',
    project_id: ''
  });
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchApis();
    fetchProjects();
  }, []);

  const fetchApis = async () => {
    try {
      const res = await fetch('/api/apis', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApis(await res.json());
    } catch (error) {
      console.error('Erro:', error);
    }
  };

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

  const handleTypeChange = async (type) => {
    setForm({ ...form, type, model: '', unit_cost: 0 });

    const provider = PRICING_PROVIDER_MAP[type];
    if (!provider) return;

    try {
      const res = await fetch(`/api/apis/pricing/${provider}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const pricing = await res.json();
        setModels(prev => ({ ...prev, [type]: pricing.models || {} }));
      }
    } catch (error) {
      console.error('Erro ao buscar preços:', error);
    }
  };

  const handleModelChange = (modelName) => {
    const provider = PRICING_PROVIDER_MAP[form.type];
    if (!provider || !models[form.type]?.[modelName]) return;

    const model = models[form.type][modelName];
    const avgCost = (model.input + model.output) / 2;
    setForm({ ...form, model: modelName, unit_cost: avgCost });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/apis/${editing}` : '/api/apis';

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
        fetchApis();
        onSave();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Confirmar exclusão?')) return;

    try {
      const res = await fetch(`/api/apis/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchApis();
        onSave();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleEdit = (api) => {
    setForm({
      name: api.name || '',
      type: api.type || 'anthropic',
      api_key: api.api_key || '',
      base_url: api.base_url || '',
      pricing_model: api.pricing_model || 'por_token',
      unit_cost: api.unit_cost || 0,
      model: api.model || '',
      project_id: api.project_id || ''
    });
    setEditing(api.id);
  };

  const resetForm = () => {
    setForm({
      name: '',
      type: 'anthropic',
      api_key: '',
      base_url: '',
      pricing_model: 'por_token',
      unit_cost: 0,
      model: '',
      project_id: ''
    });
    setEditing(null);
  };

  const projectsById = new Map(projects.map((p) => [p.id, p]));

  return (
    <div className="manager">
      <div className="manager-form">
        <h2>{editing ? <><IconEdit /> Editar API</> : <><IconPlus /> Adicionar nova API</>}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nome da API"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <select
            value={form.type}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {Object.entries(API_TYPES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {models[form.type] && Object.keys(models[form.type]).length > 0 && (
            <select
              value={form.model}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              <option value="">Selecionar modelo...</option>
              {Object.entries(models[form.type]).map(([modelName, pricing]) => (
                <option key={modelName} value={modelName}>
                  {modelName} (média: $ {((pricing.input + pricing.output) / 2).toFixed(6)})
                </option>
              ))}
            </select>
          )}

          <input
            type="password"
            placeholder="API Key (opcional)"
            value={form.api_key}
            onChange={(e) => setForm({ ...form, api_key: e.target.value })}
          />

          <input
            type="text"
            placeholder="Base URL (opcional)"
            value={form.base_url}
            onChange={(e) => setForm({ ...form, base_url: e.target.value })}
          />

          <select
            value={form.pricing_model}
            onChange={(e) => setForm({ ...form, pricing_model: e.target.value })}
          >
            <option value="por_token">Por Token</option>
            <option value="por_requisicao">Por Requisição</option>
            <option value="por_minuto">Por Minuto</option>
            <option value="por_gb">Por GB</option>
            <option value="subscription">Subscription</option>
          </select>

          <input
            type="number"
            step="0.00001"
            placeholder="Custo unitário"
            value={form.unit_cost}
            onChange={(e) => setForm({ ...form, unit_cost: parseFloat(e.target.value) })}
          />

          <select
            value={form.project_id}
            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
          >
            <option value="">Sem projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className="form-buttons">
            <button type="submit" className="btn-primary">
              {editing ? 'Atualizar' : 'Adicionar'}
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
        <h2><IconPlug /> APIs configuradas</h2>
        {apis.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>ID (copiar para código)</th>
                <th>Tipo</th>
                <th>Modelo</th>
                <th>Custo</th>
                <th>Projeto</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {apis.map((api) => (
                <tr key={api.id}>
                  <td>{api.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85em', cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(api.id); alert('ID copiado!'); }} title="Clique para copiar">
                    {api.id.substring(0, 8)}...
                  </td>
                  <td>{api.type}</td>
                  <td>{api.model || api.pricing_model}</td>
                  <td>$ {api.unit_cost?.toFixed(5)}</td>
                  <td>{projectsById.get(api.project_id)?.name || '-'}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(api)} aria-label="Editar"><IconEdit /></button>
                    <button className="btn-delete" onClick={() => handleDelete(api.id)} aria-label="Excluir"><IconTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">Nenhuma API configurada</p>
        )}
      </div>
    </div>
  );
}
