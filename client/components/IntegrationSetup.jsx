import React, { useState, useEffect } from 'react';
import '../styles/Manager.css';
import { IconPlug } from './Icons';

export default function IntegrationSetup({ token, userId }) {
  const [projects, setProjects] = useState([]);
  const [apis, setApis] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedApi, setSelectedApi] = useState('');
  const [backendUrl] = useState('https://mytokencost.up.railway.app');

  const [providerKey, setProviderKey] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchApis();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProjects(data || []);
      if (data?.length > 0) setSelectedProject(data[0].id);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const fetchApis = async () => {
    try {
      const res = await fetch('/api/apis', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setApis(data || []);
      if (data?.length > 0) setSelectedApi(data[0].id);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copiado!`);
  };

  const validateProviderKey = async () => {
    if (!providerKey.trim()) {
      alert('Insira uma chave do provedor');
      return;
    }
    setValidating(true);
    try {
      const res = await fetch('/api/integrations/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_key: providerKey })
      });
      const data = await res.json();
      setValidationResult(data);
    } catch (error) {
      setValidationResult({ error: error.message });
    } finally {
      setValidating(false);
    }
  };

  const exampleCode = `import { CountedAnthropic } from '@contador-tokens/anthropic-proxy';

const client = new CountedAnthropic({
  apiKey: process.env.ANTHROPIC_KEY,
  token: '${token}',
  projectId: '${selectedProject}',
  apiId: '${selectedApi}',
  backendUrl: '${backendUrl}'
});

// Use normalmente - custos registram automaticamente
const msg = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Olá' }]
});`;

  return (
    <div className="manager">
      <div className="manager-form">
        <h2><IconPlug /> Integração com SDK</h2>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>1. JWT Token (seu acesso)</h3>
          <div style={{
            background: 'var(--bg-lighter)',
            padding: '1rem',
            borderRadius: '0.4rem',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            wordBreak: 'break-all',
            marginBottom: '0.5rem',
            maxHeight: '80px',
            overflow: 'auto'
          }}>
            {token}
          </div>
          <button
            className="btn-primary"
            onClick={() => copyToClipboard(token, 'Token')}
            style={{ width: '100%' }}
          >
            Copiar Token
          </button>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>2. Selecione um Projeto</h3>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{ width: '100%', marginBottom: '0.5rem', padding: '0.6rem' }}
          >
            {projects.length === 0 && <option>Nenhum projeto criado</option>}
            {projects.map(proj => (
              <option key={proj.id} value={proj.id}>{proj.name}</option>
            ))}
          </select>
          <div style={{
            background: 'var(--bg-lighter)',
            padding: '0.8rem',
            borderRadius: '0.4rem',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            marginBottom: '0.5rem'
          }}>
            {selectedProject}
          </div>
          <button
            className="btn-primary"
            onClick={() => copyToClipboard(selectedProject, 'Project ID')}
            style={{ width: '100%' }}
          >
            Copiar Project ID
          </button>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>3. Selecione uma API</h3>
          <select
            value={selectedApi}
            onChange={(e) => setSelectedApi(e.target.value)}
            style={{ width: '100%', marginBottom: '0.5rem', padding: '0.6rem' }}
          >
            {apis.length === 0 && <option>Nenhuma API configurada</option>}
            {apis.map(api => (
              <option key={api.id} value={api.id}>
                {api.name} ({api.type})
              </option>
            ))}
          </select>
          <div style={{
            background: 'var(--bg-lighter)',
            padding: '0.8rem',
            borderRadius: '0.4rem',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            marginBottom: '0.5rem'
          }}>
            {selectedApi}
          </div>
          <button
            className="btn-primary"
            onClick={() => copyToClipboard(selectedApi, 'API ID')}
            style={{ width: '100%' }}
          >
            Copiar API ID
          </button>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>4. Backend URL</h3>
          <div style={{
            background: 'var(--bg-lighter)',
            padding: '0.8rem',
            borderRadius: '0.4rem',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            marginBottom: '0.5rem'
          }}>
            {backendUrl}
          </div>
          <button
            className="btn-primary"
            onClick={() => copyToClipboard(backendUrl, 'Backend URL')}
            style={{ width: '100%' }}
          >
            Copiar Backend URL
          </button>
        </div>

        <div style={{ marginBottom: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>5. Validar Chave & Ver Crédito</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
            Cole sua chave de API para validar e ver créditos disponíveis (Anthropic, OpenAI)
          </p>
          <input
            type="password"
            placeholder="sk-ant-... ou sk-..."
            value={providerKey}
            onChange={(e) => setProviderKey(e.target.value)}
            style={{ width: '100%', marginBottom: '0.5rem', padding: '0.6rem' }}
          />
          <button
            className="btn-primary"
            onClick={validateProviderKey}
            disabled={validating}
            style={{ width: '100%' }}
          >
            {validating ? 'Validando...' : 'Validar Chave'}
          </button>

          {validationResult && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '0.4rem',
              background: validationResult.is_valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderLeft: `3px solid ${validationResult.is_valid ? '#10b981' : '#ef4444'}`
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>{validationResult.name}</strong>
                {validationResult.is_valid ? ' ✓' : ' ✗'}
              </div>

              {validationResult.is_valid && (
                <>
                  <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <div>Teste: {validationResult.usage?.test_input_tokens} in + {validationResult.usage?.test_output_tokens} out</div>
                    <div>Custo do teste: ${validationResult.usage?.test_total_cost?.toFixed(6) || '0'}</div>
                  </div>

                  {validationResult.billing && (
                    <div style={{
                      background: 'var(--bg-lighter)',
                      padding: '0.6rem',
                      borderRadius: '0.3rem',
                      fontSize: '0.85rem',
                      marginTop: '0.5rem'
                    }}>
                      {validationResult.billing.credit_available !== undefined ? (
                        <>
                          <div><strong>Crédito disponível:</strong> ${validationResult.billing.credit_available?.toFixed(2)}</div>
                          <div><strong>Total de crédito:</strong> ${validationResult.billing.total_credit?.toFixed(2)}</div>
                          <div><strong>Crédito usado:</strong> ${validationResult.billing.used_credit?.toFixed(2)}</div>
                          {validationResult.billing.expires_at && (
                            <div><strong>Expira em:</strong> {new Date(validationResult.billing.expires_at).toLocaleDateString()}</div>
                          )}
                        </>
                      ) : (
                        <div>Chave válida e ativa ✓</div>
                      )}
                    </div>
                  )}
                </>
              )}

              {validationResult.error && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                  <strong>Erro:</strong> {validationResult.error}
                  {validationResult.details && <div style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>{validationResult.details}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="manager-list">
        <h2><IconPlug /> Exemplo de Código</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Copie e cole este código no seu projeto Node.js. Substitua <code>process.env.ANTHROPIC_KEY</code> pela sua chave real da Anthropic.
        </p>
        <pre style={{
          background: 'var(--bg-lighter)',
          padding: '1rem',
          borderRadius: '0.4rem',
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          lineHeight: '1.5',
          marginBottom: '1rem'
        }}>
          {exampleCode}
        </pre>
        <button
          className="btn-primary"
          onClick={() => copyToClipboard(exampleCode, 'Código')}
          style={{ width: '100%' }}
        >
          Copiar Código Completo
        </button>
      </div>
    </div>
  );
}
