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

// Handle Delete User
if (isset($_GET['delete'])) {
    $userToDelete = $_GET['delete'];
    if ($userToDelete === $_SESSION['username']) {
        $error = "You cannot delete yourself!";
    } else {
        $result = delete_user($userToDelete);
        if ($result['success']) {
            $success = "User deleted successfully.";
        } else {
            $error = $result['body']['detail'] ?? 'Failed to delete user.';
        }
    }
}

// Handle Update Password
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_password') {
    $username = $_POST['username'] ?? '';
    $new_password = $_POST['new_password'] ?? '';

    if ($username && $new_password) {
        // Only admin can do this page, verified above
        $result = update_user($username, ['password' => $new_password]);

        if ($result['success']) {
            $success = "Password for user '$username' updated successfully.";
        } else {
            $error = $result['body']['detail'] ?? 'Failed to update password.';
        }
    } else {
        $error = "Username and New Password are required.";
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
                    <button type="button" class="btn btn-primary" data-bs-toggle="modal"
                        data-bs-target="#modal-new-user">
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
                                <th>Status</th>
                                <th class="w-1">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($users as $user): ?>
                                <tr>
                                    <td><?= htmlspecialchars($user['username']) ?></td>
                                    <td>
                                        <span
                                            class="badge bg-blue-lt"><?= htmlspecialchars(ucfirst($user['role'])) ?></span>
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
                                            <button class="btn btn-secondary btn-icon btn-sm"
                                                onclick="openChangePasswordModal('<?= htmlspecialchars($user['username']) ?>')"
                                                title="Change Password">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24"
                                                    viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"
                                                    stroke-linecap="round" stroke-linejoin="round">
                                                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                                    <circle cx="8" cy="15" r="4" />
                                                    <line x1="10.85" y1="12.15" x2="19" y2="4" />
                                                    <line x1="18" y1="5" x2="20" y2="7" />
                                                    <line x1="15" y1="8" x2="17" y2="10" />
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

<!-- Modal New User -->
<div class="modal modal-blur fade" id="modal-new-user" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <form action="users.php" method="post">
                <input type="hidden" name="action" value="create">
                <div class="modal-header">
                    <h5 class="modal-title">Nuovo Utente</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Username</label>
                        <input type="text" class="form-control" name="username" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Password</label>
                        <input type="password" class="form-control" name="password" required>
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
                        <div class="form-hint mt-2">
                            <small>
                                <strong>Legenda Ruoli:</strong><br>
                                <ul>
                                    <li><strong>Admin:</strong> Accesso completo (Lettura/Scrittura Globale).</li>
                                    <li><strong>Admin Read Only:</strong> Accesso completo in sola lettura (Vede tutto,
                                        non modifica nulla).</li>
                                    <li><strong>Partner:</strong> Gestione COMPLETA di VPN e Client, ma NO accesso al
                                        sistema (Firewall Macchina/Rete).</li>
                                    <li><strong>Technician:</strong> Gestione (Start/Stop, Client, Regole) limitata alle
                                        sole istanze assegnate.</li>
                                    <li><strong>Viewer:</strong> Sola lettura limitata alle sole istanze assegnate.</li>
                                </ul>
                            </small>
                        </div>
                    </div>
                    <!-- Instance Select (Hidden by default unless Technician or Viewer is selected) -->
                    <div class="mb-3" id="instance-select-container" style="display: none;">
                        <label class="form-label">Assegna Istanze (Holding Ctrl/Cmd per selezione multipla)</label>
                        <select class="form-select" name="instance_ids[]" id="instance-select" multiple size="5">
                            <?php foreach ($instances as $inst): ?>
                                <option value="<?= htmlspecialchars($inst['id']) ?>"><?= htmlspecialchars($inst['name']) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <small class="form-hint">Obbligatorio per i ruoli Technician e Viewer.</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn me-auto" data-bs-dismiss="modal">Annulla</button>
                    <button type="submit" class="btn btn-primary">Crea Utente</button>
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
        const instanceSelect = document.getElementById('instance-select');

        if (['technician', 'viewer'].includes(roleSelect.value)) {
            instanceContainer.style.display = 'block';
            instanceSelect.required = true;
        } else {
            instanceContainer.style.display = 'none';
            instanceSelect.required = false;
            // Deselect all options
            for (let i = 0; i < instanceSelect.options.length; i++) {
                instanceSelect.options[i].selected = false;
            }
        }
    }

    function openChangePasswordModal(username) {
        document.getElementById('update-password-username').value = username;
        document.getElementById('update-password-username-display').textContent = username;
        new bootstrap.Modal(document.getElementById('modal-update-password')).show();
    }
</script>

<script src="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta17/dist/js/tabler.min.js"></script>
</body>

</html>