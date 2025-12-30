/**
 * MADMIN - Dashboard View
 */

import { apiGet } from '../api.js';
import { formatRelativeTime } from '../utils.js';

/**
 * Render the dashboard view
 */
export async function render(container) {
    container.innerHTML = `
        <div class="row row-deck row-cards">
            <!-- Welcome Card -->
            <div class="col-12">
                <div class="card bg-primary text-white">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="me-3">
                                <i class="ti ti-server-cog" style="font-size: 3rem;"></i>
                            </div>
                            <div>
                                <h2 class="mb-1">Benvenuto in MADMIN</h2>
                                <p class="mb-0 opacity-75">Sistema di amministrazione modulare per il tuo server</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Stats Cards -->
            <div class="col-sm-6 col-lg-3">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="subheader">Stato Sistema</div>
                        </div>
                        <div class="h1 mb-3" id="system-status">
                            <span class="spinner-border spinner-border-sm"></span>
                        </div>
                        <div class="d-flex mb-2">
                            <div class="text-muted">Database</div>
                            <div class="ms-auto" id="db-status">
                                <span class="spinner-border spinner-border-sm"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-sm-6 col-lg-3">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="subheader">Regole Firewall</div>
                        </div>
                        <div class="h1 mb-3" id="firewall-count">
                            <span class="spinner-border spinner-border-sm"></span>
                        </div>
                        <div class="d-flex mb-2">
                            <div class="text-muted">Regole attive</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-sm-6 col-lg-3">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="subheader">Moduli Installati</div>
                        </div>
                        <div class="h1 mb-3" id="modules-count">
                            <span class="spinner-border spinner-border-sm"></span>
                        </div>
                        <div class="d-flex mb-2">
                            <div class="text-muted">Moduli attivi</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-sm-6 col-lg-3">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <div class="subheader">Utenti</div>
                        </div>
                        <div class="h1 mb-3" id="users-count">
                            <span class="spinner-border spinner-border-sm"></span>
                        </div>
                        <div class="d-flex mb-2">
                            <div class="text-muted">Utenti registrati</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="col-lg-6">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="ti ti-bolt me-2"></i>Azioni Rapide
                        </h3>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-6">
                                <a href="#users" class="btn btn-outline-primary w-100">
                                    <i class="ti ti-user-plus me-2"></i>Nuovo Utente
                                </a>
                            </div>
                            <div class="col-6">
                                <a href="#firewall" class="btn btn-outline-primary w-100">
                                    <i class="ti ti-shield-plus me-2"></i>Nuova Regola
                                </a>
                            </div>
                            <div class="col-6">
                                <a href="#settings" class="btn btn-outline-primary w-100">
                                    <i class="ti ti-settings me-2"></i>Impostazioni
                                </a>
                            </div>
                            <div class="col-6">
                                <a href="#modules" class="btn btn-outline-primary w-100">
                                    <i class="ti ti-puzzle me-2"></i>Moduli
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- System Info -->
            <div class="col-lg-6">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="ti ti-info-circle me-2"></i>Informazioni Sistema
                        </h3>
                    </div>
                    <div class="card-body">
                        <dl class="row mb-0">
                            <dt class="col-5">Versione:</dt>
                            <dd class="col-7" id="system-version">-</dd>
                            
                            <dt class="col-5">Backend:</dt>
                            <dd class="col-7">FastAPI + PostgreSQL</dd>
                            
                            <dt class="col-5">Frontend:</dt>
                            <dd class="col-7">Tabler UI + ES Modules</dd>
                            
                            <dt class="col-5">Ultimo Aggiornamento:</dt>
                            <dd class="col-7" id="last-update">-</dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load data
    await loadDashboardData();
}

/**
 * Load dashboard data from API
 */
async function loadDashboardData() {
    // Health check
    try {
        const health = await apiGet('/health');

        document.getElementById('system-status').innerHTML = `
            <span class="status-dot status-dot-${health.status === 'healthy' ? 'active' : 'warning'} me-2"></span>
            ${health.status === 'healthy' ? 'Operativo' : 'Degradato'}
        `;

        document.getElementById('db-status').innerHTML = `
            <span class="badge bg-${health.database === 'connected' ? 'success' : 'danger'}">
                ${health.database === 'connected' ? 'Connesso' : 'Disconnesso'}
            </span>
        `;

        document.getElementById('system-version').textContent = `v${health.version}`;

    } catch (error) {
        document.getElementById('system-status').innerHTML = `
            <span class="status-dot status-dot-warning me-2"></span>
            Errore
        `;
    }

    // Firewall rules count
    try {
        const rules = await apiGet('/firewall/rules');
        const activeRules = rules.filter(r => r.enabled).length;
        document.getElementById('firewall-count').textContent = activeRules;
    } catch (error) {
        document.getElementById('firewall-count').textContent = '-';
    }

    // Modules count
    try {
        const modules = await apiGet('/modules/');
        const activeModules = modules.filter(m => m.enabled).length;
        document.getElementById('modules-count').textContent = activeModules;
    } catch (error) {
        document.getElementById('modules-count').textContent = '-';
    }

    // Users count
    try {
        const users = await apiGet('/auth/users');
        document.getElementById('users-count').textContent = users.length;
    } catch (error) {
        document.getElementById('users-count').textContent = '-';
    }

    // Last update
    document.getElementById('last-update').textContent = formatRelativeTime(new Date());
}
