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
            <!-- Personalization Settings -->
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="ti ti-palette me-2"></i>Personalizzazione</h3>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label">Nome Azienda</label>
                                <input type="text" class="form-control" id="company-name" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Colore Primario</label>
                                <div class="input-group">
                                    <input type="color" class="form-control form-control-color" id="primary-color" ${canManage ? '' : 'disabled'}>
                                    <input type="text" class="form-control" id="primary-color-hex" placeholder="#206bc4" ${canManage ? '' : 'disabled'}>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">URL Supporto</label>
                                <input type="url" class="form-control" id="support-url" placeholder="https://..." ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Logo</label>
                                <div class="d-flex align-items-center gap-3">
                                    <img id="logo-preview" src="/static/img/logo-default.png" alt="Logo" 
                                         style="max-height: 50px; max-width: 150px;" class="border rounded p-1">
                                    ${canManage ? `
                                    <div class="btn-group">
                                        <label class="btn btn-outline-primary">
                                            <i class="ti ti-upload me-1"></i>Carica
                                            <input type="file" id="logo-upload" accept="image/*" class="d-none">
                                        </label>
                                        <button class="btn btn-outline-secondary" id="reset-logo" title="Ripristina predefinito">
                                            <i class="ti ti-refresh"></i>
                                        </button>
                                    </div>
                                    ` : ''}
                                </div>
                                <small class="form-hint">PNG o SVG, max 200x50px consigliato</small>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Favicon</label>
                                <div class="d-flex align-items-center gap-3">
                                    <img id="favicon-preview" src="/static/img/favicon-default.png" alt="Favicon" 
                                         style="width: 32px; height: 32px;" class="border rounded">
                                    ${canManage ? `
                                    <div class="btn-group">
                                        <label class="btn btn-outline-primary">
                                            <i class="ti ti-upload me-1"></i>Carica
                                            <input type="file" id="favicon-upload" accept="image/*" class="d-none">
                                        </label>
                                        <button class="btn btn-outline-secondary" id="reset-favicon" title="Ripristina predefinito">
                                            <i class="ti ti-refresh"></i>
                                        </button>
                                    </div>
                                    ` : ''}
                                </div>
                                <small class="form-hint">ICO o PNG, 32x32px o 64x64px</small>
                            </div>
                            <div class="col-12">
                                ${canManage ? '<button class="btn btn-primary" id="save-system">Salva Impostazioni</button>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- SMTP Settings -->
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="ti ti-mail me-2"></i>Configurazione Email (SMTP)</h3>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label">Server SMTP</label>
                                <input type="text" class="form-control" id="smtp-host" placeholder="smtp.gmail.com" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label">Porta</label>
                                <input type="number" class="form-control" id="smtp-port" value="587" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Crittografia</label>
                                <select class="form-select" id="smtp-encryption" ${canManage ? '' : 'disabled'}>
                                    <option value="none">Nessuna</option>
                                    <option value="tls" selected>TLS (STARTTLS)</option>
                                    <option value="ssl">SSL/TLS</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">URL Pubblico App</label>
                                <input type="url" class="form-control" id="public-url" placeholder="https://app.example.com" ${canManage ? '' : 'disabled'}>
                                <small class="form-hint">Per link nelle email</small>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Username SMTP</label>
                                <input type="text" class="form-control" id="smtp-username" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Password SMTP</label>
                                <input type="password" class="form-control" id="smtp-password" placeholder="••••••••" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Email Mittente</label>
                                <input type="email" class="form-control" id="sender-email" placeholder="noreply@example.com" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Nome Mittente</label>
                                <input type="text" class="form-control" id="sender-name" placeholder="MADMIN" ${canManage ? '' : 'disabled'}>
                            </div>
                            <div class="col-12">
                                ${canManage ? `
                                <button class="btn btn-primary" id="save-smtp">Salva</button>
                                <button class="btn btn-outline-secondary ms-2" id="test-smtp">
                                    <i class="ti ti-send me-1"></i>Test Invio
                                </button>
                                ` : ''}
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
        document.getElementById('primary-color-hex').value = system.primary_color || '#206bc4';
        document.getElementById('support-url').value = system.support_url || '';

        // Logo/favicon - use default if not set
        const logoPreview = document.getElementById('logo-preview');
        const faviconPreview = document.getElementById('favicon-preview');
        if (system.logo_url) {
            logoPreview.src = system.logo_url;
        }
        if (system.favicon_url) {
            faviconPreview.src = system.favicon_url;
        }

        // SMTP
        document.getElementById('smtp-host').value = smtp.smtp_host || '';
        document.getElementById('smtp-port').value = smtp.smtp_port || 587;
        document.getElementById('smtp-encryption').value = smtp.smtp_encryption || 'tls';
        document.getElementById('public-url').value = smtp.public_url || '';
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
    // Color picker sync
    const colorPicker = document.getElementById('primary-color');
    const colorHex = document.getElementById('primary-color-hex');

    colorPicker?.addEventListener('input', () => {
        colorHex.value = colorPicker.value;
    });

    colorHex?.addEventListener('input', () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(colorHex.value)) {
            colorPicker.value = colorHex.value;
        }
    });

    // Logo upload
    document.getElementById('logo-upload')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('logo-preview').src = e.target.result;
            };
            reader.readAsDataURL(file);
            // TODO: Upload to server
            showToast('Logo caricato (salva per confermare)', 'info');
        }
    });

    // Favicon upload
    document.getElementById('favicon-upload')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('favicon-preview').src = e.target.result;
            };
            reader.readAsDataURL(file);
            showToast('Favicon caricata (salva per confermare)', 'info');
        }
    });

    // Reset logo/favicon
    document.getElementById('reset-logo')?.addEventListener('click', () => {
        document.getElementById('logo-preview').src = '/static/img/logo-default.png';
        showToast('Logo ripristinato al predefinito', 'info');
    });

    document.getElementById('reset-favicon')?.addEventListener('click', () => {
        document.getElementById('favicon-preview').src = '/static/img/favicon-default.png';
        showToast('Favicon ripristinata al predefinito', 'info');
    });

    // Save system settings
    document.getElementById('save-system')?.addEventListener('click', async () => {
        try {
            await apiPatch('/settings/system', {
                company_name: document.getElementById('company-name').value,
                primary_color: document.getElementById('primary-color').value,
                support_url: document.getElementById('support-url').value || null
                // TODO: Add logo_url and favicon_url after file upload implementation
            });
            showToast('Impostazioni salvate', 'success');
        } catch (e) { showToast(e.message, 'error'); }
    });

    // Save SMTP settings
    document.getElementById('save-smtp')?.addEventListener('click', async () => {
        try {
            const data = {
                smtp_host: document.getElementById('smtp-host').value,
                smtp_port: parseInt(document.getElementById('smtp-port').value),
                smtp_encryption: document.getElementById('smtp-encryption').value,
                public_url: document.getElementById('public-url').value || null,
                smtp_username: document.getElementById('smtp-username').value || null,
                sender_email: document.getElementById('sender-email').value,
                sender_name: document.getElementById('sender-name').value
            };
            const pwd = document.getElementById('smtp-password').value;
            if (pwd) data.smtp_password = pwd;

            await apiPatch('/settings/smtp', data);
            showToast('Impostazioni SMTP salvate', 'success');
        } catch (e) { showToast(e.message, 'error'); }
    });

    // Test SMTP
    document.getElementById('test-smtp')?.addEventListener('click', async () => {
        showToast('Funzionalità test email in sviluppo', 'info');
    });

    // Save backup settings
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
            showToast('Impostazioni backup salvate', 'success');
        } catch (e) { showToast(e.message, 'error'); }
    });
}
