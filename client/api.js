const API_URL = import.meta.env.VITE_API_URL || '';

export async function apiCall(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, options);
  return response;
}

export function getApiUrl() {
  return API_URL;
}
