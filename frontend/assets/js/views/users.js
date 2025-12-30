/**
 * MADMIN - Users View
 */

import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from '../api.js';
import { showToast, confirmDialog, formatDate, emptyState, escapeHtml, statusBadge } from '../utils.js';
import { setPageActions, checkPermission, getUser } from '../app.js';

let users = [];
let permissions = [];
let editingUser = null;

/**
 * Render the users view
 */
export async function render(container) {
    if (checkPermission('users.manage')) {
        setPageActions(`
            <button class="btn btn-primary" id="btn-add-user">
                <i class="ti ti-user-plus me-2"></i>Nuovo Utente
            </button>
        `);
    }

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="ti ti-users me-2"></i>Utenti Registrati
                </h3>
            </div>
            <div class="table-responsive">
                <table class="table table-vcenter card-table">
                    <thead>
                        <tr>
                            <th>Utente</th>
                            <th>Email</th>
                            <th>Ruolo</th>
                            <th>Stato</th>
                            <th>Ultimo Accesso</th>
                            <th class="w-1"></th>
                        </tr>
                    </thead>
                    <tbody id="users-table-body">
                        <tr><td colspan="6" class="text-center py-4">
                            <div class="spinner-border spinner-border-sm"></div>
                        </td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- User Modal -->
        <div class="modal modal-blur fade" id="user-modal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="user-modal-title">Nuovo Utente</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="user-form">
                        <div class="modal-body">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label required">Username</label>
                                    <input type="text" class="form-control" id="user-username" required 
                                           minlength="3" maxlength="50" pattern="[a-zA-Z0-9_-]+">
                                    <small class="form-hint">Lettere, numeri, underscore e trattini</small>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" id="user-email">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label" id="password-label">Password</label>
                                    <input type="password" class="form-control" id="user-password" minlength="6">
                                    <small class="form-hint" id="password-hint">Minimo 6 caratteri</small>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Tipo Account</label>
                                    <label class="form-check form-switch mt-2">
                                        <input class="form-check-input" type="checkbox" id="user-superuser">
                                        <span class="form-check-label">Superuser (tutti i permessi)</span>
                                    </label>
                                </div>
                                <div class="col-12" id="permissions-section">
                                    <label class="form-label">Permessi</label>
                                    <div id="permissions-list" class="row g-2">
                                        <!-- Permissions will be loaded here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-link" data-bs-dismiss="modal">Annulla</button>
                            <button type="submit" class="btn btn-primary">Salva</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    setupEventListeners();
    await loadData();
}

function setupEventListeners() {
    const addBtn = document.getElementById('btn-add-user');
    if (addBtn) {
        addBtn.addEventListener('click', () => openUserModal());
    }

    const form = document.getElementById('user-form');
    if (form) {
        form.addEventListener('submit', handleUserSubmit);
    }

    const superuserCheck = document.getElementById('user-superuser');
    if (superuserCheck) {
        superuserCheck.addEventListener('change', (e) => {
            const permSection = document.getElementById('permissions-section');
            permSection.style.display = e.target.checked ? 'none' : 'block';
        });
    }
}

async function loadData() {
    try {
        [users, permissions] = await Promise.all([
            apiGet('/auth/users'),
            apiGet('/auth/permissions').catch(() => [])
        ]);
        renderUsers();
    } catch (error) {
        showToast('Errore: ' + error.message, 'error');
    }
}

function renderUsers() {
    const tbody = document.getElementById('users-table-body');
    const canManage = checkPermission('users.manage');
    const currentUser = getUser();

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6">${emptyState('ti-users', 'Nessun utente')}</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <span class="avatar avatar-sm bg-${user.is_superuser ? 'red' : 'blue'}-lt me-2">
                        <i class="ti ti-${user.is_superuser ? 'crown' : 'user'}"></i>
                    </span>
                    <div>
                        <div class="font-weight-medium">${escapeHtml(user.username)}</div>
                        ${user.is_superuser ? '<small class="text-muted">Superuser</small>' : ''}
                    </div>
                </div>
            </td>
            <td>${user.email ? escapeHtml(user.email) : '<span class="text-muted">-</span>'}</td>
            <td>${user.is_superuser ? '<span class="badge bg-red">Admin</span>' : '<span class="badge bg-blue">Utente</span>'}</td>
            <td>${statusBadge(user.is_active)}</td>
            <td>${user.last_login ? formatDate(user.last_login) : '<span class="text-muted">Mai</span>'}</td>
            <td>
                ${canManage && user.username !== currentUser?.username ? `
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-ghost-primary btn-edit" data-username="${user.username}" title="Modifica">
                            <i class="ti ti-edit"></i>
                        </button>
                        <button class="btn btn-ghost-danger btn-delete" data-username="${user.username}" title="Elimina">
                            <i class="ti ti-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const user = users.find(u => u.username === btn.dataset.username);
            if (user) openUserModal(user);
        });
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const confirmed = await confirmDialog('Elimina Utente', 'Sei sicuro?', 'Elimina', 'btn-danger');
            if (confirmed) {
                try {
                    await apiDelete(`/auth/users/${btn.dataset.username}`);
                    showToast('Utente eliminato', 'success');
                    await loadData();
                } catch (error) {
                    showToast('Errore: ' + error.message, 'error');
                }
            }
        });
    });
}

function openUserModal(user = null) {
    editingUser = user;

    document.getElementById('user-modal-title').textContent = user ? 'Modifica Utente' : 'Nuovo Utente';
    document.getElementById('user-username').value = user?.username || '';
    document.getElementById('user-username').disabled = !!user;
    document.getElementById('user-email').value = user?.email || '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-password').required = !user;
    document.getElementById('password-label').classList.toggle('required', !user);
    document.getElementById('password-hint').textContent = user ? 'Lascia vuoto per non modificare' : 'Minimo 6 caratteri';
    document.getElementById('user-superuser').checked = user?.is_superuser || false;

    const permSection = document.getElementById('permissions-section');
    permSection.style.display = user?.is_superuser ? 'none' : 'block';

    const permList = document.getElementById('permissions-list');
    const userPerms = user?.permissions || [];
    permList.innerHTML = permissions.map(p => `
        <div class="col-md-6">
            <label class="form-check">
                <input class="form-check-input perm-check" type="checkbox" value="${p.slug}"
                       ${userPerms.includes(p.slug) ? 'checked' : ''}>
                <span class="form-check-label">${p.slug}</span>
                <small class="d-block text-muted">${escapeHtml(p.description)}</small>
            </label>
        </div>
    `).join('');

    new bootstrap.Modal(document.getElementById('user-modal')).show();
}

async function handleUserSubmit(e) {
    e.preventDefault();

    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-password').value;

    try {
        if (editingUser) {
            const updateData = {
                email: document.getElementById('user-email').value || null,
                is_superuser: document.getElementById('user-superuser').checked,
                is_active: true
            };
            if (password) updateData.password = password;

            await apiPatch(`/auth/users/${editingUser.username}`, updateData);

            if (!document.getElementById('user-superuser').checked) {
                const selectedPerms = [...document.querySelectorAll('.perm-check:checked')].map(c => c.value);
                await apiPut(`/auth/users/${editingUser.username}/permissions`, selectedPerms);
            }

            showToast('Utente aggiornato', 'success');
        } else {
            await apiPost('/auth/users', {
                username,
                password,
                email: document.getElementById('user-email').value || null,
                is_superuser: document.getElementById('user-superuser').checked
            });
            showToast('Utente creato', 'success');
        }

        bootstrap.Modal.getInstance(document.getElementById('user-modal')).hide();
        await loadData();
    } catch (error) {
        showToast('Errore: ' + error.message, 'error');
    }
}
