// machine_settings.js

// State variables
let machineFirewallRules = [];
let networkInterfaces = [];
let currentEditingInterface = null; // Stores the interface being edited

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Load data when tabs are shown (lazy loading)
    const firewallTab = document.querySelector('a[data-bs-toggle="tab"][href="#tab-machine-firewall"]');
    if (firewallTab) {
        firewallTab.addEventListener('shown.bs.tab', loadMachineFirewallRules);
    }

    const networkTab = document.querySelector('a[data-bs-toggle="tab"][href="#tab-network-interfaces"]');
    if (networkTab) {
        networkTab.addEventListener('shown.bs.tab', loadNetworkInterfaces);
    }

    // Load initial data for the active tab (Firewall is active by default)
    loadMachineFirewallRules();
});


// --- Machine Firewall Rules ---

async function loadMachineFirewallRules() {
    const tbody = document.getElementById('machine-firewall-rules-table-body');
    tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">Caricamento regole...</td></tr>';
    
    try {
        const response = await fetch(`${API_AJAX_HANDLER}?action=get_machine_firewall_rules`);
        const result = await response.json();

        if (result.success) {
            machineFirewallRules = result.body;
            renderMachineFirewallRules();
        } else {
            showNotification('danger', 'Errore caricamento regole firewall macchina: ' + (result.body.detail || 'Sconosciuto'));
            tbody.innerHTML = '<tr><td colspan="11" class="text-center text-danger">Errore caricamento regole.</td></tr>';
        }
    } catch (e) {
        showNotification('danger', 'Errore di connessione caricando regole firewall macchina: ' + e.message);
        tbody.innerHTML = '<tr><td colspan="11" class="text-center text-danger">Errore di connessione.</td></tr>';
    }
}

function renderMachineFirewallRules() {
    const tbody = document.getElementById('machine-firewall-rules-table-body');
    tbody.innerHTML = '';

    if (machineFirewallRules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">Nessuna regola firewall definita.</td></tr>';
        return;
    }

    machineFirewallRules.sort((a, b) => a.order - b.order);

    machineFirewallRules.forEach((rule, index) => {
        const tr = document.createElement('tr');

        let badgeClass = 'bg-secondary';
        if (rule.action === 'ACCEPT') badgeClass = 'bg-success';
        if (rule.action === 'DROP') badgeClass = 'bg-danger';
        if (rule.action === 'REJECT') badgeClass = 'bg-warning';
        if (rule.action === 'MASQUERADE') badgeClass = 'bg-info';

        const ruleDescriptionHtml = `
            <strong>Azione:</strong> <span class="badge ${badgeClass}">${rule.action}</span><br>
            <strong>Chain:</strong> ${rule.chain}<br>
            <strong>Protocollo:</strong> ${rule.protocol ? rule.protocol.toUpperCase() : 'ANY'}<br>
            <strong>Destinazione:</strong> <code>${rule.destination || 'ANY'}</code><br>
            <strong>Porta:</strong> ${rule.port || '*'}<br>
            <strong>Sorgente:</strong> ${rule.source || 'ANY'}
        `;

        tr.innerHTML = `
            <td>
                <div class="btn-group-vertical btn-group-sm">
                    <button class="btn btn-icon" onclick="moveMachineRule('${rule.id}', -1)" ${index === 0 ? 'disabled' : ''}>
                        <i class="ti ti-chevron-up"></i>
                    </button>
                    <button class="btn btn-icon" onclick="moveMachineRule('${rule.id}', 1)" ${index === machineFirewallRules.length - 1 ? 'disabled' : ''}>
                        <i class="ti ti-chevron-down"></i>
                    </button>
                </div>
            </td>
            <td><span class="badge ${badgeClass}">${rule.action}</span></td>
            <td>${rule.table}</td>
            <td>${rule.chain}</td>
            <td>${rule.protocol ? rule.protocol.toUpperCase() : 'ANY'}</td>
            <td>${rule.source || 'ANY'}</td>
            <td><code>${rule.destination || 'ANY'}</code></td>
            <td>${rule.port || '*'}</td>
            <td>${rule.in_interface || '*'}</td>
            <td>${rule.out_interface || '*'}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-ghost-danger" onclick="confirmDeleteMachineRule('${rule.id}')">
                    <i class="ti ti-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function addMachineFirewallRule() {
    const form = document.getElementById('addMachineRuleForm');
    const ruleData = {
        chain: form.elements['chain'].value,
        action: form.elements['action'].value,
        protocol: form.elements['protocol'].value === 'all' ? null : form.elements['protocol'].value,
        source: form.elements['source'].value || null,
        destination: form.elements['destination'].value || null,
        port: form.elements['port'].value || null,
        in_interface: form.elements['in_interface'].value || null,
        out_interface: form.elements['out_interface'].value || null,
        state: form.elements['state'].value || null,
        comment: form.elements['comment'].value || null,
        table: form.elements['table'].value
    };

    // Basic validation
    if (!ruleData.chain || !ruleData.action) {
        showNotification('danger', 'Chain e Azione sono campi obbligatori.');
        return;
    }

    try {
        const response = await fetch(`${API_AJAX_HANDLER}?action=add_machine_firewall_rule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ruleData)
        });
        const result = await response.json();

        if (result.success) {
            showNotification('success', 'Regola firewall globale aggiunta con successo.');
            bootstrap.Modal.getInstance(document.getElementById('modal-add-machine-rule')).hide();
            form.reset(); // Clear form
            loadMachineFirewallRules();
        } else {
            showNotification('danger', 'Errore aggiunta regola: ' + (result.body.detail || 'Sconosciuto'));
        }
    } catch (e) {
        showNotification('danger', 'Errore di connessione: ' + e.message);
    }
}

function confirmDeleteMachineRule(ruleId) {
    const rule = machineFirewallRules.find(r => r.id === ruleId);
    if (!rule) {
        showNotification('danger', 'Regola non trovata per l\'eliminazione.');
        return;
    }

    let badgeClass = 'bg-secondary';
    if (rule.action === 'ACCEPT') badgeClass = 'bg-success';
    if (rule.action === 'DROP') badgeClass = 'bg-danger';
    if (rule.action === 'REJECT') badgeClass = 'bg-warning';
    if (rule.action === 'MASQUERADE') badgeClass = 'bg-info';

    const ruleDescriptionHtml = `
        <strong>Azione:</strong> <span class="badge ${badgeClass}">${rule.action}</span><br>
        <strong>Chain:</strong> ${rule.chain}<br>
        <strong>Protocollo:</strong> ${rule.protocol ? rule.protocol.toUpperCase() : 'ANY'}<br>
        <strong>Destinazione:</strong> <code>${rule.destination || 'ANY'}</code><br>
        <strong>Porta:</strong> ${rule.port || '*'}<br>
        <strong>Sorgente:</strong> ${rule.source || 'ANY'}
    `;

    document.getElementById('delete-machine-rule-summary').innerHTML = ruleDescriptionHtml;
    document.getElementById('confirm-delete-machine-rule-button').onclick = () => performDeleteMachineRule(ruleId);
    new bootstrap.Modal(document.getElementById('modal-confirm-delete-machine-rule')).show();
}

async function performDeleteMachineRule(ruleId) {
    try {
        const response = await fetch(`${API_AJAX_HANDLER}?action=delete_machine_firewall_rule&rule_id=${encodeURIComponent(ruleId)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });
        const result = await response.json();

        if (result.success) {
            showNotification('success', 'Regola firewall globale eliminata.');
            loadMachineFirewallRules();
        } else {
            showNotification('danger', 'Errore eliminazione regola: ' + (result.body.detail || 'Sconosciuto'));
        }
    } catch (e) {
        showNotification('danger', 'Errore di connessione: ' + e.message);
    }
}

async function moveMachineRule(ruleId, direction) {
    const index = machineFirewallRules.findIndex(r => r.id === ruleId);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= machineFirewallRules.length) return;

    // Temporarily swap order values
    [machineFirewallRules[index].order, machineFirewallRules[newIndex].order] = 
    [machineFirewallRules[newIndex].order, machineFirewallRules[index].order];
    
    // Ensure all orders are consecutive (important for backend reordering)
    machineFirewallRules.sort((a,b) => a.order - b.order);
    for(let i=0; i < machineFirewallRules.length; i++) {
        machineFirewallRules[i].order = i;
    }

    renderMachineFirewallRules(); // Update UI immediately

    // Backend call to apply the new order
    await applyMachineFirewallRules();
}

async function applyMachineFirewallRules() {
    const orders = machineFirewallRules.map(rule => ({
        id: rule.id,
        order: rule.order
    }));

    try {
        const response = await fetch(`${API_AJAX_HANDLER}?action=apply_machine_firewall_rules`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orders)
        });
        const result = await response.json();

        if (result.success) {
            showNotification('success', 'Modifiche alle regole firewall globali applicate con successo.');
        } else {
            showNotification('danger', 'Errore applicazione regole: ' + (result.body.detail || 'Sconosciuto'));
        }
    } catch (e) {
        showNotification('danger', 'Errore di connessione: ' + e.message);
    }
}


function toggleMachinePortInput(protocol) {
    const portContainer = document.getElementById('machine-port-container');
    if (protocol === 'tcp' || protocol === 'udp') {
        portContainer.style.display = 'block';
    } else {
        portContainer.style.display = 'none';
        portContainer.querySelector('input[name="port"]').value = ''; // Clear value when hidden
    }
}


// --- Network Interfaces ---

async function loadNetworkInterfaces() {
    const tbody = document.getElementById('network-interfaces-table-body');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Caricamento interfacce...</td></tr>';
    
    try {
        const response = await fetch(`${API_AJAX_HANDLER}?action=get_machine_network_interfaces`);
        const result = await response.json();

        if (result.success) {
            networkInterfaces = result.body;
            renderNetworkInterfaces();
        } else {
            showNotification('danger', 'Errore caricamento interfacce di rete: ' + (result.body.detail || 'Sconosciuto'));
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Errore caricamento.</td></tr>';
        }
    } catch (e) {
        showNotification('danger', 'Errore di connessione caricando interfacce di rete: ' + e.message);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Errore di connessione.</td></tr>';
    }
}

function renderNetworkInterfaces() {
    const tbody = document.getElementById('network-interfaces-table-body');
    tbody.innerHTML = '';

    if (networkInterfaces.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nessuna interfaccia di rete trovata.</td></tr>';
        return;
    }

    networkInterfaces.forEach(iface => {
        const tr = document.createElement('tr');
        
        // Determine IP display
        let ipDisplay = 'N/A';
        let cidrDisplay = 'N/A';
        let netmaskDisplay = 'N/A';

        if (iface.configured_ips && iface.configured_ips.length > 0) {
            const primaryIp = iface.configured_ips[0]; // Assuming first IP is primary for display
            ipDisplay = primaryIp.ip;
            cidrDisplay = primaryIp.cidr;
            netmaskDisplay = primaryIp.netmask;
            // Handle multiple IPs for display if needed
            if (iface.configured_ips.length > 1) {
                ipDisplay += ` (+${iface.configured_ips.length - 1})`;
            }
        }
        
        tr.innerHTML = `
            <td>${iface.name}</td>
            <td>${iface.mac_address || 'N/A'}</td>
            <td><span class="badge bg-${iface.link_status === 'UP' ? 'success' : 'danger'}">${iface.link_status}</span></td>
            <td>${ipDisplay}</td>
            <td>${cidrDisplay}</td>
            <td>${netmaskDisplay}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-primary" onclick="openEditNetworkInterfaceModal('${iface.name}')">
                    <i class="ti ti-edit"></i> Configura
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function openEditNetworkInterfaceModal(interfaceName) {
    currentEditingInterface = networkInterfaces.find(iface => iface.name === interfaceName);
    if (!currentEditingInterface) {
        showNotification('danger', `Interfaccia ${interfaceName} non trovata.`);
        return;
    }

    // Populate static fields
    document.getElementById('edit-interface-name').textContent = currentEditingInterface.name;
    document.getElementById('edit-interface-hidden-name').value = currentEditingInterface.name;
    document.getElementById('edit-interface-mac').textContent = currentEditingInterface.mac_address || 'N/A';
    document.getElementById('edit-interface-link-status').textContent = currentEditingInterface.link_status || 'UNKNOWN';

    // Fetch current netplan config for this interface
    try {
        const response = await fetch(`${API_AJAX_HANDLER}?action=get_machine_network_interface_config&interface_name=${encodeURIComponent(interfaceName)}`);
        const result = await response.json();

        if (result.success) {
            const config = result.body; // This is the netplan config for 'ethernets.interfaceName'
            
            // Determine IP method
            let ipMethod = 'dhcp'; // Default
            if (config && config.dhcp4 === false && config.addresses && config.addresses.length > 0) {
                ipMethod = 'static';
            } else if (config && config.dhcp4 === false && (!config.addresses || config.addresses.length === 0)) {
                ipMethod = 'none';
            }
            document.getElementById('edit-interface-ip-method').value = ipMethod;

            // Populate static IP fields if method is static
            const ipAddressesContainer = document.getElementById('static-ip-addresses-container');
            ipAddressesContainer.innerHTML = ''; // Clear previous fields
            if (ipMethod === 'static' && config.addresses && config.addresses.length > 0) {
                config.addresses.forEach(addr => addIpAddressField(addr));
            } else {
                addIpAddressField(); // Add one empty field for convenience
            }

            document.getElementById('edit-interface-gateway').value = (config.routes && config.routes.length > 0) ? config.routes[0].via : '';
            document.getElementById('edit-interface-nameservers').value = (config.nameservers && config.nameservers.addresses) ? config.nameservers.addresses.join(', ') : '';

            toggleIpConfigFields(ipMethod); // Show/hide fields based on method
            new bootstrap.Modal(document.getElementById('modal-edit-network-interface')).show();

        } else {
            showNotification('danger', 'Errore caricamento configurazione Netplan: ' + (result.body.detail || 'Sconosciuto'));
        }
    } catch (e) {
        showNotification('danger', 'Errore di connessione caricando configurazione Netplan: ' + e.message);
    }
}

function toggleIpConfigFields(method) {
    const staticIpFields = document.getElementById('static-ip-fields');
    if (method === 'static') {
        staticIpFields.style.display = 'block';
    } else {
        staticIpFields.style.display = 'none';
    }
}

function addIpAddressField(ipCidr = '') {
    const container = document.getElementById('static-ip-addresses-container');
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `
        <input type="text" class="form-control" placeholder="E.g., 192.168.1.10/24" value="${ipCidr}">
        <button type="button" class="btn btn-outline-danger" onclick="this.closest('.input-group').remove()">
            <i class="ti ti-trash"></i>
        </button>
    `;
    container.appendChild(div);
}

async function saveNetworkInterfaceConfig() {
    const interfaceName = document.getElementById('edit-interface-hidden-name').value;
    const ipMethod = document.getElementById('edit-interface-ip-method').value;
    
    let netplanConfig = {};

    if (ipMethod === 'dhcp') {
        netplanConfig = { dhcp4: true };
    } else if (ipMethod === 'static') {
        const ipAddresses = [];
        document.querySelectorAll('#static-ip-addresses-container input').forEach(input => {
            const val = input.value.trim();
            if (val) {
                // Basic validation for IP/CIDR
                if (!/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(val)) {
                     showNotification('danger', `Indirizzo IP non valido: ${val}`);
                     return; // Skip invalid IP
                }
                ipAddresses.push(val);
            }
        });

        const gateway = document.getElementById('edit-interface-gateway').value.trim();
        const nameservers = document.getElementById('edit-interface-nameservers').value.trim();
        let dnsConfig = {};
        if (nameservers) {
            dnsConfig = { addresses: nameservers.split(',').map(s => s.trim()) };
        }

        netplanConfig = {
            dhcp4: false,
            addresses: ipAddresses,
        };
        if (gateway) {
            netplanConfig.routes = [{ to: '0.0.0.0/0', via: gateway }];
        }
        if (Object.keys(dnsConfig).length > 0) {
            netplanConfig.nameservers = dnsConfig;
        }

    } else if (ipMethod === 'none') {
        netplanConfig = { dhcp4: false, addresses: [], routes: [], nameservers: {} };
    }
    
    try {
        const response = await fetch(`${API_AJAX_HANDLER}?action=update_machine_network_interface_config&interface_name=${encodeURIComponent(interfaceName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(netplanConfig)
        });
        const result = await response.json();

        if (result.success) {
            showNotification('success', 'Configurazione interfaccia salvata e applicata con successo.');
            bootstrap.Modal.getInstance(document.getElementById('modal-edit-network-interface')).hide();
            loadNetworkInterfaces(); // Reload interfaces to reflect changes
        } else {
            showNotification('danger', 'Errore salvataggio configurazione: ' + (result.body.detail || 'Sconosciuto'));
        }
    } catch (e) {
        showNotification('danger', 'Errore di connessione: ' + e.message);
    }
}

// Global notification function (assuming it's defined in header or a common utils)
// function showNotification(type, message) { ... }
