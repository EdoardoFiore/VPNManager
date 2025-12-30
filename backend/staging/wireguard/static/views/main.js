/**
 * WireGuard Module - Main View
 * 
 * Complete management UI for WireGuard VPN instances and clients.
 */

import { apiGet, apiPost, apiDelete } from '/static/js/api.js';
import { showToast, confirmDialog, loadingSpinner } from '/static/js/utils.js';

let currentInstanceId = null;

export async function render(container, params) {
    if (params && params.length > 0) {
        currentInstanceId = params[0];
        await renderInstanceDetail(container);
    } else {
        await renderInstanceList(container);
    }
}

// ============== INSTANCE LIST ==============

async function renderInstanceList(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h3 class="card-title"><i class="ti ti-brand-wire me-2"></i>Istanze WireGuard</h3>
                <button class="btn btn-primary" id="btn-new-instance">
                    <i class="ti ti-plus me-1"></i>Nuova Istanza
                </button>
            </div>
            <div class="card-body" id="instances-list">${loadingSpinner()}</div>
        </div>
        
        <!-- New Instance Modal -->
        <div class="modal fade" id="modal-new-instance" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Nuova Istanza WireGuard</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label class="form-label">Nome</label>
                                <input type="text" class="form-control" id="new-instance-name" placeholder="Office VPN">
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">Porta UDP</label>
                                <input type="number" class="form-control" id="new-instance-port" value="51820">
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">Subnet</label>
                                <input type="text" class="form-control" id="new-instance-subnet" placeholder="10.10.0.0/24">
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Modalità Tunnel</label>
                            <div class="btn-group w-100" role="group">
                                <input type="radio" class="btn-check" name="tunnel-mode" id="tunnel-full" value="full" checked>
                                <label class="btn btn-outline-primary" for="tunnel-full">
                                    <i class="ti ti-world me-1"></i>Full Tunnel
                                    <small class="d-block text-muted">Tutto il traffico via VPN</small>
                                </label>
                                <input type="radio" class="btn-check" name="tunnel-mode" id="tunnel-split" value="split">
                                <label class="btn btn-outline-primary" for="tunnel-split">
                                    <i class="ti ti-route me-1"></i>Split Tunnel
                                    <small class="d-block text-muted">Solo rotte specifiche</small>
                                </label>
                            </div>
                        </div>
                        
                        <!-- Full Tunnel Options -->
                        <div id="full-tunnel-options">
                            <div class="mb-3">
                                <label class="form-label">Server DNS</label>
                                <input type="text" class="form-control" id="new-instance-dns" 
                                       placeholder="8.8.8.8, 1.1.1.1" value="8.8.8.8, 1.1.1.1">
                                <small class="form-hint">Separati da virgola. Lascia vuoto per usare Google DNS.</small>
                            </div>
                        </div>
                        
                        <!-- Split Tunnel Options -->
                        <div id="split-tunnel-options" style="display: none;">
                            <div class="mb-3">
                                <label class="form-label">Rotte da inoltrare</label>
                                <div id="routes-container">
                                    <div class="input-group mb-2">
                                        <input type="text" class="form-control route-input" placeholder="192.168.1.0/24">
                                        <button class="btn btn-outline-success btn-add-route" type="button">
                                            <i class="ti ti-plus"></i>
                                        </button>
                                    </div>
                                </div>
                                <small class="form-hint">Inserisci le subnet che devono transitare dalla VPN.</small>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Server DNS (opzionale)</label>
                                <input type="text" class="form-control" id="new-instance-dns-split" placeholder="Lascia vuoto per usare DNS locali">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Annulla</button>
                        <button class="btn btn-primary" id="btn-create-instance">
                            <i class="ti ti-check me-1"></i>Crea Istanza
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    await loadInstances();
    setupCreateForm();
}

function setupCreateForm() {
    document.getElementById('btn-new-instance')?.addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('modal-new-instance')).show();
    });

    // Toggle tunnel options
    document.querySelectorAll('input[name="tunnel-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const fullOpts = document.getElementById('full-tunnel-options');
            const splitOpts = document.getElementById('split-tunnel-options');
            if (e.target.value === 'full') {
                fullOpts.style.display = 'block';
                splitOpts.style.display = 'none';
            } else {
                fullOpts.style.display = 'none';
                splitOpts.style.display = 'block';
            }
        });
    });

    // Add route button
    document.querySelector('.btn-add-route')?.addEventListener('click', addRouteInput);

    document.getElementById('btn-create-instance')?.addEventListener('click', createInstance);
}

function addRouteInput() {
    const container = document.getElementById('routes-container');
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `
        <input type="text" class="form-control route-input" placeholder="192.168.1.0/24">
        <button class="btn btn-outline-danger btn-remove-route" type="button">
            <i class="ti ti-minus"></i>
        </button>
    `;
    div.querySelector('.btn-remove-route').addEventListener('click', () => div.remove());
    container.appendChild(div);
}

async function loadInstances() {
    const listEl = document.getElementById('instances-list');
    try {
        const instances = await apiGet('/modules/wireguard/instances');

        if (instances.length === 0) {
            listEl.innerHTML = `<div class="text-center py-5 text-muted">
                <i class="ti ti-server-off" style="font-size: 3rem;"></i>
                <p class="mt-2">Nessuna istanza configurata</p>
                <small>Clicca "Nuova Istanza" per crearne una</small>
            </div>`;
            return;
        }

        listEl.innerHTML = `<div class="table-responsive"><table class="table table-vcenter card-table">
            <thead><tr>
                <th>Nome</th><th>Interfaccia</th><th>Porta</th><th>Subnet</th>
                <th>Modalità</th><th>Client</th><th>Stato</th><th class="w-1"></th>
            </tr></thead>
            <tbody>${instances.map(i => `<tr>
                <td><a href="#wireguard/${i.id}" class="text-reset"><strong>${i.name}</strong></a></td>
                <td><code>${i.interface}</code></td>
                <td>${i.port}/UDP</td>
                <td><code>${i.subnet}</code></td>
                <td><span class="badge ${i.tunnel_mode === 'full' ? 'bg-blue' : 'bg-purple'}-lt">
                    ${i.tunnel_mode === 'full' ? 'Full' : 'Split'}
                </span></td>
                <td>${i.client_count}</td>
                <td><span class="badge ${i.status === 'running' ? 'bg-success' : 'bg-secondary'}">
                    ${i.status === 'running' ? 'Attivo' : 'Fermo'}
                </span></td>
                <td><div class="btn-group">
                    ${i.status === 'running'
                ? `<button class="btn btn-sm btn-ghost-warning" onclick="stopInstance('${i.id}')" title="Ferma"><i class="ti ti-player-stop"></i></button>`
                : `<button class="btn btn-sm btn-ghost-success" onclick="startInstance('${i.id}')" title="Avvia"><i class="ti ti-player-play"></i></button>`}
                    <a href="#wireguard/${i.id}" class="btn btn-sm btn-ghost-primary" title="Dettagli"><i class="ti ti-eye"></i></a>
                    <button class="btn btn-sm btn-ghost-danger" onclick="deleteInstance('${i.id}')" title="Elimina"><i class="ti ti-trash"></i></button>
                </div></td>
            </tr>`).join('')}</tbody>
        </table></div>`;
    } catch (err) {
        listEl.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
}

async function createInstance() {
    const name = document.getElementById('new-instance-name').value.trim();
    const port = parseInt(document.getElementById('new-instance-port').value);
    const subnet = document.getElementById('new-instance-subnet').value.trim();
    const tunnelMode = document.querySelector('input[name="tunnel-mode"]:checked').value;

    if (!name || !port || !subnet) {
        showToast('Compila tutti i campi obbligatori', 'error');
        return;
    }

    // Collect DNS servers
    let dnsInput = tunnelMode === 'full'
        ? document.getElementById('new-instance-dns').value
        : document.getElementById('new-instance-dns-split').value;

    let dnsServers = dnsInput.split(',').map(s => s.trim()).filter(s => s);
    if (dnsServers.length === 0 && tunnelMode === 'full') {
        dnsServers = ['8.8.8.8', '1.1.1.1'];
    }

    // Collect routes for split tunnel
    let routes = [];
    if (tunnelMode === 'split') {
        document.querySelectorAll('.route-input').forEach(input => {
            if (input.value.trim()) {
                routes.push({ network: input.value.trim() });
            }
        });
    }

    try {
        await apiPost('/modules/wireguard/instances', {
            name, port, subnet,
            tunnel_mode: tunnelMode,
            dns_servers: dnsServers,
            routes: routes
        });
        showToast('Istanza creata con successo', 'success');
        bootstrap.Modal.getInstance(document.getElementById('modal-new-instance'))?.hide();
        await loadInstances();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============== INSTANCE DETAIL ==============

async function renderInstanceDetail(container) {
    try {
        const instance = await apiGet(`/modules/wireguard/instances/${currentInstanceId}`);
        const clients = await apiGet(`/modules/wireguard/instances/${currentInstanceId}/clients`);

        container.innerHTML = `
            <div class="mb-3">
                <a href="#wireguard" class="text-muted">
                    <i class="ti ti-arrow-left me-1"></i>Torna alle istanze
                </a>
            </div>
            
            <!-- Instance Info Card -->
            <div class="card mb-3">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h3 class="card-title mb-0">${instance.name}</h3>
                            <small class="text-muted">Interfaccia: ${instance.interface}</small>
                        </div>
                        <div class="btn-group">
                            <button class="btn ${instance.status === 'running' ? 'btn-warning' : 'btn-success'}" 
                                    onclick="${instance.status === 'running' ? 'stopInstance' : 'startInstance'}('${instance.id}')">
                                <i class="ti ti-player-${instance.status === 'running' ? 'stop' : 'play'} me-1"></i>
                                ${instance.status === 'running' ? 'Ferma' : 'Avvia'}
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteInstance('${instance.id}')">
                                <i class="ti ti-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-2">
                            <span class="text-muted">Stato</span><br>
                            <span class="badge ${instance.status === 'running' ? 'bg-success' : 'bg-secondary'} fs-6">
                                ${instance.status === 'running' ? 'Attivo' : 'Fermo'}
                            </span>
                        </div>
                        <div class="col-md-2">
                            <span class="text-muted">Porta</span><br>
                            <strong>${instance.port}/UDP</strong>
                        </div>
                        <div class="col-md-2">
                            <span class="text-muted">Subnet</span><br>
                            <code>${instance.subnet}</code>
                        </div>
                        <div class="col-md-2">
                            <span class="text-muted">Modalità</span><br>
                            <span class="badge ${instance.tunnel_mode === 'full' ? 'bg-blue' : 'bg-purple'}-lt">
                                ${instance.tunnel_mode === 'full' ? 'Full Tunnel' : 'Split Tunnel'}
                            </span>
                        </div>
                        <div class="col-md-2">
                            <span class="text-muted">DNS</span><br>
                            <small>${instance.dns_servers?.join(', ') || 'N/A'}</small>
                        </div>
                        <div class="col-md-2">
                            <span class="text-muted">Client</span><br>
                            <strong>${instance.client_count}</strong>
                        </div>
                    </div>
                    ${instance.tunnel_mode === 'split' && instance.routes?.length ? `
                        <hr>
                        <h4>Rotte Split Tunnel</h4>
                        <div class="d-flex flex-wrap gap-2">
                            ${instance.routes.map(r => `<code class="badge bg-light text-dark">${r.network || r}</code>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Clients Card -->
            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h3 class="card-title"><i class="ti ti-users me-2"></i>Client VPN (${clients.length})</h3>
                        <button class="btn btn-primary" id="btn-new-client">
                            <i class="ti ti-user-plus me-1"></i>Nuovo Client
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${clients.length === 0 ? `
                        <div class="text-center py-4 text-muted">
                            <i class="ti ti-users-minus" style="font-size: 2rem;"></i>
                            <p class="mt-2">Nessun client configurato</p>
                            <small>Clicca "Nuovo Client" per aggiungerne uno</small>
                        </div>
                    ` : `
                        <div class="table-responsive">
                            <table class="table table-vcenter">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>IP Assegnato</th>
                                        <th>Chiave Pubblica</th>
                                        <th>Creato</th>
                                        <th class="w-1">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${clients.map(c => `
                                        <tr>
                                            <td><strong>${c.name}</strong></td>
                                            <td><code>${c.allocated_ip}</code></td>
                                            <td><code class="text-muted">${c.public_key.substring(0, 12)}...</code></td>
                                            <td>${new Date(c.created_at).toLocaleDateString('it-IT')}</td>
                                            <td>
                                                <div class="btn-group">
                                                    <button class="btn btn-sm btn-outline-primary" onclick="downloadConfig('${c.name}')" title="Scarica Config">
                                                        <i class="ti ti-download"></i>
                                                    </button>
                                                    <button class="btn btn-sm btn-outline-secondary" onclick="showQR('${c.name}')" title="QR Code">
                                                        <i class="ti ti-qrcode"></i>
                                                    </button>
                                                    <button class="btn btn-sm btn-outline-danger" onclick="revokeClient('${c.name}')" title="Revoca">
                                                        <i class="ti ti-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;

        // New client button
        document.getElementById('btn-new-client')?.addEventListener('click', async () => {
            const name = prompt('Nome del nuovo client:');
            if (name && name.trim()) {
                try {
                    await apiPost(`/modules/wireguard/instances/${currentInstanceId}/clients`, { name: name.trim() });
                    showToast('Client creato con successo', 'success');
                    renderInstanceDetail(container);
                } catch (err) {
                    showToast(err.message, 'error');
                }
            }
        });
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">
            <i class="ti ti-alert-circle me-2"></i>${err.message}
        </div>`;
    }
}

// ============== GLOBAL FUNCTIONS ==============

window.startInstance = async (id) => {
    try {
        await apiPost(`/modules/wireguard/instances/${id}/start`);
        showToast('Istanza avviata', 'success');
        location.reload();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.stopInstance = async (id) => {
    try {
        await apiPost(`/modules/wireguard/instances/${id}/stop`);
        showToast('Istanza fermata', 'success');
        location.reload();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteInstance = async (id) => {
    if (await confirmDialog('Eliminare questa istanza e tutti i suoi client?', 'Elimina')) {
        try {
            await apiDelete(`/modules/wireguard/instances/${id}`);
            showToast('Istanza eliminata', 'success');
            location.href = '#wireguard';
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
};

window.downloadConfig = (name) => {
    window.open(`/api/modules/wireguard/instances/${currentInstanceId}/clients/${name}/config`, '_blank');
};

window.showQR = (name) => {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="modal fade" tabindex="-1">
            <div class="modal-dialog modal-sm">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">QR Code - ${name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center p-4">
                        <img src="/api/modules/wireguard/instances/${currentInstanceId}/clients/${name}/qr" 
                             class="img-fluid" alt="QR Code">
                        <p class="mt-3 mb-0 text-muted small">Scansiona con l'app WireGuard</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal.querySelector('.modal'));
    bsModal.show();
    modal.querySelector('.modal').addEventListener('hidden.bs.modal', () => modal.remove());
};

window.revokeClient = async (name) => {
    if (await confirmDialog(`Revocare il client "${name}"? Il client perderà l'accesso alla VPN.`, 'Revoca')) {
        try {
            await apiDelete(`/modules/wireguard/instances/${currentInstanceId}/clients/${name}`);
            showToast('Client revocato', 'success');
            location.reload();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
};
