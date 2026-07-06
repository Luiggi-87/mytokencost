import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { getInitialTheme, applyTheme } from './theme';

// Aplicar tema salvo antes do primeiro paint (evita flash de tema errado)
applyTheme(getInitialTheme());

// Interceptar todos os fetch para adicionar API_URL automaticamente
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [resource, config] = args;
  const apiUrl = import.meta.env.VITE_API_URL || '';

  if (typeof resource === 'string' && resource.startsWith('/api/') && apiUrl) {
    args[0] = `${apiUrl}${resource}`;
  }

  return originalFetch.apply(this, args);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
