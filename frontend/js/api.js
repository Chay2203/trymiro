const API_BASE = 'http://localhost:3000';

async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('miro_token');
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }

    const res = await fetch(API_BASE + path, { ...options, headers });

    if (res.status === 401) {
        localStorage.removeItem('miro_token');
        localStorage.removeItem('miro_user');
        window.location.href = 'login.html';
        return;
    }

    return res;
}
