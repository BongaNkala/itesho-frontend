const API_BASE = import.meta.env.VITE_API_URL || 'https://bongankala.pythonanywhere.com';

const api = (endpoint, options = {}) => {
  const token = localStorage.getItem('access_token');
  
  return fetch(`${API_BASE}/api/${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });
};

export default api;
