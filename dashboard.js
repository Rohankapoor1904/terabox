// TeraBox API Dashboard JavaScript

// API Base URL - will be set by the template
let API_BASE = '';

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get API base from meta tag or default to current origin
    const metaApiBase = document.querySelector('meta[name="api-base"]');
    API_BASE = metaApiBase ? metaApiBase.getAttribute('content') : window.location.origin;

    // Initialize dashboard based on current page
    const path = window.location.pathname;

    if (path.includes('/dashboard')) {
        loadDashboard();
    } else if (path.includes('/admin')) {
        loadAdminDashboard();
    }

    // Setup API tester if present
    setupApiTester();

    // Setup form handlers
    setupFormHandlers();
});

// Load user dashboard
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            updateDashboard(data);
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showAlert('Failed to load dashboard', 'error');
    }
}

// Load admin dashboard
async function loadAdminDashboard() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            updateAdminDashboard(data);
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Failed to load admin dashboard:', error);
        showAlert('Failed to load admin dashboard', 'error');
    }
}

// Update dashboard with user data
function updateDashboard(data) {
    const user = data.user;
    const usage = data.usage;

    // Update user info
    document.getElementById('username').textContent = user.username;
    document.getElementById('email').textContent = user.email;
    document.getElementById('api-key').textContent = user.api_key;
    document.getElementById('is-admin').textContent = user.is_admin ? 'Yes' : 'No';

    // Update usage stats
    document.getElementById('monthly-used').textContent = usage.monthly.used;
    document.getElementById('monthly-limit').textContent = usage.monthly.limit;
    document.getElementById('monthly-remaining').textContent = usage.monthly.remaining;

    // Update progress bar
    updateProgressBar('monthly-progress', usage.monthly.used, usage.monthly.limit);
}

// Update admin dashboard
function updateAdminDashboard(data) {
    const users = data.users;
    const tbody = document.getElementById('users-table-body');

    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.is_active ? 'Active' : 'Inactive'}</td>
            <td>${user.is_admin ? 'Admin' : 'User'}</td>
            <td>${user.max_requests_per_day}</td>
            <td>${user.max_requests_per_month}</td>
            <td>
                <button class="btn btn-secondary" onclick="editUser(${user.id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteUser(${user.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update progress bar
function updateProgressBar(elementId, used, limit) {
    const element = document.getElementById(elementId);
    const percentage = (used / limit) * 100;
    element.style.width = `${Math.min(percentage, 100)}%`;

    if (percentage > 90) {
        element.style.backgroundColor = '#e53e3e';
    } else if (percentage > 70) {
        element.style.backgroundColor = '#dd6b20';
    } else {
        element.style.backgroundColor = '#38a169';
    }
}

// Setup API tester
function setupApiTester() {
    const apiForm = document.getElementById('api-form');
    if (!apiForm) return;

    apiForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(apiForm);
        const url = formData.get('url');
        const method = formData.get('method') || 'GET';
        const apiKey = formData.get('api_key');

        if (!url) {
            showAlert('Please enter a URL', 'error');
            return;
        }

        const resultDiv = document.getElementById('api-result');
        resultDiv.innerHTML = '<div class="loading"></div> Testing API...';

        try {
            const headers = {};
            if (apiKey) {
                headers['X-API-Key'] = apiKey;
            } else {
                Object.assign(headers, getAuthHeaders());
            }

            const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

            const response = await fetch(fullUrl, {
                method: method,
                headers: headers
            });

            const data = await response.text();

            let formattedData;
            try {
                const jsonData = JSON.parse(data);
                formattedData = JSON.stringify(jsonData, null, 2);
            } catch {
                formattedData = data;
            }

            resultDiv.innerHTML = `
                <strong>Status:</strong> ${response.status} ${response.statusText}<br>
                <strong>Response:</strong><br>
                <pre>${formattedData}</pre>
            `;

        } catch (error) {
            resultDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
        }
    });
}

// Setup form handlers
function setupFormHandlers() {
    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch(window.location.pathname, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const text = await response.text();
            if (text.includes('success')) {
                showAlert('User created successfully!', 'success');
                setTimeout(() => {
                    window.location.href = '/admin';
                }, 2000);
            } else {
                // Parse the HTML for error
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                const error = doc.querySelector('.error') || doc.querySelector('[style*="color:red"]');
                showAlert(error ? error.textContent : 'Registration failed', 'error');
            }
        } else {
            showAlert('Registration failed', 'error');
        }
    } catch (error) {
        showAlert('Registration failed', 'error');
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('api_key');
    window.location.href = '/login';
}

// Edit user (admin)
function editUser(userId) {
    const newLimit = prompt('Enter new daily request limit:');
    if (newLimit && !isNaN(newLimit)) {
        updateUserLimit(userId, parseInt(newLimit));
    }
}

// Update user limit (admin)
async function updateUserLimit(userId, newLimit) {
    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                max_requests_per_day: newLimit
            })
        });

        if (response.ok) {
            showAlert('User limit updated', 'success');
            loadAdminDashboard(); // Reload dashboard
        } else {
            showAlert('Failed to update user', 'error');
        }
    } catch (error) {
        showAlert('Failed to update user', 'error');
    }
}

// Delete user (admin)
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showAlert('User deleted', 'success');
            loadAdminDashboard(); // Reload dashboard
        } else {
            showAlert('Failed to delete user', 'error');
        }
    } catch (error) {
        showAlert('Failed to delete user', 'error');
    }
}

// Get authentication headers
function getAuthHeaders() {
    const token = localStorage.getItem('jwt_token') || getCookie('access_token_cookie');
    const apiKey = localStorage.getItem('api_key');

    const headers = {};

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else if (apiKey) {
        headers['X-API-Key'] = apiKey;
    }

    return headers;
}

// Get cookie value by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Show alert
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert('Copied to clipboard!', 'success');
    }).catch(() => {
        showAlert('Failed to copy', 'error');
    });
}

// Make functions globally available
window.copyToClipboard = copyToClipboard;
window.editUser = editUser;
window.deleteUser = deleteUser;
