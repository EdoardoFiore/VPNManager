const API_BASE = 'http://132.145.54.55:8000/api'; // Update IP or use relative path in prod

// Auth Check
function requireAuth() {
    const token = localStorage.getItem('madmin_token');
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }
    return token;
}

// Global Headers
function getHeaders() {
    const token = requireAuth();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Router
async function loadPage(page) {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<div class="text-center mt-5"><div class="spinner-border"></div></div>';

    // Auth Guard
    if (!requireAuth()) return;

    try {
        let html = '';
        switch (page) {
            case 'dashboard':
                html = await renderDashboard();
                break;
            case 'users':
                html = await renderUsers();
                break;
            case 'firewall':
                html = await renderFirewall();
                break;
            case 'modules':
                html = await renderModules();
                break;
            default:
                html = '<h1>404 Page Not Found</h1>';
        }
        contentDiv.innerHTML = html;

        // Post-render initialization
        if (page === 'users') initUsers();
        if (page === 'firewall') initFirewall();
        if (page === 'modules') initModules();

    } catch (e) {
        if (e.message === '401') {
            window.location.href = 'login.html';
        } else {
            console.error(e);
            contentDiv.innerHTML = `<div class="alert alert-danger">Error loading page: ${e.message}</div>`;
        }
    }
}

// --- Components ---

async function renderDashboard() {
    return `
    <div class="page-header d-print-none">
        <div class="row align-items-center">
            <div class="col">
                 <h2 class="page-title">Dashboard</h2>
            </div>
        </div>
    </div>
    <div class="row row-cards">
        <div class="col-12">
            <div class="card">
                <div class="card-body">
                    <h3>Welcome to MADmin Kernel</h3>
                    <p>System is online.</p>
                </div>
            </div>
        </div>
    </div>
    `;
}

// --- Modules --
async function renderModules() {
    return `
    <div class="page-header d-print-none">
        <div class="row align-items-center">
            <div class="col">
                 <h2 class="page-title">Module Management</h2>
            </div>
            <div class="col-auto ms-auto d-print-none">
                <button class="btn btn-primary" onclick="showUploadModal()">
                    Upload Module (.zip)
                </button>
            </div>
        </div>
    </div>
    <div class="row row-cards">
        <div class="col-12">
            <div class="card">
                <div class="table-responsive">
                    <table class="table table-vcenter card-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Version</th>
                                <th>ID</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="modules-list-body">
                           <tr><td colspan="4" class="text-center">Loading modules...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    `;
}

async function initModules() {
    const res = await fetch(`${API_BASE}/core/modules/`, { headers: getHeaders() });
    if (res.status === 401) throw new Error('401');
    const modules = await res.json();

    const tbody = document.getElementById('modules-list-body');
    tbody.innerHTML = '';

    modules.forEach(mod => {
        tbody.innerHTML += `
        <tr>
            <td>${mod.name}</td>
            <td><span class="badge bg-blue">${mod.version}</span></td>
            <td><code>${mod.id}</code></td>
            <td>
                <button class="btn btn-sm btn-ghost-danger">Disable</button>
            </td>
        </tr>
        `;
    });
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Validate Token immediately
    const token = localStorage.getItem('madmin_token');
    if (!token) {
        window.location.href = 'login.html';
    } else {
        // Load User Profile
        fetch(`${API_BASE}/core/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => {
                if (r.ok) return r.json();
                throw new Error('401');
            })
            .then(user => {
                document.getElementById('user-display-name').innerText = user.username;
                loadPage('dashboard');
            })
            .catch(e => {
                localStorage.removeItem('madmin_token');
                window.location.href = 'login.html';
            });
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('madmin_token');
    window.location.href = 'login.html';
});
