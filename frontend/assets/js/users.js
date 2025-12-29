// Permissions Modal (Dynamic)
function getPermissionsModalHtml() {
    return `
    <div class="modal modal-blur fade" id="modal-permissions" tabindex="-1" role="dialog" aria-hidden="true">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Manage Permissions: <span id="perm-username"></span></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
             <div id="permissions-list" class="row">
                <!-- Checkboxes injected here -->
                <div class="text-center"><div class="spinner-border"></div></div>
             </div>
          </div>
          <div class="modal-footer">
            <a href="#" class="btn btn-link link-secondary" data-bs-dismiss="modal">Cancel</a>
            <a href="#" class="btn btn-primary ms-auto" onclick="submitPermissions()">Save Changes</a>
          </div>
        </div>
      </div>
    </div>
    `;
}

// Store current user being edited
let currentUserEditId = null;

async function renderUsers() {
    // Add permission modal if not exists
    if (!document.getElementById('modal-permissions')) {
        document.body.insertAdjacentHTML('beforeend', getPermissionsModalHtml());
    }

    return `
    <div class="page-header d-print-none">
        <div class="row align-items-center">
            <div class="col">
                 <h2 class="page-title">User Management</h2>
            </div>
            <div class="col-auto ms-auto d-print-none">
                <button class="btn btn-primary" onclick="showAddUserModal()">
                    Create User
                </button>
            </div>
        </div>
    </div>
    
    <div class="row row-cards">
        <div class="col-12">
            <div class="card">
                <div class="table-responsive">
                    <table class="table table-vcenter card-table" id="table-users">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Permissions</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Modal User -->
    <div class="modal modal-blur fade" id="modal-user" tabindex="-1" role="dialog" aria-hidden="true">
      <div class="modal-dialog modal-sm" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">New User</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
             <form id="user-form">
                <div class="mb-3">
                    <label class="form-label">Username</label>
                    <input type="text" name="username" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input type="password" name="password" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label class="form-check">
                        <input type="checkbox" class="form-check-input" name="is_superuser" value="true">
                        <span class="form-check-label">Superuser (Admin)</span>
                    </label>
                </div>
             </form>
          </div>
          <div class="modal-footer">
            <a href="#" class="btn btn-link link-secondary" data-bs-dismiss="modal">Cancel</a>
            <a href="#" class="btn btn-primary ms-auto" onclick="submitUser()">Create</a>
          </div>
        </div>
      </div>
    </div>
    `;
}

async function initUsers() {
    try {
        const res = await fetch(`${API_BASE}/core/auth/`, { headers: getHeaders() });
        const users = await res.json();

        const tbody = document.querySelector('#table-users tbody');
        tbody.innerHTML = '';

        users.forEach(u => {
            const permCount = u.permissions ? u.permissions.length : 0;
            tbody.innerHTML += `
            <tr>
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td>${u.is_superuser ? '<span class="badge bg-purple">Admin</span>' : '<span class="badge bg-blue">User</span>'}</td>
                <td>${u.is_active ? '<span class="badge bg-green">Active</span>' : '<span class="badge bg-red">Inactive</span>'}</td>
                <td>
                    <a href="#" onclick="showPermissionsModal(${u.id}, '${u.username}')">${permCount} Permissions</a>
                </td>
                <td>
                     <button class="btn btn-sm btn-icon btn-ghost-danger" onclick="deleteUser(${u.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><line x1="4" y1="7" x2="20" y2="7" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
                    </button>
                </td>
            </tr>
            `;
        });
    } catch (e) {
        console.error(e);
        alert("Failed to load users");
    }
}

async function showPermissionsModal(userId, username) {
    currentUserEditId = userId;
    document.getElementById('perm-username').innerText = username;

    const modal = new bootstrap.Modal(document.getElementById('modal-permissions'));
    modal.show();

    // Load Available Permissions & User Permissions
    const listDiv = document.getElementById('permissions-list');
    listDiv.innerHTML = '<div class="text-center"><div class="spinner-border"></div></div>';

    try {
        // 1. Get All Permissions
        const resPerms = await fetch(`${API_BASE}/core/auth/permissions`, { headers: getHeaders() });
        const allPerms = await resPerms.json();

        // 2. Get User's Current Permissions (re-fetch user to be sure)
        // Optimization: We could pass them from initUsers but re-fetching is safer
        // For now, let's just re-fetch the user list logic or just implemented a get_user endpoint?
        // Router doesn't have get_user_by_id yet only list.
        // Let's assume we implement it or just iterate the list from memory if we cached it.
        // Actually, let's just list all users again and find this one.
        const resUsers = await fetch(`${API_BASE}/core/auth/`, { headers: getHeaders() });
        const users = await resUsers.json();
        const user = users.find(u => u.id === userId);
        const userPermIds = user.permissions.map(p => p.id);

        listDiv.innerHTML = '';
        if (allPerms.length === 0) {
            listDiv.innerHTML = '<div class="col-12">No granular permissions registered by modules yet.</div>';
        }

        allPerms.forEach(p => {
            const isChecked = userPermIds.includes(p.id) ? 'checked' : '';
            listDiv.innerHTML += `
             <div class="col-6">
                <label class="form-check">
                    <input type="checkbox" class="form-check-input perm-check" value="${p.id}" ${isChecked}>
                    <span class="form-check-label">${p.slug}</span>
                    <span class="form-check-description">${p.description}</span>
                </label>
             </div>
             `;
        });

    } catch (e) {
        listDiv.innerHTML = 'Error loading permissions';
        console.error(e);
    }
}

async function submitPermissions() {
    if (!currentUserEditId) return;

    const checkboxes = document.querySelectorAll('.perm-check:checked');
    const permIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    try {
        const res = await fetch(`${API_BASE}/core/auth/permissions/assign`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                user_id: currentUserEditId,
                permission_ids: permIds
            })
        });

        if (res.ok) {
            document.querySelector('#modal-permissions .btn-close').click();
            initUsers();
        } else {
            alert('Failed to save permissions');
        }
    } catch (e) {
        console.error(e);
        alert('Connection error');
    }
}

function showAddUserModal() {
    const modal = new bootstrap.Modal(document.getElementById('modal-user'));
    modal.show();
}

async function submitUser() {
    const form = document.getElementById('user-form');
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => data[key] = value);
    data.is_superuser = !!data.is_superuser;

    try {
        const res = await fetch(`${API_BASE}/core/auth/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });

        if (res.ok) {
            document.querySelector('#modal-user .btn-close').click();
            initUsers();
        } else {
            const err = await res.json();
            alert('Error: ' + (err.detail || 'Unknown'));
        }
    } catch (e) {
        console.error(e);
        alert('Connection Error');
    }
}

async function deleteUser(id) {
    if (!confirm("Permantently delete user?")) return;

    try {
        const res = await fetch(`${API_BASE}/core/auth/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        if (res.ok) {
            initUsers();
        } else {
            const err = await res.json();
            alert('Error: ' + err.detail);
        }
    } catch (e) {
        alert('Connection Error');
    }
}
