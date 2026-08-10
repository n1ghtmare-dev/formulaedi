import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App';
import { AuthProvider } from './features/auth/AuthContext';
import { AdminApp } from './admin/AdminApp';

// Простой роутинг без библиотеки: /admin — панель управления, иначе витрина.
// SPA-фолбэк на сервере отдаёт index.html на любой путь, поэтому /admin грузит тот же бандл.
const isAdmin = window.location.pathname.startsWith('/admin');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdmin ? (
      <AdminApp />
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </React.StrictMode>,
);
