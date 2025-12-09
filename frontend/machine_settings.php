<?php
// machine_settings.php
require_once 'includes/header.php';
?>

<div id="notification-container"></div>

<div class="mb-4">
    <a href="index.php" class="btn btn-ghost-secondary">
        <i class="ti ti-arrow-left icon"></i> Torna alla Dashboard
    </a>
</div>

<div class="d-flex justify-content-between align-items-center mb-3">
    <h2>Impostazioni Macchina</h2>
</div>

<!-- Tabs Navigation -->
<ul class="nav nav-tabs mb-3" data-bs-toggle="tabs">
    <li class="nav-item">
        <a href="#tab-machine-firewall" class="nav-link active" data-bs-toggle="tab">Firewall (Globale)</a>
    </li>
    <li class="nav-item">
        <a href="#tab-network-interfaces" class="nav-link" data-bs-toggle="tab">Interfacce di Rete</a>
    </li>
</ul>

<div class="tab-content">
    
    <!-- Machine Firewall Tab -->
    <div class="tab-pane active show" id="tab-machine-firewall">
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Regole Firewall Globali</h3>
                <div class="card-actions">
                    <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#modal-add-machine-rule">
                        <i class="ti ti-plus"></i> Nuova Regola
                    </button>
                </div>
            </div>
            <div class="card-table table-responsive">
                <table class="table table-vcenter">
                    <thead>
                        <tr>
                            <th class="w-1">Ordin.</th>
                            <th>Azione</th>
                            <th>Tabella</th>
                            <th>Chain</th>
                            <th>Proto</th>
                            <th>Source</th>
                            <th>Dest.</th>
                            <th>Porta</th>
                            <th>In-If</th>
                            <th>Out-If</th>
                            <th class="w-1"></th>
                        </tr>
                    </thead>
                    <tbody id="machine-firewall-rules-table-body">
                        <tr><td colspan="11" class="text-center text-muted">Caricamento regole...</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="card-footer text-end">
                <button class="btn btn-success" onclick="applyMachineFirewallRules()">Applica Modifiche Firewall</button>
            </div>
        </div>
    </div>

    <!-- Network Interfaces Tab -->
    <div class="tab-pane" id="tab-network-interfaces">
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Interfacce di Rete della Macchina</h3>
                 <div class="card-actions">
                    <button class="btn btn-sm btn-primary" onclick="loadNetworkInterfaces()">
                        <i class="ti ti-refresh"></i> Aggiorna
                    </button>
                </div>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-vcenter card-table">
                        <thead>
                            <tr>
                                <th>Interfaccia</th>
                                <th>MAC</th>
                                <th>Link</th>
                                <th>IP</th>
                                <th>CIDR</th>
                                <th>Netmask</th>
                                <th class="w-1"></th>
                            </tr>
                        </thead>
                        <tbody id="network-interfaces-table-body">
                            <tr><td colspan="7" class="text-center text-muted">Caricamento interfacce...</td></tr>
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
                <h5 class="modal-title">Nuova Regola Firewall Globale</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="addMachineRuleForm">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Tabella</label>
                            <select class="form-select" name="table">
                                <option value="filter">filter</option>
                                <option value="nat">nat</option>
                                <option value="mangle">mangle</option>
                                <option value="raw">raw</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Chain</label>
                            <input type="text" class="form-control" name="chain" placeholder="INPUT, OUTPUT, FORWARD, PREROUTING, POSTROUTING..." required>
                            <small class="form-hint">E.g., INPUT, OUTPUT, FORWARD, PREROUTING, POSTROUTING.</small>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Azione</label>
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
                            <label class="form-label">Protocollo</label>
                            <select class="form-select" name="protocol" onchange="toggleMachinePortInput(this.value)">
                                <option value="all">ALL</option>
                                <option value="tcp">TCP</option>
                                <option value="udp">UDP</option>
                                <option value="icmp">ICMP</option>
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Sorgente (IP/CIDR)</label>
                            <input type="text" class="form-control" name="source" placeholder="E.g., 192.168.1.0/24 o any">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Destinazione (IP/CIDR)</label>
                            <input type="text" class="form-control" name="destination" placeholder="E.g., 8.8.8.8 o any">
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4 mb-3" id="machine-port-container" style="display: none;">
                            <label class="form-label">Porta</label>
                            <input type="text" class="form-control" name="port" placeholder="E.g., 80, 443, 1000:2000">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label">In-Interface</label>
                            <input type="text" class="form-control" name="in_interface" placeholder="E.g., eth0, tun+">
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label">Out-Interface</label>
                            <input type="text" class="form-control" name="out_interface" placeholder="E.g., eth0, tun+">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Stato Connessione</label>
                        <input type="text" class="form-control" name="state" placeholder="E.g., NEW,ESTABLISHED,RELATED">
                        <small class="form-hint">Richiede `-m state`</small>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Commento</label>
                        <input type="text" class="form-control" name="comment" placeholder="Descrizione della regola">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal">Annulla</button>
                <button type="button" class="btn btn-primary" onclick="addMachineFirewallRule()">Aggiungi Regola</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Confirm Delete Machine Rule -->
<div class="modal modal-blur fade" id="modal-confirm-delete-machine-rule" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Conferma Eliminazione Regola Firewall</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>Sei sicuro di voler eliminare la seguente regola firewall globale?</p>
                <div id="delete-machine-rule-summary" class="mb-3"></div>
                <p class="text-muted">Questa azione non può essere annullata. La regola verrà rimossa.</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal">Annulla</button>
                <button type="button" class="btn btn-danger" id="confirm-delete-machine-rule-button" data-bs-dismiss="modal">Sì, elimina</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Edit Network Interface -->
<div class="modal modal-blur fade" id="modal-edit-network-interface" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="edit-interface-title">Configura Interfaccia: <span id="edit-interface-name"></span></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="editNetworkInterfaceForm">
                    <input type="hidden" name="interface_name" id="edit-interface-hidden-name">
                    <div class="mb-3">
                        <label class="form-label">MAC Address:</label>
                        <span id="edit-interface-mac" class="form-control-plaintext"></span>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Link Status:</label>
                        <span id="edit-interface-link-status" class="form-control-plaintext"></span>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Metodo di Configurazione IP</label>
                        <select class="form-select" name="ip_method" id="edit-interface-ip-method" onchange="toggleIpConfigFields(this.value)">
                            <option value="dhcp">DHCP</option>
                            <option value="static">Statico</option>
                            <option value="none">Nessuno</option>
                        </select>
                    </div>

                    <div id="static-ip-fields" style="display: none;">
                        <div class="mb-3">
                            <label class="form-label">Indirizzi IP (CIDR)</label>
                            <div id="static-ip-addresses-container">
                                <!-- Dynamic IP fields will be added here -->
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-primary mt-2" onclick="addIpAddressField()">
                                <i class="ti ti-plus"></i> Aggiungi IP
                            </button>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Gateway</label>
                            <input type="text" class="form-control" name="gateway" id="edit-interface-gateway" placeholder="E.g., 192.168.1.1">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Server DNS (separati da virgola)</label>
                            <input type="text" class="form-control" name="nameservers" id="edit-interface-nameservers" placeholder="E.g., 8.8.8.8, 8.8.4.4">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal">Annulla</button>
                <button type="button" class="btn btn-primary" onclick="saveNetworkInterfaceConfig()">Salva e Applica</button>
            </div>
        </div>
    </div>
</div>


<?php
$extra_scripts = ['js/machine_settings.js'];
require_once 'includes/footer.php';
?>