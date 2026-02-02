
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AdminAuthProvider>
            <App />
        </AdminAuthProvider>
    </React.StrictMode>
);
