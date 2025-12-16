<?php
// machine_settings.php
require_once 'includes/header.php';
?>

<div id="notification-container"></div>

<div class="mb-4">
    <a href="index.php" class="btn btn-ghost-secondary">
        <i class="ti ti-arrow-left icon"></i> <?= __('back_to_dashboard') ?>
    </a>
</div>

<div class="d-flex justify-content-between align-items-center mb-3">
    <h2><?= __('machine_settings_title') ?></h2>
</div>

<!-- Tabs Navigation -->
<ul class="nav nav-tabs mb-3" data-bs-toggle="tabs">
    <li class="nav-item">
        <a href="#tab-machine-firewall" class="nav-link active" data-bs-toggle="tab"><?= __('firewall_global') ?></a>
    </li>
    <li class="nav-item">
        <a href="#tab-network-interfaces" class="nav-link" data-bs-toggle="tab"><?= __('network_interfaces') ?></a>
    </li>
</ul>

<div class="tab-content">

    <!-- Machine Firewall Tab -->
    <div class="tab-pane active show" id="tab-machine-firewall">

        <!-- Toolbar -->
        <div class="mb-3 d-flex justify-content-end">
            <button class="btn btn-primary" id="btn-add-machine-rule" data-bs-toggle="modal"
                data-bs-target="#modal-add-machine-rule">
                <i class="ti ti-plus"></i> <?= __('new_rule_btn') ?>
            </button>
        </div>

        <!-- INPUT Rules -->
        <div class="card mb-3">
            <div class="card-header">
                <h3 class="card-title"><?= __('input_rules') ?></h3>
            </div>
            <div class="card-table table-responsive">
                <table class="table table-vcenter table-hover">
                    <thead>
                        <tr>
                            <th class="w-1"></th>
                            <th><?= __('action_label') ?></th>
                            <th>Proto</th>
                            <th><?= __('source_label') ?></th>
                            <th><?= __('destination_label') ?></th>
                            <th><?= __('port_label') ?></th>
                            <th><?= __('in_interface_label') ?></th>
                            <th><?= __('comment_label') ?></th>
                            <th class="w-1"></th>
                        </tr>
                    </thead>
                    <tbody id="machine-firewall-rules-input-body" data-chain-group="INPUT">
                        <tr>
                            <td colspan="9" class="text-center text-muted"><?= __('loading') ?></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- OUTPUT Rules -->
        <div class="card mb-3">
            <div class="card-header">
                <h3 class="card-title"><?= __('output_rules') ?></h3>
            </div>
            <div class="card-table table-responsive">
                <table class="table table-vcenter table-hover">
                    <thead>
                        <tr>
                            <th class="w-1"></th>
                            <th><?= __('action_label') ?></th>
                            <th>Proto</th>
                            <th><?= __('source_label') ?></th>
                            <th><?= __('destination_label') ?></th>
                            <th><?= __('port_label') ?></th>
                            <th><?= __('out_interface_label') ?></th>
                            <th><?= __('comment_label') ?></th>
                            <th class="w-1"></th>
                        </tr>
                    </thead>
                    <tbody id="machine-firewall-rules-output-body" data-chain-group="OUTPUT">
                        <tr>
                            <td colspan="9" class="text-center text-muted"><?= __('loading') ?></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- FORWARD Rules -->
        <div class="card mb-3">
            <div class="card-header">
                <h3 class="card-title"><?= __('forward_rules') ?></h3>
            </div>
            <div class="card-table table-responsive">
                <table class="table table-vcenter table-hover">
                    <thead>
                        <tr>
                            <th class="w-1"></th>
                            <th><?= __('action_label') ?></th>
                            <th>Proto</th>
                            <th><?= __('source_label') ?></th>
                            <th><?= __('destination_label') ?></th>
                            <th><?= __('port_label') ?></th>
                            <th><?= __('in_interface_label') ?></th>
                            <th><?= __('out_interface_label') ?></th>
                            <th><?= __('comment_label') ?></th>
                            <th class="w-1"></th>
                        </tr>
                    </thead>
                    <tbody id="machine-firewall-rules-forward-body" data-chain-group="FORWARD">
                        <tr>
                            <td colspan="10" class="text-center text-muted"><?= __('loading') ?></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- OTHER Rules (NAT, Mangle, etc) -->
        <div class="card mb-3">
            <div class="card-header">
                <h3 class="card-title"><?= __('other_rules') ?></h3>
            </div>
            <div class="card-table table-responsive">
                <table class="table table-vcenter table-hover">
                    <thead>
                        <tr>
                            <th class="w-1"></th>
                            <th><?= __('table_label') ?></th>
                            <th><?= __('chain_label') ?></th>
                            <th><?= __('action_label') ?></th>
                            <th>Proto</th>
                            <th><?= __('source_label') ?></th>
                            <th><?= __('destination_label') ?></th>
                            <th><?= __('port_label') ?></th>
                            <th><?= __('comment_label') ?></th>
                            <th class="w-1"></th>
                        </tr>
                    </thead>
                    <tbody id="machine-firewall-rules-other-body" data-chain-group="OTHER">
                        <tr>
                            <td colspan="10" class="text-center text-muted"><?= __('loading') ?></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

    </div>

    <!-- Network Interfaces Tab -->
    <div class="tab-pane" id="tab-network-interfaces">
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><?= __('machine_network_interfaces') ?></h3>
                <div class="card-actions">
                    <button class="btn btn-sm btn-primary" onclick="loadNetworkInterfaces()">
                        <i class="ti ti-refresh"></i> <?= __('refresh') ?>
                    </button>
                </div>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-vcenter card-table">
                        <thead>
                            <tr>
                                <th><?= __('interface') ?></th>
                                <th><?= __('mac_address') ?></th>
                                <th><?= __('link_status') ?></th>
                                <th><?= __('ip_address') ?></th>
                                <th><?= __('cidr') ?></th>
                                <th><?= __('netmask') ?></th>
                                <th class="w-1"></th>
                            </tr>
                        </thead>
                        <tbody id="network-interfaces-table-body">
                            <tr>
                                <td colspan="7" class="text-center text-muted"><?= __('loading_interfaces') ?></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal Add Machine Firewall Rule -->
<div class="modal modal-blur fade" id="modal-add-machine-rule" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><?= __('new_global_firewall_rule') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="addMachineRuleForm">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label d-flex align-items-center"><?= __('table_label') ?>
                                <span class="ms-2" data-bs-toggle="popover" data-bs-trigger="hover"
                                    title="<?= __('table_label') ?>"
                                    data-bs-content="<?= __('table_help') ?>">
                                    <i class="ti ti-help-circle"></i>
                                </span>
                            </label>
                            <select class="form-select" name="table">
                                <option value="filter">filter</option>
                                <option value="nat">nat</option>
                                <option value="mangle">mangle</option>
                                <option value="raw">raw</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label d-flex align-items-center"><?= __('chain_label') ?>
                                <span class="ms-2" data-bs-toggle="popover" data-bs-trigger="hover" title="<?= __('chain_label') ?>"
                                    data-bs-content="<?= __('chain_help') ?>">
                                    <i class="ti ti-help-circle"></i>
                                </span>
                            </label>
                            <select class="form-select" name="chain" required>
                                <!-- Options will be populated dynamically by JavaScript -->
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label d-flex align-items-center"><?= __('action_label') ?>
                                <span class="ms-2" data-bs-toggle="popover" data-bs-trigger="hover" title="<?= __('action_label') ?>"
                                    data-bs-content="<?= __('action_help') ?>">
                                    <i class="ti ti-help-circle"></i>
                                </span>
                            </label>
                            <select class="form-select" name="action">
                                <option value="ACCEPT">ACCEPT</option>
                                <option value="DROP">DROP</option>
                                <option value="REJECT">REJECT</option>
                                <option value="MASQUERADE">MASQUERADE</option>
                                <option value="SNAT">SNAT</option>
                                <option value="DNAT">DNAT</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label d-flex align-items-center"><?= __('protocol_label') ?>
                                <span class="ms-2" data-bs-toggle="popover" data-bs-trigger="hover" title="<?= __('protocol_label') ?>"
                                    data-bs-content="<?= __('protocol_help') ?>">
                                    <i class="ti ti-help-circle"></i>
                                </span>
                            </label>
                            <select class="form-select" name="protocol"
                                onchange="toggleMachinePortInput(this.value, 'add')">
                                <option value="">all</option>
                                <option value="tcp">tcp</option>
                                <option value="udp">udp</option>
                                <option value="icmp">icmp</option>
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label d-flex align-items-center"><?= __('source_label') ?>
                                <span class="ms-2" data-bs-toggle="popover" data-bs-trigger="hover" title="<?= __('source_label') ?>"
                                    data-bs-content="<?= __('source_help') ?>">
                                    <i class="ti ti-help-circle"></i>
                                </span>
                            </label>
                            <input type="text" class="form-control" name="source" placeholder="any o 192.168.1.0/24">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label d-flex align-items-center"><?= __('destination_label') ?>
                                <span class="ms-2" data-bs-toggle="popover" data-bs-trigger="hover"
                                    title="<?= __('destination_label') ?>"
                                    data-bs-content="<?= __('destination_help') ?>">
                                    <i class="ti ti-help-circle"></i>
                                </span>
                            </label>
                            <input type="text" class="form-control" name="destination" placeholder="any o 8.8.8.8">
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4 mb-3" id="machine-port-container-add" style="display: none;">
                            <label class="form-label d-flex align-items-center"><?= __('port_label') ?>
                                <span class="ms-2" data-bs-toggle="popover" data-bs-trigger="hover" title="<?= __('port_label') ?>"
                                    data-bs-content="<?= __('port_help') ?>">
                                    <i class="ti ti-help-circle"></i>
                                </span>
                            </label>
                            <input type="text" class="form-control" name="port" placeholder="80, 443, 1000:2000">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label d-flex align-items-center"><?= __('in_interface_label') ?>
                                <span class="ms-2" data-bs-toggle="popover" data-bs-trigger="hover"
                                    title="<?= __('in_interface_label') ?>"
                                    data-bs-content="<?= __('in_interface_help') ?>">
                                    <i class="ti ti-help-circle"></i>
                                </span>
                            </label>
                            <input type="text" class="form-control" name="in_interface" placeholder="eth0, tun+">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label d-flex align-items-center"><?= __('out_interface_label') ?>
                                <span class="ms-2" data-bs-toggle="popover" data-bs-trigger="hover"
                                    title="<?= __('out_interface_label') ?>"
                                    data-bs-content="<?= __('out_interface_help') ?>">
                                    <i class="ti ti-help-circle"></i>
                                </span>
                            </label>
                            <input type="text" class="form-control" name="out_interface" placeholder="eth0, tun+">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label d-flex align-items-center"><?= __('connection_state_label') ?>
                            <span class="ms-2" data-bs-toggle="popover" data-bs-trigger="hover"
                                title="<?= __('connection_state_label') ?>"
                                data-bs-content="<?= __('state_help') ?>">
                                <i class="ti ti-help-circle"></i>
                            </span>
                        </label>
                        <input type="text" class="form-control" name="state" placeholder="NEW,ESTABLISHED,RELATED">
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><?= __('comment_label') ?></label>
                        <input type="text" class="form-control" name="comment" placeholder="<?= __('iptables_description') ?>">
                    </div>
                </form>

                <div class="mt-4">
                    <label class="form-label"><?= __('iptables_preview') ?></label>
                    <pre class="code-block"
                        style="background-color: #f5f7fb; padding: 10px; border-radius: 4px; font-family: 'Consolas', monospace; font-size: 13px; color: #333;"><code id="iptables-preview-add">iptables -t filter -A INPUT -j ACCEPT</code></pre>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                <button type="button" class="btn btn-primary" onclick="addMachineFirewallRule()"><?= __('add_rule') ?></button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Edit Machine Firewall Rule -->
<div class="modal modal-blur fade" id="modal-edit-machine-rule" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><?= __('edit_global_firewall_rule') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editMachineRuleForm">
                    <input type="hidden" name="id">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label"><?= __('table_label') ?></label>
                            <select class="form-select" name="table">
                                <option value="filter">filter</option>
                                <option value="nat">nat</option>
                                <option value="mangle">mangle</option>
                                <option value="raw">raw</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label"><?= __('chain_label') ?></label>
                            <select class="form-select" name="chain" required>
                                <!-- Options populated by JS -->
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label"><?= __('action_label') ?></label>
                            <select class="form-select" name="action">
                                <option value="ACCEPT">ACCEPT</option>
                                <option value="DROP">DROP</option>
                                <option value="REJECT">REJECT</option>
                                <option value="MASQUERADE">MASQUERADE</option>
                                <option value="SNAT">SNAT</option>
                                <option value="DNAT">DNAT</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label"><?= __('protocol_label') ?></label>
                            <select class="form-select" name="protocol"
                                onchange="toggleMachinePortInput(this.value, 'edit')">
                                <option value="">all</option>
                                <option value="tcp">tcp</option>
                                <option value="udp">udp</option>
                                <option value="icmp">icmp</option>
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label"><?= __('source_label') ?></label>
                            <input type="text" class="form-control" name="source" placeholder="any o 192.168.1.0/24">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label"><?= __('destination_label') ?></label>
                            <input type="text" class="form-control" name="destination" placeholder="any o 8.8.8.8">
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4 mb-3" id="machine-port-container-edit" style="display: none;">
                            <label class="form-label"><?= __('port_label') ?></label>
                            <input type="text" class="form-control" name="port" placeholder="80, 443, 1000:2000">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label"><?= __('in_interface_label') ?></label>
                            <input type="text" class="form-control" name="in_interface" placeholder="eth0, tun+">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label"><?= __('out_interface_label') ?></label>
                            <input type="text" class="form-control" name="out_interface" placeholder="eth0, tun+">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><?= __('connection_state_label') ?></label>
                        <input type="text" class="form-control" name="state" placeholder="NEW,ESTABLISHED,RELATED">
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><?= __('comment_label') ?></label>
                        <input type="text" class="form-control" name="comment" placeholder="<?= __('iptables_description') ?>">
                    </div>
                </form>

                <div class="mt-4">
                    <label class="form-label"><?= __('iptables_preview') ?></label>
                    <pre class="code-block"
                        style="background-color: #f5f7fb; padding: 10px; border-radius: 4px; font-family: 'Consolas', monospace; font-size: 13px; color: #333;"><code id="iptables-preview-edit"></code></pre>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                <button type="button" class="btn btn-primary" onclick="updateMachineFirewallRule()"><?= __('save_changes') ?></button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Confirm Delete Machine Rule -->
<div class="modal modal-blur fade" id="modal-confirm-delete-machine-rule" tabindex="-1" role="dialog"
    aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><?= __('confirm_delete_firewall_rule') ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p><?= __('confirm_delete_global_rule_msg') ?></p>
                <div id="delete-machine-rule-summary" class="mb-3"></div>
                <p class="text-muted"><?= __('action_cannot_be_undone') ?></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                <button type="button" class="btn btn-danger" id="confirm-delete-machine-rule-button"
                    data-bs-dismiss="modal"><?= __('yes_delete') ?></button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Edit Network Interface -->
<div class="modal modal-blur fade" id="modal-edit-network-interface" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="edit-interface-title"><?= __('configure_interface') ?>: <span
                        id="edit-interface-name"></span></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editNetworkInterfaceForm">
                    <input type="hidden" name="interface_name" id="edit-interface-hidden-name">
                    <div class="mb-3">
                        <label class="form-label"><?= __('mac_address') ?>:</label>
                        <span id="edit-interface-mac" class="form-control-plaintext"></span>
                    </div>

                    <div class="mb-3">
                        <label class="form-label"><?= __('link_status') ?>:</label>
                        <span id="edit-interface-link-status" class="form-control-plaintext"></span>
                    </div>

                    <div class="mb-3">
                        <label class="form-label"><?= __('ip_config_method') ?></label>
                        <select class="form-select" name="ip_method" id="edit-interface-ip-method"
                            onchange="toggleIpConfigFields(this.value)">
                            <option value="dhcp">DHCP</option>
                            <option value="static"><?= __('static_ip') ?></option>
                            <option value="none"><?= __('none_masc') ?></option>

                        </select>
                    </div>

                    <div id="static-ip-fields" style="display: none;">
                        <div class="mb-3">
                            <label class="form-label"><?= __('ip_addresses_cidr') ?></label>
                            <div id="static-ip-addresses-container">
                                <!-- Dynamic IP fields will be added here -->
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-primary mt-2"
                                onclick="addIpAddressField()">
                                <i class="ti ti-plus"></i> <?= __('add_ip_btn') ?>
                            </button>
                        </div>
                        <div class="mb-3">
                            <label class="form-label"><?= __('gateway') ?></label>
                            <input type="text" class="form-control" name="gateway" id="edit-interface-gateway"
                                placeholder="E.g., 192.168.1.1">
                        </div>
                        <div class="mb-3">
                            <label class="form-label"><?= __('dns_servers_label') ?></label>
                            <input type="text" class="form-control" name="nameservers" id="edit-interface-nameservers"
                                placeholder="E.g., 8.8.8.8, 8.8.4.4">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                <button type="button" class="btn btn-primary" onclick="saveNetworkInterfaceConfig()"><?= __('save_apply_btn') ?></button>
            </div>
        </div>
    </div>
</div>


<?php
$extra_scripts = ['js/machine_settings.js'];
require_once 'includes/footer.php';
?>