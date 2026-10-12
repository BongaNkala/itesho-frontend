import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ─── TEMP FIX: rewrite localhost API URL to production ───
if (typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  const _originalFetch = window.fetch.bind(window);
  window.fetch = (url, opts) => {
    if (typeof url === 'string' && url.startsWith('http://127.0.0.1:8000')) {
      url = url.replace('http://127.0.0.1:8000', 'https://bongankala.pythonanywhere.com');
    }
    return _originalFetch(url, opts);
  };
}
// ─── END TEMP FIX ───

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
