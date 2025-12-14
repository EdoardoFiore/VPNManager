// settings.js

document.addEventListener('DOMContentLoaded', function () {
    loadSMTPSettings();
    loadSystemSettings();
    loadBackupSettings(); // Added for backup settings

    document.getElementById('smtp-form').addEventListener('submit', function (e) {
        e.preventDefault();
        saveSMTPSettings();
    });

    document.getElementById('system-settings-form').addEventListener('submit', function (e) {
        e.preventDefault();
        saveSystemSettings();
    });

    document.getElementById('btn-test-smtp').addEventListener('click', testSMTPSettings);

    // Color Picker Sync
    const colorInput = document.querySelector('[name="primary_color"]');
    const colorText = document.querySelector('[name="primary_color_text"]');

    if (colorInput && colorText) {
        colorInput.addEventListener('input', (e) => {
            colorText.value = e.target.value;
            updatePreview();
        });
        colorText.addEventListener('input', (e) => {
            colorInput.value = e.target.value;
            updatePreview();
        });
        document.querySelector('[name="company_name"]').addEventListener('input', updatePreview);
    }

    // --- Backup Settings Listeners ---
    if (document.getElementById('backup-form')) {
        document.getElementById('btn-save-backup').addEventListener('click', function (e) { e.preventDefault(); saveBackupSettings(); });
        document.getElementById('btn-test-backup').addEventListener('click', function (e) { e.preventDefault(); testBackupConnection(); });
        const btnNow = document.getElementById('btn-backup-now');
        if (btnNow) btnNow.addEventListener('click', function (e) { e.preventDefault(); triggerManualBackup(); });
    }
});

function updatePreview() {
    const name = document.querySelector('[name="company_name"]').value || 'VPN Manager';
    const color = document.querySelector('[name="primary_color"]').value || '#0054a6';

    document.getElementById('preview-company-name').textContent = name;
    document.getElementById('preview-color-strip').style.backgroundColor = color;
    document.getElementById('preview-btn').style.backgroundColor = color;
    document.getElementById('preview-btn').style.borderColor = color;

    const svg = document.getElementById('preview-logo-default');
    if (svg) svg.style.color = color;
}

async function loadSystemSettings() {
    try {
        const response = await fetch(`${API_AJAX_HANDLER}?action=get_system_settings`);
        const result = await response.json();

        if (result.success && result.body) {
            const data = result.body;
            const form = document.getElementById('system-settings-form');

            form.querySelector('[name="company_name"]').value = data.company_name || 'VPN Manager';
            const color = data.primary_color || '#0054a6';
            form.querySelector('[name="primary_color"]').value = color;
            form.querySelector('[name="primary_color_text"]').value = color;

            if (data.logo_url) {
                const img = document.getElementById('preview-logo-img');
                const svg = document.getElementById('preview-logo-default');
                if (img && svg) {
                    img.src = data.logo_url;
                    img.classList.remove('d-none');
                    svg.classList.add('d-none');
                }
            }
            updatePreview();
        }
    } catch (e) {
        console.error("Error loading system settings:", e);
    }
}

async function saveSystemSettings() {
    const form = document.getElementById('system-settings-form');
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> Salvataggio...';
    btn.disabled = true;

    try {
        // 1. Text Settings
        const payload = {
            action: 'update_system_settings',
            company_name: form.querySelector('[name="company_name"]').value,
            primary_color: form.querySelector('[name="primary_color"]').value
        };

        const response = await fetch(API_AJAX_HANDLER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // Handler needs to support JSON!
            body: JSON.stringify(payload)
        });

        // Wait, PHP Ajax Handler usually expects POST Form Data to populate $_POST['action'].
        // JSON body requires wrapper.
        // Let's stick to URLSearchParams for text data as done in saveSMTPSettings.

        const textResponse = await fetch(API_AJAX_HANDLER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(payload)
        });
        const textResult = await textResponse.json();

        if (!textResult.success) throw new Error(textResult.body.detail || 'Errore salvataggio dati.');


        // 2. Logo Upload
        const logoInput = form.querySelector('[name="logo_file"]');
        if (logoInput.files.length > 0) {
            const formData = new FormData();
            formData.append('action', 'upload_logo');
            formData.append('file', logoInput.files[0]);
            formData.append('type', 'logo');

            const logoResponse = await fetch(API_AJAX_HANDLER, { method: 'POST', body: formData });
            const logoResult = await logoResponse.json();
            if (!logoResult.success) throw new Error('Errore upload logo: ' + (logoResult.body.detail));

            // Update preview immediately
            if (logoResult.body.url) {
                const img = document.getElementById('preview-logo-img');
                const svg = document.getElementById('preview-logo-default');
                if (img && svg) {
                    img.src = logoResult.body.url;
                    img.classList.remove('d-none');
                    svg.classList.add('d-none');
                }
            }
        }

        showNotification('success', 'Personalizzazione salvata!');

    } catch (e) {
        showNotification('danger', e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}


async function loadSMTPSettings() {
    try {
        const response = await fetch(`${API_AJAX_HANDLER}?action=get_smtp_settings`);
        const result = await response.json();

        if (result.success && result.body && Object.keys(result.body).length > 0) {
            const data = result.body;
            const form = document.getElementById('smtp-form');
            form.querySelector('[name="smtp_host"]').value = data.smtp_host || '';
            form.querySelector('[name="smtp_port"]').value = data.smtp_port || '';
            form.querySelector('[name="smtp_encryption"]').value = data.smtp_encryption || 'tls';
            form.querySelector('[name="smtp_username"]').value = data.smtp_username || '';
            form.querySelector('[name="sender_name"]').value = data.sender_name || '';
            form.querySelector('[name="sender_email"]').value = data.sender_email || '';
            form.querySelector('[name="public_url"]').value = data.public_url || '';
            // Password logic: likely don't show it back, or show placeholder
            if (data.smtp_password) {
                form.querySelector('[name="smtp_password"]').placeholder = "******** (Salvata)";
            }
        }
    } catch (e) {
        console.error("Error loading settings:", e);
        showNotification('danger', 'Errore nel caricamento delle impostazioni.');
    }
}

async function saveSMTPSettings() {
    const form = document.getElementById('smtp-form');
    const formData = new FormData(form);

    // Convert to object
    const data = {};
    formData.forEach((value, key) => data[key] = value);

    try {
        const response = await fetch(API_AJAX_HANDLER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'update_smtp_settings',
                ...data
            })
        });

        const result = await response.json();
        if (result.success) {
            showNotification('success', 'Impostazioni SMTP salvate.');
        } else {
            showNotification('danger', 'Errore salvataggio: ' + (result.body.detail || result.error));
        }

    } catch (e) {
        showNotification('danger', 'Errore di connessione: ' + e.message);
    }
}

async function testSMTPSettings() {
    const email = document.getElementById('test-email-dest').value;
    if (!email) {
        showNotification('warning', 'Inserisci una email destinatario.');
        return;
    }

    const btn = document.getElementById('btn-test-smtp');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> Invio...';
    btn.disabled = true;

    try {
        const response = await fetch(API_AJAX_HANDLER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'test_smtp_settings',
                email: email
            })
        });

        const result = await response.json();
        if (result.success) {
            showNotification('success', 'Email di test inviata con successo!');
        } else {
            showNotification('danger', 'Errore invio: ' + (result.body.detail || result.error));
        }
    } catch (e) {
        showNotification('danger', 'Errore di connessione: ' + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }

    // --- BACKUP SETTINGS HELPERS ---

    async function loadBackupSettings() {
        try {
            const response = await fetch(`${API_AJAX_HANDLER}?action=get_backup_settings`);
            const result = await response.json();
            if (result.success && result.body) {
                const data = result.body;
                const form = document.getElementById('backup-form');
                if (form) {
                    form.querySelector('[name="backup_enabled"]').checked = data.enabled || false;
                    form.querySelector('[name="backup_frequency"]').value = data.frequency || 'daily';
                    form.querySelector('[name="backup_time"]').value = data.time || '03:00';

                    form.querySelector('[name="remote_protocol"]').value = data.remote_protocol || 'sftp';
                    form.querySelector('[name="remote_host"]').value = data.remote_host || '';
                    form.querySelector('[name="remote_port"]').value = data.remote_port || 22;
                    form.querySelector('[name="remote_user"]').value = data.remote_user || '';
                    // Password is usually empty for security
                    form.querySelector('[name="remote_password"]').value = '';
                    form.querySelector('[name="remote_path"]').value = data.remote_path || '/';

                    // Status Update
                    const lastStatus = data.last_run_status || 'Mai eseguito';
                    const lastTime = data.last_run_time ? new Date(data.last_run_time).toLocaleString() : '-';

                    const statusEl = document.getElementById('backup-last-status');
                    if (statusEl) statusEl.textContent = lastStatus;

                    const timeEl = document.getElementById('backup-last-time');
                    if (timeEl) timeEl.textContent = lastTime;
                }
            }
        } catch (e) {
            console.error("Error loading backup settings:", e);
        }
    }

    async function saveBackupSettings() {
        const form = document.getElementById('backup-form');
        const btn = document.getElementById('btn-save-backup');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> Salvataggio...';
        btn.disabled = true;

        try {
            const payload = {
                action: 'update_backup_settings',
                enabled: form.querySelector('[name="backup_enabled"]').checked,
                frequency: form.querySelector('[name="backup_frequency"]').value,
                time: form.querySelector('[name="backup_time"]').value,
                remote_protocol: form.querySelector('[name="remote_protocol"]').value,
                remote_host: form.querySelector('[name="remote_host"]').value,
                remote_port: form.querySelector('[name="remote_port"]').value,
                remote_user: form.querySelector('[name="remote_user"]').value,
                remote_path: form.querySelector('[name="remote_path"]').value
            };

            const pwd = form.querySelector('[name="remote_password"]').value;
            if (pwd) payload.remote_password = pwd;

            // Use JSON body because ajax_handler.php decodes input for `update_backup_settings`
            const res = await fetch(API_AJAX_HANDLER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success) {
                showNotification('success', 'Configurazione Backup salvata!');
                loadBackupSettings(); // Reload to refresh status
            } else {
                throw new Error(result.error || (result.body && result.body.detail) || 'Errore sconosciuto');
            }
        } catch (e) {
            showNotification('danger', 'Errore salvataggio: ' + e.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async function testBackupConnection() {
        const form = document.getElementById('backup-form');
        const btn = document.getElementById('btn-test-backup');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> Test...';
        btn.disabled = true;

        try {
            const payload = {
                action: 'test_backup_connection',
                remote_protocol: form.querySelector('[name="remote_protocol"]').value,
                remote_host: form.querySelector('[name="remote_host"]').value,
                remote_port: form.querySelector('[name="remote_port"]').value,
                remote_user: form.querySelector('[name="remote_user"]').value,
                remote_path: form.querySelector('[name="remote_path"]').value,
                remote_password: form.querySelector('[name="remote_password"]').value
            };

            const res = await fetch(API_AJAX_HANDLER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success) {
                showNotification('success', 'Connessione Riuscita!');
            } else {
                showNotification('danger', 'Test Fallito: ' + (result.body?.detail || result.error || 'Errore'));
            }
        } catch (e) {
            showNotification('danger', 'Errore Test: ' + e.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async function triggerManualBackup() {
        const btn = document.getElementById('btn-backup-now');
        if (!confirm("Vuoi avviare il backup manuale adesso?")) return;

        btn.disabled = true;
        try {
            const response = await fetch(`${API_AJAX_HANDLER}?action=trigger_manual_backup`);
            const result = await response.json();
            if (result.success) {
                showNotification('success', 'Backup avviato in background.');
                setTimeout(loadBackupSettings, 2000);
            } else {
                showNotification('danger', 'Errore avvio backup.');
            }
        } catch (e) {
            showNotification('danger', 'Errore: ' + e.message);
        } finally {
            btn.disabled = false;
        }
    }

