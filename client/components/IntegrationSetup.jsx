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
  const [selectedModel, setSelectedModel] = useState('');

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

  const selectedApiObj = apis.find(a => a.id === selectedApi);
  const apiType = selectedApiObj?.type || 'anthropic';

  const CODE_TEMPLATES = {
    anthropic: (model) => `import { CountedAnthropic } from '@luiggi-87/anthropic-proxy';

const client = new CountedAnthropic({
  apiKey: process.env.ANTHROPIC_KEY,
  token: '${token}',
  projectId: '${selectedProject}',
  apiId: '${selectedApi}',
  backendUrl: '${backendUrl}'
});

// Use normalmente - custos registram automaticamente
const msg = await client.messages.create({
  model: '${model || 'claude-sonnet-5'}',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Olá' }]
});`,
    openai: (model) => `import { CountedOpenAI } from '@luiggi-87/openai-proxy';

const client = new CountedOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  token: '${token}',
  projectId: '${selectedProject}',
  apiId: '${selectedApi}',
  backendUrl: '${backendUrl}'
});

// Use normalmente - custos registram automaticamente
const msg = await client.chat.completions.create({
  model: '${model || 'gpt-4o'}',
  messages: [{ role: 'user', content: 'Olá' }]
});`,
    google: (model) => `import { CountedGemini } from '@luiggi-87/gemini-proxy';

const client = new CountedGemini({
  apiKey: process.env.GEMINI_API_KEY,
  token: '${token}',
  projectId: '${selectedProject}',
  apiId: '${selectedApi}',
  backendUrl: '${backendUrl}'
});

// Use normalmente - custos registram automaticamente
const msg = await client.generateContent('${model || 'gemini-2.0-flash'}', {
  contents: [{ role: 'user', parts: [{ text: 'Olá' }] }]
});`,
    groq: (model) => `import { CountedGroq } from '@luiggi-87/groq-proxy';

const client = new CountedGroq({
  apiKey: process.env.GROQ_API_KEY,
  token: '${token}',
  projectId: '${selectedProject}',
  apiId: '${selectedApi}',
  backendUrl: '${backendUrl}'
});

// Use normalmente - custos registram automaticamente
const msg = await client.chat.completions.create({
  model: '${model || 'llama-3.3-70b-versatile'}',
  messages: [{ role: 'user', content: 'Olá' }]
});`,
    mistral: (model) => `import { CountedMistral } from '@luiggi-87/mistral-proxy';

const client = new CountedMistral({
  apiKey: process.env.MISTRAL_API_KEY,
  token: '${token}',
  projectId: '${selectedProject}',
  apiId: '${selectedApi}',
  backendUrl: '${backendUrl}'
});

// Use normalmente - custos registram automaticamente
const msg = await client.chat.complete({
  model: '${model || 'mistral-small-latest'}',
  messages: [{ role: 'user', content: 'Olá' }]
});`,
    cohere: (model) => `import { CountedCohere } from '@luiggi-87/cohere-proxy';

const client = new CountedCohere({
  apiKey: process.env.COHERE_API_KEY,
  token: '${token}',
  projectId: '${selectedProject}',
  apiId: '${selectedApi}',
  backendUrl: '${backendUrl}'
});

// Use normalmente - custos registram automaticamente
const msg = await client.chat({
  model: '${model || 'command-r'}',
  messages: [{ role: 'user', content: 'Olá' }]
});`,
    perplexity: (model) => `import { CountedPerplexity } from '@luiggi-87/perplexity-proxy';

const client = new CountedPerplexity({
  apiKey: process.env.PERPLEXITY_API_KEY,
  token: '${token}',
  projectId: '${selectedProject}',
  apiId: '${selectedApi}',
  backendUrl: '${backendUrl}'
});

// Use normalmente - custos registram automaticamente
const msg = await client.chat.completions.create({
  model: '${model || 'sonar'}',
  messages: [{ role: 'user', content: 'Olá' }]
});`,
    together: (model) => `import { CountedTogether } from '@luiggi-87/together-proxy';

const client = new CountedTogether({
  apiKey: process.env.TOGETHER_API_KEY,
  token: '${token}',
  projectId: '${selectedProject}',
  apiId: '${selectedApi}',
  backendUrl: '${backendUrl}'
});

// Use normalmente - custos registram automaticamente
const msg = await client.chat.completions.create({
  model: '${model || 'mistralai/Mistral-7B-Instruct-v0.1'}',
  messages: [{ role: 'user', content: 'Olá' }]
});`
  };

  // Ainda não temos um pacote proxy pronto para este provedor — mostra
  // como registrar o custo manualmente via POST direto no backend.
  const genericTemplate = () => `// Não existe SDK proxy pronto para este provedor ainda.
// Depois de cada chamada de API, registre o custo manualmente:

const response = await fetch('${backendUrl}/api/costs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${token}'
  },
  body: JSON.stringify({
    project_id: '${selectedProject}',
    api_id: '${selectedApi}',
    amount: custoCalculado,   // calcule com base no preço do modelo usado
    units: totalDeTokens,
    unit_type: 'tokens',
    description: 'Descrição da chamada'
  })
});`;

  const hasPackage = ['anthropic', 'openai', 'google', 'groq', 'mistral', 'cohere', 'perplexity', 'together'].includes(apiType);

  const packageName = {
    anthropic: '@luiggi-87/anthropic-proxy',
    openai: '@luiggi-87/openai-proxy',
    google: '@luiggi-87/gemini-proxy',
    groq: '@luiggi-87/groq-proxy',
    mistral: '@luiggi-87/mistral-proxy',
    cohere: '@luiggi-87/cohere-proxy',
    perplexity: '@luiggi-87/perplexity-proxy',
    together: '@luiggi-87/together-proxy'
  }[apiType];

  const exampleCode = hasPackage
    ? CODE_TEMPLATES[apiType](selectedModel)
    : genericTemplate();

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

          {validationResult?.is_valid && validationResult?.models_tested && (
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                Qual modelo o seu sistema usa?
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ width: '100%', padding: '0.6rem' }}
              >
                <option value="">Selecione um modelo...</option>
                {validationResult.models_tested.map(m => (
                  <option key={m.model} value={m.model}>
                    {m.model} (${m.pricing.input_per_million.toFixed(2)}/M in, ${m.pricing.output_per_million.toFixed(2)}/M out)
                  </option>
                ))}
              </select>
            </div>
          )}
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

              {validationResult.is_valid && validationResult.models_tested && (
                <>
                  <div style={{ fontSize: '0.85rem', marginBottom: '1rem', marginTop: '0.5rem' }}>
                    <strong>Modelos testados:</strong>
                    {validationResult.models_tested.map((m) => (
                      <div key={m.model} style={{
                        background: 'var(--bg-lighter)',
                        padding: '0.6rem',
                        borderRadius: '0.3rem',
                        marginTop: '0.5rem',
                        fontSize: '0.8rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                          <span><strong>{m.model}</strong></span>
                          <span style={{ color: '#10b981' }}>✓ Ativo</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          Teste: {m.usage.test_input_tokens} in + {m.usage.test_output_tokens} out = ${m.usage.test_total_cost?.toFixed(6)}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                          Preço: ${m.pricing.input_per_million?.toFixed(2)}/M in + ${m.pricing.output_per_million?.toFixed(2)}/M out
                        </div>
                      </div>
                    ))}
                  </div>

                  {validationResult.unpriced_models && validationResult.unpriced_models.length > 0 && (
                    <div style={{
                      background: 'rgba(234, 179, 8, 0.1)',
                      borderLeft: '3px solid #eab308',
                      padding: '0.6rem',
                      borderRadius: '0.3rem',
                      fontSize: '0.8rem',
                      marginBottom: '1rem'
                    }}>
                      <strong>Modelos disponíveis sem preço configurado:</strong>
                      <div style={{ color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        {validationResult.unpriced_models.join(', ')}
                      </div>
                    </div>
                  )}

                  {validationResult.billing && (
                    <div style={{
                      background: 'var(--bg-lighter)',
                      padding: '0.6rem',
                      borderRadius: '0.3rem',
                      fontSize: '0.85rem'
                    }}>
                      <strong>Informações de Crédito:</strong>
                      {validationResult.billing.credit_available !== undefined ? (
                        <>
                          <div style={{ marginTop: '0.3rem' }}><strong>Disponível:</strong> ${validationResult.billing.credit_available?.toFixed(2)}</div>
                          <div><strong>Total:</strong> ${validationResult.billing.total_credit?.toFixed(2)}</div>
                          <div><strong>Usado:</strong> ${validationResult.billing.used_credit?.toFixed(2)}</div>
                          {validationResult.billing.expires_at && (
                            <div><strong>Expira:</strong> {new Date(validationResult.billing.expires_at).toLocaleDateString()}</div>
                          )}
                        </>
                      ) : (
                        <div style={{ marginTop: '0.3rem' }}>Chave válida e ativa ✓</div>
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
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
          {hasPackage
            ? 'Instale o pacote e cole este código no seu projeto Node.js:'
            : 'Ainda não temos um pacote SDK pronto para este provedor. Use o registro manual abaixo:'}
        </p>
        {hasPackage && (
          <pre style={{
            background: 'var(--bg-lighter)',
            padding: '0.6rem 1rem',
            borderRadius: '0.4rem',
            overflowX: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            marginBottom: '1rem',
            maxWidth: '100%'
          }}>
            npm install {packageName}
          </pre>
        )}
        <pre style={{
          background: 'var(--bg-lighter)',
          padding: '1rem',
          borderRadius: '0.4rem',
          overflowX: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          lineHeight: '1.5',
          marginBottom: '1rem',
          maxWidth: '100%',
          whiteSpace: 'pre'
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
