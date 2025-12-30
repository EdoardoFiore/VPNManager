// Use relative path for API, assuming served by Nginx or same origin
const API_BASE = '/api';

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
                loadMenu(); // Load Sidebar
                loadPage('dashboard');
            })
            .catch(e => {
                console.error(e);
                localStorage.removeItem('madmin_token');
                window.location.href = 'login.html';
            });
    }
});

async function loadMenu() {
    const container = document.getElementById('dynamic-menu-container');

    try {
        const res = await fetch(`${API_BASE}/core/menu`, { headers: getHeaders() });
        if (!res.ok) throw new Error(res.statusText);

        const menu = await res.json();
        const currentPath = window.location.hash.replace('#', '') || 'dashboard'; // Use hash routing logic if applicable or state

        container.innerHTML = '';

        menu.forEach(item => {
            if (item.header) {
                container.innerHTML += `
                     <li class="nav-item text-uppercase text-muted fw-bold fs-5 ps-3 mt-3 mb-1" style="font-size: 0.7rem; letter-spacing: .05em;">
                        ${item.header}
                    </li>`;
            } else {
                // Determine active state logic (simplified)
                // In a real SPA, we track 'currentPage' global
                // For now, we rely on onClick updating specific classes if we wanted, 
                // but re-rendering on page load is enough.
                const isActive = false;

                container.innerHTML += `
                    <li class="nav-item ${isActive ? 'active' : ''}">
                        <a class="nav-link" href="#" onclick="loadPage('${item.url}'); return false;">
                            <span class="nav-link-icon d-md-none d-lg-inline-block">
                                <i class="ti ti-${item.icon}"></i>
                            </span>
                            <span class="nav-link-title">
                                ${item.label}
                            </span>
                        </a>
                    </li>`;
            }
        });

    } catch (e) {
        console.error("Menu load error", e);
        container.innerHTML = `
            <li class="nav-item">
                <a class="nav-link text-danger" href="#">
                    <span class="nav-link-icon"><i class="ti ti-alert-triangle"></i></span>
                    <span class="nav-link-title">Menu Error (Is Backend Running?)</span>
                </a>
            </li>
            <li class="nav-item">
                 <a class="nav-link" href="#" onclick="loadMenu(); return false;">
                    <span class="nav-link-icon"><i class="ti ti-refresh"></i></span>
                    <span class="nav-link-title">Retry</span>
                </a>
            </li>
        `;
    }
}

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('madmin_token');
    window.location.href = 'login.html';
});

// Mobile Logout
const mobileLogout = document.getElementById('mobile-logout-btn');
if (mobileLogout) {
    mobileLogout.addEventListener('click', () => {
        localStorage.removeItem('madmin_token');
        window.location.href = 'login.html';
    });
}
