function getToken() {
    return localStorage.getItem('miro_token');
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('miro_user'));
    } catch {
        return null;
    }
}

function saveAuth(token, user) {
    localStorage.setItem('miro_token', token);
    localStorage.setItem('miro_user', JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem('miro_token');
    localStorage.removeItem('miro_user');
}

function requireAuth() {
    if (!getToken()) {
        window.location.href = 'login.html';
    }
}

function redirectIfLoggedIn() {
    if (getToken()) {
        window.location.href = 'dashboard.html';
    }
}

function logout() {
    clearAuth();
    window.location.href = 'login.html';
}
