import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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
