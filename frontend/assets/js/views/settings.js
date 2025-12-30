/**
 * MADMIN - Settings View
 */

import { apiGet, apiPatch } from '../api.js';
import { showToast, escapeHtml } from '../utils.js';
import { checkPermission } from '../app.js';

/**
 * Render the settings view
 */
export async function render(container) {
    const canManage = checkPermission('settings.manage');

    container.innerHTML = `
        <div class="row row-deck row-cards">
            <!-- System Settings -->
            <div class="col-lg-6">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="ti ti-palette me-2"></i>Personalizzazione</h3>
                    </div>
                    <div class="card-body" id="system-settings-form">
                        <div class="mb-3">
                            <label class="form-label">Nome Azienda</label>
                            <input type="text" class="form-control" id="company-name" ${canManage ? '' : 'disabled'}>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Colore Primario</label>
                            <input type="color" class="form-control form-control-color" id="primary-color" ${canManage ? '' : 'disabled'}>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">URL Supporto</label>
                            <input type="url" class="form-control" id="support-url" placeholder="https://..." ${canManage ? '' : 'disabled'}>
                        </div>
                        ${canManage ? '<button class="btn btn-primary" id="save-system">Salva</button>' : ''}
                    </div>
                </div>
            </div>
            
            <!-- SMTP Settings -->
            <div class="col-lg-6">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="ti ti-mail me-2"></i>Configurazione Email</h3>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-8">
                                <label class="form-label">Server SMTP</label>
                                <input type="text" class="form-control" id="smtp-host" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-4">
                                <label class="form-label">Porta</label>
                                <input type="number" class="form-control" id="smtp-port" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-6">
                                <label class="form-label">Username</label>
                                <input type="text" class="form-control" id="smtp-username" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-6">
                                <label class="form-label">Password</label>
                                <input type="password" class="form-control" id="smtp-password" placeholder="••••••••" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-6">
                                <label class="form-label">Email Mittente</label>
                                <input type="email" class="form-control" id="sender-email" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-6">
                                <label class="form-label">Nome Mittente</label>
                                <input type="text" class="form-control" id="sender-name" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-12">
                                ${canManage ? '<button class="btn btn-primary" id="save-smtp">Salva</button>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Backup Settings -->
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="ti ti-database-export me-2"></i>Backup Automatico</h3>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-md-3">
                                <label class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="backup-enabled" ${canManage ? '' : 'disabled'}>
                                    <span class="form-check-label">Backup Automatico</span>
                                </label>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Frequenza</label>
                                <select class="form-select" id="backup-frequency" ${canManage ? '' : 'disabled'}>
                                    <option value="daily">Giornaliero</option>
                                    <option value="weekly">Settimanale</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Ora</label>
                                <input type="time" class="form-control" id="backup-time" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Protocollo</label>
                                <select class="form-select" id="backup-protocol" ${canManage ? '' : 'disabled'}>
                                    <option value="sftp">SFTP</option>
                                    <option value="ftp">FTP</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Host Remoto</label>
                                <input type="text" class="form-control" id="backup-host" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">Porta</label>
                                <input type="number" class="form-control" id="backup-port" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Percorso</label>
                                <input type="text" class="form-control" id="backup-path" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Utente</label>
                                <input type="text" class="form-control" id="backup-user" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Password</label>
                                <input type="password" class="form-control" id="backup-password" placeholder="••••••••" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-12">
                                ${canManage ? '<button class="btn btn-primary" id="save-backup">Salva</button>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    await loadSettings();
    setupEventListeners();
}

async function loadSettings() {
    try {
        const [system, smtp, backup] = await Promise.all([
            apiGet('/settings/system'),
            apiGet('/settings/smtp'),
            apiGet('/settings/backup')
        ]);

        // System
        document.getElementById('company-name').value = system.company_name || '';
        document.getElementById('primary-color').value = system.primary_color || '#206bc4';
        document.getElementById('support-url').value = system.support_url || '';

        // SMTP
        document.getElementById('smtp-host').value = smtp.smtp_host || '';
        document.getElementById('smtp-port').value = smtp.smtp_port || 587;
        document.getElementById('smtp-username').value = smtp.smtp_username || '';
        document.getElementById('sender-email').value = smtp.sender_email || '';
        document.getElementById('sender-name').value = smtp.sender_name || '';

        // Backup
        document.getElementById('backup-enabled').checked = backup.enabled;
        document.getElementById('backup-frequency').value = backup.frequency || 'daily';
        document.getElementById('backup-time').value = backup.time || '03:00';
        document.getElementById('backup-protocol').value = backup.remote_protocol || 'sftp';
        document.getElementById('backup-host').value = backup.remote_host || '';
        document.getElementById('backup-port').value = backup.remote_port || 22;
        document.getElementById('backup-path').value = backup.remote_path || '/';
        document.getElementById('backup-user').value = backup.remote_user || '';

    } catch (error) {
        showToast('Errore caricamento impostazioni', 'error');
    }
}

function setupEventListeners() {
    document.getElementById('save-system')?.addEventListener('click', async () => {
        try {
            await apiPatch('/settings/system', {
                company_name: document.getElementById('company-name').value,
                primary_color: document.getElementById('primary-color').value,
                support_url: document.getElementById('support-url').value || null
            });
            showToast('Impostazioni salvate', 'success');
        } catch (e) { showToast(e.message, 'error'); }
    });

    document.getElementById('save-smtp')?.addEventListener('click', async () => {
        try {
            const data = {
                smtp_host: document.getElementById('smtp-host').value,
                smtp_port: parseInt(document.getElementById('smtp-port').value),
                smtp_username: document.getElementById('smtp-username').value || null,
                sender_email: document.getElementById('sender-email').value,
                sender_name: document.getElementById('sender-name').value
            };
            const pwd = document.getElementById('smtp-password').value;
            if (pwd) data.smtp_password = pwd;

            await apiPatch('/settings/smtp', data);
            showToast('Impostazioni salvate', 'success');
        } catch (e) { showToast(e.message, 'error'); }
    });

    document.getElementById('save-backup')?.addEventListener('click', async () => {
        try {
            const data = {
                enabled: document.getElementById('backup-enabled').checked,
                frequency: document.getElementById('backup-frequency').value,
                time: document.getElementById('backup-time').value,
                remote_protocol: document.getElementById('backup-protocol').value,
                remote_host: document.getElementById('backup-host').value,
                remote_port: parseInt(document.getElementById('backup-port').value),
                remote_path: document.getElementById('backup-path').value,
                remote_user: document.getElementById('backup-user').value
            };
            const pwd = document.getElementById('backup-password').value;
            if (pwd) data.remote_password = pwd;

            await apiPatch('/settings/backup', data);
            showToast('Impostazioni salvate', 'success');
        } catch (e) { showToast(e.message, 'error'); }
    });
}
