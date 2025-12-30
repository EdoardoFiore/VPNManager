/**
 * MADMIN - Modules View
 */

import { apiGet, apiPost, apiDelete, apiPatch } from '../api.js';
import { showToast, confirmDialog, formatDate, emptyState, escapeHtml, statusBadge } from '../utils.js';
import { checkPermission } from '../app.js';

let modules = [];

export async function render(container) {
    container.innerHTML = `
        <div class="row row-deck row-cards">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="ti ti-puzzle me-2"></i>Moduli Installati</h3>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-vcenter card-table">
                            <thead>
                                <tr>
                                    <th>Modulo</th>
                                    <th>Versione</th>
                                    <th>Autore</th>
                                    <th>Stato</th>
                                    <th>Installato</th>
                                    <th class="w-1"></th>
                                </tr>
                            </thead>
                            <tbody id="modules-tbody">
                                <tr><td colspan="6" class="text-center py-4">
                                    <div class="spinner-border spinner-border-sm"></div>
                                </td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- Install from Staging -->
            ${checkPermission('modules.manage') ? `
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="ti ti-download me-2"></i>Installa da Staging</h3>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">ID Modulo in Staging</label>
                                <input type="text" class="form-control" id="staging-module-id" placeholder="es. wireguard">
                            </div>
                            <div class="col-md-6 d-flex align-items-end">
                                <button class="btn btn-primary" id="btn-install-staging">
                                    <i class="ti ti-download me-2"></i>Installa
                                </button>
                            </div>
                        </div>
                        <small class="form-hint">I moduli devono essere presenti nella cartella staging del backend.</small>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;

    setupEventListeners();
    await loadModules();
}

function setupEventListeners() {
    document.getElementById('btn-install-staging')?.addEventListener('click', async () => {
        const moduleId = document.getElementById('staging-module-id').value.trim();
        if (!moduleId) {
            showToast('Inserisci ID modulo', 'warning');
            return;
        }

        try {
            await apiPost('/modules/install', { source: 'staging', module_id: moduleId });
            showToast('Modulo installato! Riavvio richiesto.', 'success');
            document.getElementById('staging-module-id').value = '';
            await loadModules();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

async function loadModules() {
    try {
        modules = await apiGet('/modules/');
        renderModules();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function renderModules() {
    const tbody = document.getElementById('modules-tbody');
    const canManage = checkPermission('modules.manage');

    if (modules.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6">${emptyState('ti-puzzle', 'Nessun modulo installato', 'Installa moduli dalla sezione sottostante')}</td></tr>`;
        return;
    }

    tbody.innerHTML = modules.map(m => `
        <tr>
            <td>
                <div class="font-weight-medium">${escapeHtml(m.name)}</div>
                <small class="text-muted">${m.id}</small>
            </td>
            <td><span class="badge bg-azure-lt">${m.version}</span></td>
            <td>${m.author ? escapeHtml(m.author) : '-'}</td>
            <td>${statusBadge(m.enabled)}</td>
            <td>${formatDate(m.installed_at)}</td>
            <td>
                ${canManage ? `
                    <div class="btn-group btn-group-sm">
                        <button class="btn ${m.enabled ? 'btn-ghost-warning' : 'btn-ghost-success'} btn-toggle" 
                                data-id="${m.id}" data-enabled="${m.enabled}">
                            <i class="ti ti-${m.enabled ? 'player-pause' : 'player-play'}"></i>
                        </button>
                        <button class="btn btn-ghost-danger btn-uninstall" data-id="${m.id}">
                            <i class="ti ti-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const enabled = btn.dataset.enabled === 'true';
            try {
                await apiPatch(`/modules/${id}/${enabled ? 'disable' : 'enable'}`);
                showToast(`Modulo ${enabled ? 'disabilitato' : 'abilitato'}. Riavvio richiesto.`, 'success');
                await loadModules();
            } catch (e) {
                showToast(e.message, 'error');
            }
        });
    });

    tbody.querySelectorAll('.btn-uninstall').forEach(btn => {
        btn.addEventListener('click', async () => {
            const confirmed = await confirmDialog('Disinstalla Modulo', 'Sei sicuro? I dati del modulo saranno rimossi.', 'Disinstalla', 'btn-danger');
            if (confirmed) {
                try {
                    await apiDelete(`/modules/${btn.dataset.id}`);
                    showToast('Modulo disinstallato', 'success');
                    await loadModules();
                } catch (e) {
                    showToast(e.message, 'error');
                }
            }
        });
    });
}
