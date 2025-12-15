<?php
// instance.php
if (!isset($_GET['id']) || empty($_GET['id'])) {
    header('Location: index.php');
    exit;
}
require_once 'includes/header.php';
?>

<div id="notification-container"></div>

<div class="mb-4">
    <a href="index.php" class="btn btn-ghost-secondary">
        <i class="ti ti-arrow-left icon"></i> <?= __('back_to_dashboard') ?>
    </a>
</div>

<div class="d-flex justify-content-between align-items-center mb-3">
    <h2 id="current-instance-name">Caricamento...</h2>
    <div class="d-flex align-items-center">
        <span id="current-instance-port" class="me-2"></span>
        <span id="current-instance-subnet" class="me-2"></span>
        <?php if (in_array($currentRole, ['admin', 'partner'])): ?>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteInstancePrompt()">
                <i class="ti ti-trash"></i>
            </button>
        <?php endif; ?>
    </div>
</div>

<!-- Tabs Navigation -->
<ul class="nav nav-tabs mb-3" data-bs-toggle="tabs">
    <li class="nav-item">
        <a href="#tab-clients" class="nav-link active" data-bs-toggle="tab"><?= __('client_management') ?></a>
    </li>
    <li class="nav-item">
        <a href="#tab-routes" class="nav-link" data-bs-toggle="tab"><?= __('routes_and_dns') ?></a>
    </li>
    <li class="nav-item">
        <a href="#tab-firewall" class="nav-link" data-bs-toggle="tab"><?= __('firewall_acl') ?></a>
    </li>
</ul>

<div class="tab-content">

    <!-- Client Management Tab -->
    <div class="tab-pane active show" id="tab-clients">
        <?php if (in_array($currentRole, ['admin', 'partner', 'technician'])): ?>
            <div class="card mb-4">
                <div class="card-header">
                    <h3 class="card-title"><?= __('add_new_client') ?></h3>
                </div>
                <div class="card-body">
                    <form id="addClientForm" onsubmit="event.preventDefault(); createClient();">
                        <div class="row g-2">
                            <div class="col">
                                <input type="text" id="clientNameInput" class="form-control"
                                    placeholder="<?= __('client_name_placeholder') ?>" required>
                                <div class="invalid-feedback"><?= __('invalid_name_format') ?></div>
                            </div>
                            <div class="col-auto">
                                <button type="submit" class="btn btn-primary">
                                    <i class="ti ti-plus icon"></i> <?= __('create_client_btn') ?>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        <?php endif; ?>

        <div class="row">
            <div class="col-md-6">
                <div class="card mb-4" style="height: 400px; display: flex; flex-direction: column;">
                    <div class="card-header">
                        <h3 class="card-title"><?= __('available_clients') ?></h3>
                        <div class="card-actions">
                            <button class="btn btn-icon" onclick="fetchAndRenderClients()">
                                <i class="ti ti-refresh"></i>
                            </button>
                        </div>
                    </div>
                    <div class="table-responsive" style="flex: 1; overflow-y: auto;">
                        <table class="table table-vcenter card-table table-striped">
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th class="w-1"></th>
                                </tr>
                            </thead>
                            <tbody id="availableClientsTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="col-md-6">
                <div class="card mb-4" style="height: 400px; display: flex; flex-direction: column;">
                    <div class="card-header">
                        <h3 class="card-title"><?= __('connected_clients') ?></h3>
                        <div class="card-actions">
                            <button class="btn btn-icon" onclick="fetchAndRenderClients()">
                                <i class="ti ti-refresh"></i>
                            </button>
                        </div>
                    </div>
                    <div class="table-responsive" style="flex: 1; overflow-y: auto;">
                        <table class="table table-vcenter card-table table-striped">
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th><?= __('ip_addresses') ?></th>
                                    <th><?= __('traffic') ?></th>

                                    <th class="w-1"></th>
                                </tr>
                            </thead>
                            <tbody id="connectedClientsTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Routes Tab -->
    <div class="tab-pane" id="tab-routes">
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><?= __('custom_routes_dns') ?></h3>
                <div class="card-actions">
                    <?php if (in_array($currentRole, ['admin', 'partner', 'technician'])): ?>
                        <button class="btn btn-sm btn-primary" onclick="toggleRouteEdit()">
                            <i class="ti ti-edit"></i> <?= __('edit') ?>
                        </button>
                    <?php endif; ?>
                </div>
            </div>
            <div class="card-body">
                <!-- VIEW MODE -->
                <div id="routes-view-mode">
                    <div class="d-flex align-items-center mb-3">
                        <strong><?= __('mode_label') ?></strong>
                        <span id="tunnel-mode-display" class="badge bg-secondary ms-2">-</span>
                    </div>

                    <!-- DNS Display -->
                    <div id="dns-view-container" class="mb-3" style="display: none;">
                        <strong>DNS Servers:</strong> <span id="current-dns-display" class="text-muted">Default</span>
                    </div>

                    <div id="routes-list" class="list-group list-group-flush"></div>
                </div>

                <!-- EDIT MODE -->
                <div id="routes-edit-mode" style="display: none;">
                    <div class="mb-3">
                        <label class="form-label"><?= __('tunnel_mode') ?></label>
                        <select class="form-select" id="tunnel-mode-edit" onchange="toggleRouteConfigEdit()">
                            <option value="full">Full Tunnel</option>
                            <option value="split">Split Tunnel</option>
                        </select>
                    </div>

                    <div id="routes-edit-container"></div>

                    <button type="button" class="btn btn-sm btn-outline-primary mb-3" onclick="addRouteEdit()"
                        style="display: none;">
                        <i class="ti ti-plus"></i> <?= __('add_route') ?>
                    </button>

                    <div class="d-flex justify-content-end gap-2 mt-3">
                        <button class="btn btn-secondary" onclick="cancelRouteEdit()"><?= __('cancel') ?></button>
                        <button class="btn btn-success" onclick="saveRoutes()"><?= __('save_changes') ?></button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Firewall Tab (New) -->
    <div class="tab-pane" id="tab-firewall">
        <div class="card mb-3">
            <div class="card-header">
                <h3 class="card-title"><?= __('firewall_default_policy_title') ?></h3>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label"><?= __('firewall_initial_policy_label') ?></label>
                    <?php if (in_array($currentRole, ['admin', 'partner', 'technician'])): ?>
                        <select class="form-select" id="instance-firewall-default-policy">
                            <option value="ACCEPT">ACCEPT (Consenti tutto ciò che non è esplicitamente bloccato)</option>
                            <option value="DROP">DROP (Blocca tutto ciò che non è esplicitamente consentito)</option>
                        </select>
                    <?php else: ?>
                        <input type="text" class="form-control" id="instance-firewall-default-policy-display" readonly
                            value="<?= __('loading') ?>">
                        <input type="hidden" id="instance-firewall-default-policy">
                    <?php endif; ?>
                    <small class="form-hint"><?= __('firewall_policy_hint') ?></small>
                </div>
                <?php if (in_array($currentRole, ['admin', 'partner', 'technician'])): ?>
                    <button class="btn btn-primary" onclick="saveInstanceFirewallPolicy()"><?= __('save_policy') ?></button>
                <?php endif; ?>
            </div>
        </div>
        <div class="row row-cards">
            <!-- Sidebar: Groups List -->
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><?= __('groups') ?></h3>
                        <div class="card-actions">
                            <?php if (in_array($currentRole, ['admin', 'partner', 'technician'])): ?>
                                <a href="#" class="btn btn-sm btn-primary" data-bs-toggle="modal"
                                    data-bs-target="#modal-create-group">
                                    <i class="ti ti-plus"></i> <?= __('new') ?>
                                </a>
                            <?php endif; ?>
                        </div>
                    </div>
                    <div class="list-group list-group-flush" id="groups-list">
                        <div class="list-group-item text-center">Caricamento...</div>
                    </div>
                </div>
            </div>

            <!-- Main Content: Selected Group Details -->
            <div class="col-md-8">
                <div id="group-details-container" style="display: none;">
                    <!-- Members Card -->
                    <div class="card mb-3">
                        <div class="card-header">
                            <h3 class="card-title" id="selected-group-title"><?= __('members') ?></h3>
                            <div class="card-actions">
                                <?php if (in_array($currentRole, ['admin', 'partner', 'technician'])): ?>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCurrentGroup()"><?= __('delete_group') ?></button>
                                    <button class="btn btn-sm btn-primary" onclick="openAddMemberModal()"><?= __('add') ?></button>
                                <?php endif; ?>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-vcenter card-table">
                                    <thead>
                                        <tr>
                                            <th><?= __('user') ?></th>
                                            <th class="w-1"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="members-table-body"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Rules Card -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title"><?= __('firewall_rules') ?></h3>
                            <div class="card-actions">
                                <?php if (in_array($currentRole, ['admin', 'partner', 'technician'])): ?>
                                    <button class="btn btn-sm btn-primary" onclick="openCreateRuleModal()"><?= __('add_rule') ?></button>
                                <?php endif; ?>
                            </div>
                        </div>
                        <div class="card-table table-responsive">
                            <table class="table table-vcenter">
                                <thead>
                            <thead>
                                <tr>
                                    <th class="w-1"><i class="ti ti-grip-vertical"></i></th>
                                    <th><?= __('action') ?></th>
                                    <th>Proto</th>
                                    <th>Dest.</th>
                                    <th><?= __('port') ?></th>
                                    <th class="w-1"></th>
                                </tr>
                            </thead>
                            <tbody id="rules-table-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="no-group-selected" class="card card-body text-center py-5">
                <h3 class="text-muted"><?= __('select_group_msg') ?></h3>
            </div>
        </div>
    </div>
</div>
</div>

<!-- Modal Create Group -->
<div class="modal modal-blur fade" id="modal-create-group" tabindex="-1" role="dialog" aria-hidden="true">
<div class="modal-dialog modal-dialog-centered" role="document">
    <div class="modal-content">
        <div class="modal-header">
            <h5 class="modal-title"><?= __('new') . ' ' . __('group_name') // or just reuse existing ?></h5> 
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <div class="mb-3">
                <label class="form-label"><?= __('group_name') ?></label>
                <input type="text" class="form-control" id="group-name-input" placeholder="<?= __('group_name_placeholder') ?>">
            </div>
            <div class="mb-3">
                <label class="form-label"><?= __('description') ?></label>
                <input type="text" class="form-control" id="group-desc-input" placeholder="<?= __('group_desc_placeholder') ?>">
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
            <button type="button" class="btn btn-primary" onclick="createGroup()"><?= __('create_btn') // Create Group in lang it.php? No wait create_btn is Create Instance. ?>Crea Gruppo</button>
        </div>
    </div>
</div>
</div>

<!-- Modal Add Member -->
<div class="modal modal-blur fade" id="modal-add-member" tabindex="-1" role="dialog" aria-hidden="true">
<div class="modal-dialog modal-dialog-centered" role="document">
    <div class="modal-content">
        <div class="modal-header">
            <h5 class="modal-title"><?= __('add') . ' ' . __('members') // Simplification ?></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <div class="mb-3">
                <label class="form-label">Seleziona Cliente</label>
                <select class="form-select" id="member-select">
                    <option value=""><?= __('loading') ?></option>
                </select>
                <small class="form-hint">Vengono mostrati solo i client di questa istanza.</small>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
            <button type="button" class="btn btn-primary" onclick="addMember()"><?= __('add') ?></button>
        </div>
        </div>
    </div>
</div>


<!-- Modal Add Rule -->
<div class="modal modal-blur fade" id="modal-add-rule" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><?= __('new_firewall_rule') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="addRuleForm">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label"><?= __('action_label') ?></label>
                            <select class="form-select" id="rule-action" name="action">
                                <option value="ACCEPT">ACCEPT (<?= __('allow') ?>)</option>
                                <option value="DROP">DROP (<?= __('block') ?>)</option>
                                <option value="REJECT">REJECT (<?= __('reject') ?>)</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label"><?= __('protocol_label') ?></label>
                            <select class="form-select" id="rule-proto" name="protocol"
                                onchange="togglePortInput(this.value, 'add')">
                                <option value="tcp">TCP</option>
                                <option value="udp">UDP</option>
                                <option value="icmp">ICMP</option>
                                <option value="all"><?= __('all') ?> (ALL)</option>
                            </select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><?= __('destination_label') ?></label>
                        <input type="text" class="form-control" id="rule-dest" name="destination"
                            placeholder="0.0.0.0/0 per tutto, o 192.168.1.50">
                        <div class="invalid-feedback"><?= __('rule_dest_invalid') ?></div>
                    </div>
                    <div class="mb-3" id="port-container">
                        <label class="form-label"><?= __('port_label') ?> (<?= __('optional') ?>)</label>
                        <input type="text" class="form-control" id="rule-port" name="port"
                            placeholder="80, 443, 1000:2000">
                        <div class="invalid-feedback"><?= __('rule_port_invalid') ?></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><?= __('description') ?></label>
                        <input type="text" class="form-control" id="rule-desc" name="description">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                <button type="button" class="btn btn-primary" onclick="createRule()"><?= __('add_rule') ?></button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Edit Rule -->
<div class="modal modal-blur fade" id="modal-edit-rule" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><?= __('edit_firewall_rule') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editRuleForm">
                    <input type="hidden" id="rule-id" name="id">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label"><?= __('action_label') ?></label>
                            <select class="form-select" id="edit-rule-action" name="action">
                                <option value="ACCEPT">ACCEPT (<?= __('allow') ?>)</option>
                                <option value="DROP">DROP (<?= __('block') ?>)</option>
                                <option value="REJECT">REJECT (<?= __('reject') ?>)</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label"><?= __('protocol_label') ?></label>
                            <select class="form-select" id="edit-rule-proto" name="protocol"
                                onchange="togglePortInput('edit')">
                                <option value="tcp">TCP</option>
                                <option value="udp">UDP</option>
                                <option value="icmp">ICMP</option>
                                <option value="all"><?= __('all') ?> (ALL)</option>
                            </select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><?= __('destination_label') ?></label>
                        <input type="text" class="form-control" id="edit-rule-dest" name="destination"
                            placeholder="0.0.0.0/0 per tutto, o 192.168.1.50">
                        <div class="invalid-feedback"><?= __('rule_dest_invalid') ?></div>
                    </div>
                    <div class="mb-3" id="edit-port-container">
                        <label class="form-label"><?= __('port_label') ?> (<?= __('optional') ?>)</label>
                        <input type="text" class="form-control" id="edit-rule-port" name="port"
                            placeholder="80, 443, 1000:2000">
                        <div class="invalid-feedback"><?= __('rule_port_invalid') ?></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><?= __('description') ?></label>
                        <input type="text" class="form-control" id="edit-rule-desc" name="description">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                <button type="button" class="btn btn-primary" onclick="updateRule()"><?= __('save_changes') ?></button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Delete Rule Confirm -->
<div class="modal modal-blur fade" id="modal-delete-rule-confirm" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><?= __('confirm_delete_rule_title') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p><?= __('confirm_delete_rule_body') ?></p>
                <div id="delete-rule-summary" class="mb-3"></div>
                <p class="text-muted"><?= __('action_cannot_be_undone') ?></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                <button type="button" class="btn btn-danger" id="confirm-delete-rule-button" data-bs-dismiss="modal"><?= __('yes_delete') ?></button>
            </div>
        </div>
    </div>
</div>


<!-- Modal Tunnel Change Confirm -->
<div class="modal modal-blur fade" id="modal-tunnel-change-confirm" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title text-warning"><?= __('tunnel_change_title') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div id="modal-tunnel-change-body-content">
                    <!-- Dynamic content will be injected here -->
                    <p><?= __('tunnel_change_body') ?></p>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                <button type="button" class="btn btn-warning" id="confirm-tunnel-change-btn" data-bs-dismiss="modal"><?= __('yes_apply') ?></button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Revoke Member Confirm -->
<div class="modal modal-blur fade" id="modal-revoke-member-confirm" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><?= __('revoke_member_title') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p><?= __('revoke_member_msg') ?> <strong id="revoke-member-name"></strong>?</p>
                <p class="text-muted"><?= __('revoke_member_hint') ?></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                <button type="button" class="btn btn-danger" id="confirm-revoke-member-btn" data-bs-dismiss="modal"><?= __('yes_remove') ?></button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Revoke Confirm -->
<div class="modal modal-blur fade" id="modal-revoke-confirm" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><?= __('revoke_access_confirm') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p><?= __('revoke_access_msg') ?> <strong id="revoke-client-name"></strong>?</p>
                <p class="text-muted"><?= __('revoke_access_hint') ?></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                <button type="button" class="btn btn-danger" id="confirm-revoke-button" data-bs-dismiss="modal"><?= __('yes_revoke') ?></button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Delete Instance -->
<div class="modal modal-blur fade" id="modal-delete-instance" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><?= __('confirm_delete_instance_title') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <?= __('confirm_delete_instance_msg') ?>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                <button type="button" class="btn btn-danger" onclick="deleteInstanceAction()"
                    data-bs-dismiss="modal"><?= __('yes_delete') ?></button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Share Client (Email) -->
<div class="modal modal-blur fade" id="modal-share-client" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><?= __('send_config_email') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p class="text-muted"><?= __('send_config_email_body') ?> <strong id="share-client-name"></strong> <?= __('to_configure_device') ?></p>
                <div class="mb-3">
                    <label class="form-label"><?= __('email_placeholder') ?></label>
                    <input type="email" class="form-control" id="share-client-email" placeholder="user@example.com">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                <button type="button" class="btn btn-primary" id="btn-share-client-confirm">
                    <i class="ti ti-mail me-2"></i> <?= __('send_email_btn') ?>
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Connect Mobile (QR) -->
<div class="modal modal-blur fade" id="modal-connect-mobile" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><?= __('connect_mobile_title') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="markdown">
                    <ol>
                        <li>
                            <strong><?= __('install_wireguard_app') ?>:</strong>
                            <div class="mt-2 mb-3">
                                <a href="https://itunes.apple.com/us/app/wireguard/id1441195209?ls=1&mt=8"
                                    target="_blank" class="btn btn-dark btn-sm me-2">
                                    <i class="ti ti-brand-apple"></i> App Store
                                </a>
                                <a href="https://play.google.com/store/apps/details?id=com.wireguard.android"
                                    target="_blank" class="btn btn-success btn-sm">
                                    <i class="ti ti-brand-android"></i> Play Store
                                </a>
                            </div>
                        </li>
                        <li><?= __('open_app_instruction') ?></li>
                        <li><?= __('scan_qr_instruction') ?></li>
                    </ol>
                </div>
                <div id="qrcode-container" class="my-3 d-flex justify-content-center"></div>
            </div>
        </div>
    </div>
</div>

<!-- Modal Connect Desktop (Download) -->
<div class="modal modal-blur fade" id="modal-connect-desktop" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><?= __('connect_desktop_title') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="markdown">
                    <ol>
                        <li>
                            <strong><?= __('install_wireguard_client') ?>:</strong>
                            <div class="mt-2 mb-3">
                                <a href="https://download.wireguard.com/windows-client/wireguard-installer.exe"
                                    class="btn btn-ghost-primary btn-sm" target="_blank">
                                    <i class="ti ti-brand-windows"></i> Windows
                                </a>
                                <a href="https://itunes.apple.com/us/app/wireguard/id1451685025?ls=1&mt=12"
                                    class="btn btn-ghost-dark btn-sm" target="_blank">
                                    <i class="ti ti-brand-apple"></i> macOS
                                </a>
                                <a href="https://www.wireguard.com/install/" class="btn btn-ghost-warning btn-sm"
                                    target="_blank">
                                    <i class="ti ti-brand-ubuntu"></i> Linux
                                </a>
                            </div>
                        </li>
                        <li>
                            <strong><?= __('download_config_step') ?></strong>
                            <div class="mt-2 mb-3">
                                <button id="btn-download-config-action" class="btn btn-primary w-100">
                                    <i class="ti ti-download me-2"></i> <?= __('download_profile_conf') ?>
                                </button>
                            </div>
                        </li>
                        <li><?= __('import_tunnel_instruction') ?></li>
                        <li><?= __('activate_tunnel_instruction') ?></li>
                    </ol>
                </div>
            </div>
        </div>
    </div>
</div>


<script>
    const currentUserRole = '<?= $currentRole ?>';
</script>
<?php
$extra_scripts = ['js/qrcode.min.js', 'js/instance.js', 'js/firewall.js'];
require_once 'includes/footer.php';
?>