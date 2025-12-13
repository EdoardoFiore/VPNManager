<?php
require_once 'api_client.php';
// Header includes session check
require_once 'includes/header.php';

// Enforce Admin Role
if (($_SESSION['role'] ?? '') !== 'admin') {
    die('<div class="container text-center mt-5"><h1>403 Forbidden</h1><p>Access restricted to Administrators.</p></div>');
}

$error = '';
$success = '';

// Handle Create User
// Handle Create User
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $role = $_POST['role'] ?? 'viewer';
    $instance_ids = $_POST['instance_ids'] ?? [];

    // Validate: Technician and Viewer require at least one instance_id
    if (in_array($role, ['technician', 'viewer']) && empty($instance_ids)) {
        $error = "Binding to at least one instance is required for Technicians and Viewers.";
    } elseif ($username && $password) {
        $result = create_user($username, $password, $role, $instance_ids);
        if ($result['success']) {
            $success = "User '$username' created successfully.";
        } else {
            $error = $result['body']['detail'] ?? 'Failed to create user.';
        }
    } else {
        $error = "Username and Password are required.";
    }
}

// Handle Update User (Full)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_user_full') {
    $username = $_POST['username'] ?? '';
    $role = $_POST['role'] ?? '';
    $instance_ids = $_POST['instance_ids'] ?? [];
    $password = $_POST['password'] ?? ''; // Optional

    $data = ['role' => $role, 'instance_ids' => $instance_ids];
    if (!empty($password)) {
        $data['password'] = $password;
    }

    if ($username && $role) {
        if (in_array($role, ['technician', 'viewer']) && empty($instance_ids)) {
            $error = "Binding to at least one instance is required for Technicians and Viewers.";
        } else {
            $result = update_user($username, $data);
            if ($result['success']) {
                $success = "User '$username' updated successfully.";
            } else {
                $error = $result['body']['detail'] ?? 'Failed to update user.';
            }
        }
    } else {
        $error = "Missing required fields for update.";
    }
}

// Handle Update Password (Specific - kept for compatibility if needed, but update_user_full covers it)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_password') {
    $username = $_POST['username'] ?? '';
    $new_password = $_POST['new_password'] ?? '';
    // ... logic redundant but okay to keep if UI exposes it separately
    if ($username && $new_password) {
        $result = update_user($username, ['password' => $new_password]);
        if ($result['success']) {
            $success = "Password updated.";
        } else {
            $error = $result['body']['detail'] ?? 'Failed.';
        }
    }
}

// Fetch Users and Instances
$usersResponse = get_users();
$users = ($usersResponse['success'] && is_array($usersResponse['body'])) ? $usersResponse['body'] : [];

$instancesResponse = get_instances();
$instances = ($instancesResponse['success'] && is_array($instancesResponse['body'])) ? $instancesResponse['body'] : [];
?>

<div class="page-wrapper">
    <div class="container-xl">
        <div class="page-header d-print-none">
            <div class="row align-items-center">
                <div class="col">
                    <h2 class="page-title">
                        Gestione Utenti
                    </h2>
                </div>
                <div class="col-auto ms-auto d-print-none">
                    <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modal-user"
                        onclick="resetUserModal()">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24"
                            stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round"
                            stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Nuovo Utente
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="page-body">
        <div class="container-xl">
            <?php if ($error): ?>
                <div class="alert alert-danger alert-dismissible" role="alert">
                    <div class="d-flex">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon alert-icon" width="24" height="24"
                                viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"
                                stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <circle cx="12" cy="12" r="9" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <div>
                            <h4 class="alert-title">Errore</h4>
                            <div class="text-secondary"><?= htmlspecialchars($error) ?></div>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
            <?php if ($success): ?>
                <div class="alert alert-success alert-dismissible" role="alert">
                    <div class="d-flex">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon alert-icon" width="24" height="24"
                                viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"
                                stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <path d="M5 12l5 5l10 -10" />
                            </svg>
                        </div>
                        <div>
                            <h4 class="alert-title">Successo</h4>
                            <div class="text-secondary"><?= htmlspecialchars($success) ?></div>
                        </div>
                    </div>
                </div>
            <?php endif; ?>

            <div class="card">
                <div class="table-responsive">
                    <table class="table card-table table-vcenter text-nowrap datatable">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Instances</th>
                                <th>Status</th>
                                <th class="w-1">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($users as $user): ?>
                                <?php
                                $displayRole = $user['role'];
                                if ($displayRole === 'admin_readonly') {
                                    $displayRole = 'Admin Read Only';
                                } else {
                                    $displayRole = ucfirst($displayRole);
                                }

                                $userInstanceNames = [];
                                if (!empty($user['instance_ids'])) {
                                    foreach ($user['instance_ids'] as $iid) {
                                        foreach ($instances as $inst) {
                                            if ($inst['id'] === $iid) {
                                                $userInstanceNames[] = $inst['name'];
                                                break;
                                            }
                                        }
                                    }
                                }
                                ?>
                                <tr>
                                    <td><?= htmlspecialchars($user['username']) ?></td>
                                    <td>
                                        <span class="badge bg-blue-lt"><?= htmlspecialchars($displayRole) ?></span>
                                    </td>
                                    <td>
                                        <?php if (empty($userInstanceNames)): ?>
                                            <span class="text-muted">-</span>
                                        <?php else: ?>
                                            <?php foreach ($userInstanceNames as $iname): ?>
                                                <span class="badge badge-outline text-azure"><?= htmlspecialchars($iname) ?></span>
                                            <?php endforeach; ?>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <?php if ($user['is_active']): ?>
                                            <span class="status status-green">Active</span>
                                        <?php else: ?>
                                            <span class="status status-red">Inactive</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <div class="btn-list flex-nowrap">
                                            <button class="btn btn-primary btn-icon btn-sm"
                                                onclick='openEditUserModal(<?= json_encode($user) ?>)' title="Edit User">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24"
                                                    viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"
                                                    stroke-linecap="round" stroke-linejoin="round">
                                                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                                    <path d="M9 7h-3a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-3" />
                                                    <path d="M9 15h3l8.5 -8.5a1.5 1.5 0 0 0 -3 -3l-8.5 8.5v3" />
                                                    <line x1="16" y1="5" x2="19" y2="8" />
                                                </svg>
                                            </button>
                                            <?php if ($user['username'] !== 'admin' && $user['username'] !== $_SESSION['username']): ?>
                                                <a href="?delete=<?= urlencode($user['username']) ?>"
                                                    class="btn btn-danger btn-sm"
                                                    onclick="return confirm('Are you sure?')">Delete</a>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal User (Create/Edit) -->
<div class="modal modal-blur fade" id="modal-user" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <form action="users.php" method="post" id="user-form">
                <input type="hidden" name="action" id="form-action" value="create">
                <!-- Username is hidden for edit, displayed for create -->

                <div class="modal-header">
                    <h5 class="modal-title" id="modal-user-title">Nuovo Utente</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Username</label>
                        <input type="text" class="form-control" name="username" id="user-username" required>
                        <div class="form-control-plaintext" id="user-username-display"
                            style="display: none; font-weight: bold;"></div>
                        <small class="form-hint" id="username-hint">Non potrà essere cambiato successivamente.</small>
                    </div>
                    <div class="mb-3">
                        <label class="form-label" id="password-label">Password</label>
                        <input type="password" class="form-control" name="password" id="user-password" required>
                        <small class="form-hint" id="password-hint" style="display: none;">Lascia vuoto per mantenere la
                            password attuale.</small>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Ruolo</label>
                        <select class="form-select" name="role" id="user-role-select" onchange="toggleInstanceSelect()">
                            <option value="viewer">Viewer (Scoped Read-Only)</option>
                            <option value="technician">Technician (Scoped Management)</option>
                            <option value="partner">Partner (Full VPN Mgmt)</option>
                            <option value="admin_readonly">Admin Read Only (Global View)</option>
                            <option value="admin">Admin (Full System)</option>
                        </select>
                        <!-- Legend Omitted for brevity, kept structure -->
                    </div>
                    <!-- Instance Select (Checkbox List) -->
                    <div class="mb-3" id="instance-select-container" style="display: none;">
                        <label class="form-label">Assegna Istanze</label>
                        <div class="card p-2" style="max-height: 200px; overflow-y: auto;">
                            <?php foreach ($instances as $inst): ?>
                                <label class="form-check">
                                    <input class="form-check-input instance-checkbox" type="checkbox" name="instance_ids[]"
                                        value="<?= htmlspecialchars($inst['id']) ?>">
                                    <span class="form-check-label">
                                        <?= htmlspecialchars($inst['name']) ?>
                                        <small class="text-muted ms-2">(<?= htmlspecialchars($inst['subnet']) ?>)</small>
                                    </span>
                                </label>
                            <?php endforeach; ?>
                        </div>
                        <small class="form-hint">Seleziona le istanze a cui questo utente può accedere.</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn me-auto" data-bs-dismiss="modal">Annulla</button>
                    <button type="submit" class="btn btn-primary" id="modal-submit-btn">Salva</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Modal Change Password -->
<div class="modal modal-blur fade" id="modal-update-password" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <form action="users.php" method="post">
                <input type="hidden" name="action" value="update_password">
                <input type="hidden" name="username" id="update-password-username">
                <div class="modal-header">
                    <h5 class="modal-title">Cambia Password per <span id="update-password-username-display"></span></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Nuova Password</label>
                        <input type="password" class="form-control" name="new_password" required>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn me-auto" data-bs-dismiss="modal">Annulla</button>
                    <button type="submit" class="btn btn-primary">Aggiorna Password</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
    function toggleInstanceSelect() {
        const roleSelect = document.getElementById('user-role-select');
        const instanceContainer = document.getElementById('instance-select-container');

        if (['technician', 'viewer'].includes(roleSelect.value)) {
            instanceContainer.style.display = 'block';
        } else {
            instanceContainer.style.display = 'none';
        }
    }

    // Initial toggle on page load if needed (unlikely for modal but good practice)

    function resetUserModal() {
        document.getElementById('user-form').reset();
        document.getElementById('form-action').value = 'create';
        document.getElementById('modal-user-title').textContent = 'Nuovo Utente';
        document.getElementById('modal-submit-btn').textContent = 'Crea Utente';

        // Username Editable
        document.getElementById('user-username').style.display = 'block';
        document.getElementById('user-username').required = true;
        document.getElementById('user-username-display').style.display = 'none';
        document.getElementById('username-hint').style.display = 'block';

        // Password Required
        document.getElementById('user-password').required = true;
        document.getElementById('password-hint').style.display = 'none';

        // Uncheck all instances
        document.querySelectorAll('.instance-checkbox').forEach(cb => cb.checked = false);

        // Reset visibility
        toggleInstanceSelect();
    }

    // Bind to the "New User" button (need to update the HTML button to call this or use modal event)
    // Actually better to hook into modal show event if we want consistent reset
    var userModalEl = document.getElementById('modal-user');
    userModalEl.addEventListener('show.bs.modal', function (event) {
        // If relatedTarget is the "New User" button (we can identify by context or just check if we called openEdit)
        // Let's explicitly rely on a flag or just separate functions.
        // Simplest: The "New User" button in HTML triggers modal directly. We should add an onclick to it to reset.
    });

    function openEditUserModal(user) {
        // Reset first
        resetUserModal();

        // Set Edit Mode
        document.getElementById('form-action').value = 'update_user_full';
        document.getElementById('modal-user-title').textContent = 'Modifica Utente';
        document.getElementById('modal-submit-btn').textContent = 'Aggiorna Utente';

        // Username Readonly
        const usernameInput = document.getElementById('user-username');
        usernameInput.value = user.username;
        usernameInput.style.display = 'none'; // Hide input but keep value? No, if hidden it might not submit if disabled.
        // Better: type="hidden" or validation ignores it
        // Let's use the hidden input approach by setting value and making it readonly or using a separate hidden field.
        // But the form uses 'username'. If I hide it, it still submits.
        // If I disable it, it won't submit.
        // Solution: Keep the input, hide it, and use a separate display element. The input value submits.
        usernameInput.readOnly = true;

        const usernameDisplay = document.getElementById('user-username-display');
        usernameDisplay.textContent = user.username;
        usernameDisplay.style.display = 'block';
        document.getElementById('username-hint').style.display = 'none';

        // Password Optional
        document.getElementById('user-password').required = false;
        document.getElementById('password-hint').style.display = 'block';

        // Role
        document.getElementById('user-role-select').value = user.role;

        // Instances: Check the ones provided in user.instance_ids
        if (user.instance_ids && Array.isArray(user.instance_ids)) {
            user.instance_ids.forEach(id => {
                const cb = document.querySelector(`.instance-checkbox[value="${id}"]`);
                if (cb) cb.checked = true;
            });
        }

        toggleInstanceSelect();

        // Show Modal
        new bootstrap.Modal(document.getElementById('modal-user')).show();
    }
</script>

<script src="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta17/dist/js/tabler.min.js"></script>
</body>

</html>