/**
 * MADMIN - Firewall View
 * 
 * Machine firewall management with similar UI to legacy system.
 * Displays rules in tables grouped by chain with drag-and-drop ordering.
 */

import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from '../api.js';
import { showToast, confirmDialog, chainBadge, actionBadge, emptyState, escapeHtml } from '../utils.js';
import { setPageActions, checkPermission } from '../app.js';

let rules = [];
let editingRule = null;

/**
 * Render the firewall view
 */
export async function render(container) {
    // Set page actions
    if (checkPermission('firewall.manage')) {
        setPageActions(`
            <button class="btn btn-primary" id="btn-add-rule">
                <i class="ti ti-plus me-2"></i>Nuova Regola
            </button>
        `);
    }

    container.innerHTML = `
        <div class="row">
            <div class="col-12">
                <!-- Chain Tabs -->
                <div class="card">
                    <div class="card-header">
                        <ul class="nav nav-tabs card-header-tabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab-input" type="button">
                                    <i class="ti ti-arrow-down-right me-1"></i>INPUT
                                    <span class="badge bg-azure-lt ms-2" id="count-input">0</span>
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-output" type="button">
                                    <i class="ti ti-arrow-up-right me-1"></i>OUTPUT
                                    <span class="badge bg-azure-lt ms-2" id="count-output">0</span>
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-forward" type="button">
                                    <i class="ti ti-arrows-right-left me-1"></i>FORWARD
                                    <span class="badge bg-azure-lt ms-2" id="count-forward">0</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                    <div class="card-body">
                        <div class="tab-content">
                            <div class="tab-pane active show" id="tab-input" role="tabpanel">
                                <div id="rules-input"></div>
                            </div>
                            <div class="tab-pane" id="tab-output" role="tabpanel">
                                <div id="rules-output"></div>
                            </div>
                            <div class="tab-pane" id="tab-forward" role="tabpanel">
                                <div id="rules-forward"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Rule Modal -->
        <div class="modal modal-blur fade" id="rule-modal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="rule-modal-title">Nuova Regola</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="rule-form">
                        <div class="modal-body">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label required">Catena</label>
                                    <select class="form-select" id="rule-chain" required>
                                        <option value="INPUT">INPUT</option>
                                        <option value="OUTPUT">OUTPUT</option>
                                        <option value="FORWARD">FORWARD</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label required">Azione</label>
                                    <select class="form-select" id="rule-action" required>
                                        <option value="ACCEPT">ACCEPT</option>
                                        <option value="DROP">DROP</option>
                                        <option value="REJECT">REJECT</option>
                                        <option value="LOG">LOG</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Protocollo</label>
                                    <select class="form-select" id="rule-protocol">
                                        <option value="">Tutti</option>
                                        <option value="tcp">TCP</option>
                                        <option value="udp">UDP</option>
                                        <option value="icmp">ICMP</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Porta</label>
                                    <input type="text" class="form-control" id="rule-port" 
                                           placeholder="es. 80, 443, 8000:8080">
                                    <small class="form-hint">Singola porta o range (80:443)</small>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Sorgente</label>
                                    <input type="text" class="form-control" id="rule-source" 
                                           placeholder="es. 192.168.1.0/24">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Destinazione</label>
                                    <input type="text" class="form-control" id="rule-destination" 
                                           placeholder="es. 10.0.0.0/8">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Interfaccia In</label>
                                    <input type="text" class="form-control" id="rule-in-interface" 
                                           placeholder="es. eth0, wg0">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Interfaccia Out</label>
                                    <input type="text" class="form-control" id="rule-out-interface" 
                                           placeholder="es. eth0, wg0">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Stato Connessione</label>
                                    <select class="form-select" id="rule-state">
                                        <option value="">Nessuno</option>
                                        <option value="NEW">NEW</option>
                                        <option value="ESTABLISHED">ESTABLISHED</option>
                                        <option value="RELATED">RELATED</option>
                                        <option value="ESTABLISHED,RELATED">ESTABLISHED,RELATED</option>
                                        <option value="NEW,ESTABLISHED,RELATED">NEW,ESTABLISHED,RELATED</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Abilitata</label>
                                    <label class="form-check form-switch mt-2">
                                        <input class="form-check-input" type="checkbox" id="rule-enabled" checked>
                                        <span class="form-check-label">Regola attiva</span>
                                    </label>
                                </div>
                                <div class="col-12">
                                    <label class="form-label">Commento</label>
                                    <input type="text" class="form-control" id="rule-comment" 
                                           placeholder="Descrizione della regola">
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-link" data-bs-dismiss="modal">Annulla</button>
                            <button type="submit" class="btn btn-primary" id="rule-submit-btn">Salva</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Setup event listeners
    setupEventListeners();

    // Load rules
    await loadRules();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Add rule button
    const addBtn = document.getElementById('btn-add-rule');
    if (addBtn) {
        addBtn.addEventListener('click', () => openRuleModal());
    }

    // Rule form submit
    const form = document.getElementById('rule-form');
    if (form) {
        form.addEventListener('submit', handleRuleSubmit);
    }
}

/**
 * Load rules from API
 */
async function loadRules() {
    try {
        rules = await apiGet('/firewall/rules');
        renderRules();
    } catch (error) {
        showToast('Errore nel caricamento delle regole: ' + error.message, 'error');
    }
}

/**
 * Render rules in tables
 */
function renderRules() {
    const chains = ['INPUT', 'OUTPUT', 'FORWARD'];

    for (const chain of chains) {
        const chainRules = rules.filter(r => r.chain === chain).sort((a, b) => a.order - b.order);
        const containerId = `rules-${chain.toLowerCase()}`;
        const container = document.getElementById(containerId);

        // Update count
        const countEl = document.getElementById(`count-${chain.toLowerCase()}`);
        if (countEl) {
            countEl.textContent = chainRules.length;
        }

        if (!container) continue;

        if (chainRules.length === 0) {
            container.innerHTML = emptyState('ti-shield-off', 'Nessuna regola', `Non ci sono regole per la catena ${chain}`);
            continue;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-vcenter firewall-table" id="table-${chain.toLowerCase()}">
                    <thead>
                        <tr>
                            <th class="rule-order">#</th>
                            <th>Azione</th>
                            <th>Protocollo</th>
                            <th>Sorgente</th>
                            <th>Destinazione</th>
                            <th>Porta</th>
                            <th>Stato</th>
                            <th>Commento</th>
                            <th class="rule-actions"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${chainRules.map(rule => renderRuleRow(rule)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Setup row event listeners
        setupRowEvents(container);
    }
}

/**
 * Render a single rule row
 */
function renderRuleRow(rule) {
    const canManage = checkPermission('firewall.manage');
    const disabledClass = rule.enabled ? '' : 'disabled';

    return `
        <tr class="${disabledClass}" data-id="${rule.id}">
            <td class="rule-order">
                ${canManage ? '<i class="ti ti-grip-vertical drag-handle"></i>' : ''}
                <span class="ms-1">${rule.order + 1}</span>
            </td>
            <td>${actionBadge(rule.action)}</td>
            <td>${rule.protocol ? `<code>${rule.protocol}</code>` : '<span class="text-muted">tutti</span>'}</td>
            <td>${rule.source ? `<code>${escapeHtml(rule.source)}</code>` : '<span class="text-muted">-</span>'}</td>
            <td>${rule.destination ? `<code>${escapeHtml(rule.destination)}</code>` : '<span class="text-muted">-</span>'}</td>
            <td>${rule.port ? `<code>${escapeHtml(rule.port)}</code>` : '<span class="text-muted">-</span>'}</td>
            <td>${rule.state ? `<span class="badge bg-secondary-lt">${rule.state}</span>` : '-'}</td>
            <td class="text-muted">${rule.comment ? escapeHtml(rule.comment) : '-'}</td>
            <td class="rule-actions">
                ${canManage ? `
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-ghost-primary btn-edit" title="Modifica">
                            <i class="ti ti-edit"></i>
                        </button>
                        <button class="btn btn-ghost-danger btn-delete" title="Elimina">
                            <i class="ti ti-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </td>
        </tr>
    `;
}

/**
 * Setup row event listeners
 */
function setupRowEvents(container) {
    // Edit buttons
    container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            const ruleId = row.dataset.id;
            const rule = rules.find(r => r.id === ruleId);
            if (rule) {
                openRuleModal(rule);
            }
        });
    });

    // Delete buttons
    container.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const ruleId = row.dataset.id;

            const confirmed = await confirmDialog(
                'Elimina Regola',
                'Sei sicuro di voler eliminare questa regola? L\'azione è immediata.',
                'Elimina',
                'btn-danger'
            );

            if (confirmed) {
                await deleteRule(ruleId);
            }
        });
    });
}

/**
 * Open rule modal for create/edit
 */
function openRuleModal(rule = null) {
    editingRule = rule;

    const modal = document.getElementById('rule-modal');
    const title = document.getElementById('rule-modal-title');

    title.textContent = rule ? 'Modifica Regola' : 'Nuova Regola';

    // Reset form
    document.getElementById('rule-chain').value = rule?.chain || 'INPUT';
    document.getElementById('rule-action').value = rule?.action || 'ACCEPT';
    document.getElementById('rule-protocol').value = rule?.protocol || '';
    document.getElementById('rule-port').value = rule?.port || '';
    document.getElementById('rule-source').value = rule?.source || '';
    document.getElementById('rule-destination').value = rule?.destination || '';
    document.getElementById('rule-in-interface').value = rule?.in_interface || '';
    document.getElementById('rule-out-interface').value = rule?.out_interface || '';
    document.getElementById('rule-state').value = rule?.state || '';
    document.getElementById('rule-enabled').checked = rule?.enabled !== false;
    document.getElementById('rule-comment').value = rule?.comment || '';

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

/**
 * Handle rule form submit
 */
async function handleRuleSubmit(e) {
    e.preventDefault();

    const data = {
        chain: document.getElementById('rule-chain').value,
        action: document.getElementById('rule-action').value,
        protocol: document.getElementById('rule-protocol').value || null,
        port: document.getElementById('rule-port').value || null,
        source: document.getElementById('rule-source').value || null,
        destination: document.getElementById('rule-destination').value || null,
        in_interface: document.getElementById('rule-in-interface').value || null,
        out_interface: document.getElementById('rule-out-interface').value || null,
        state: document.getElementById('rule-state').value || null,
        enabled: document.getElementById('rule-enabled').checked,
        comment: document.getElementById('rule-comment').value || null,
    };

    try {
        if (editingRule) {
            await apiPatch(`/firewall/rules/${editingRule.id}`, data);
            showToast('Regola aggiornata con successo', 'success');
        } else {
            await apiPost('/firewall/rules', data);
            showToast('Regola creata con successo', 'success');
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('rule-modal'));
        modal.hide();

        // Reload rules
        await loadRules();

    } catch (error) {
        showToast('Errore: ' + error.message, 'error');
    }
}

/**
 * Delete a rule
 */
async function deleteRule(ruleId) {
    try {
        await apiDelete(`/firewall/rules/${ruleId}`);
        showToast('Regola eliminata', 'success');
        await loadRules();
    } catch (error) {
        showToast('Errore: ' + error.message, 'error');
    }
}
