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

        const logoInput = document.querySelector('[name="logo_file"]');
        if (logoInput) {
            logoInput.addEventListener('change', function (e) {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const img = document.getElementById('preview-logo-img');
                        const svg = document.getElementById('preview-logo-default');
                        if (img) {
                            img.src = e.target.result;
                            img.classList.remove('d-none');
                            if (svg) svg.classList.add('d-none');
                        }
                    }
                    reader.readAsDataURL(this.files[0]);
                }
            });
        }
    }

    // --- Backup Settings Listeners ---
    if (document.getElementById('backup-form')) {
        document.getElementById('btn-save-backup').addEventListener('click', function (e) { e.preventDefault(); saveBackupSettings(); });
        document.getElementById('btn-test-backup').addEventListener('click', function (e) { e.preventDefault(); testBackupConnection(); });
        const btnRemote = document.getElementById('btn-backup-remote');
        if (btnRemote) btnRemote.addEventListener('click', function (e) { e.preventDefault(); triggerRemoteBackup(); });

        const btnDownload = document.getElementById('btn-backup-download');
        if (btnDownload) btnDownload.addEventListener('click', function (e) { e.preventDefault(); triggerDownloadBackup(); });
    }

    const restoreForm = document.getElementById('restore-form');
    // We bind submit to open modal instead of confirm
    if (restoreForm) {
        restoreForm.addEventListener('submit', function (e) {
            e.preventDefault();
            // Check if file is selected
            if (this.querySelector('[name="backup_file"]').files.length === 0) return;

            // Open Modal
            const modal = new bootstrap.Modal(document.getElementById('modal-confirm-restore'));
            modal.show();
        });
    }

    // Modal Action Listeners
    // 1. Remote Backup Confirm
    const btnConfirmBackup = document.getElementById('btn-confirm-backup-remote');
    if (btnConfirmBackup) {
        btnConfirmBackup.addEventListener('click', function () {
            // Hide Modal
            const modalEl = document.getElementById('modal-confirm-backup');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            // Run logic
            executeRemoteBackup();
        });
    }

    // 2. Restore Confirm
    const btnConfirmRestore = document.getElementById('btn-confirm-restore-action');
    if (btnConfirmRestore) {
        btnConfirmRestore.addEventListener('click', function () {
            // Hide Modal
            const modalEl = document.getElementById('modal-confirm-restore');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            // Run logic form submisson
            if (restoreForm) {
                // We call the async handler manually passing the form element context if needed, 
                // or better, extract logic to a function.
                executeRestoreLogic(restoreForm);
            }
        });
    }
});

function updatePreview() {
    const name = document.querySelector('[name="company_name"]').value || 'VPN Manager';
    const color = document.querySelector('[name="primary_color"]').value || '#0054a6';

    document.getElementById('preview-company-name').textContent = name;

    // Use setProperty with 'important' to override utility classes like .bg-primary
    document.getElementById('preview-color-strip').style.setProperty('background-color', color, 'important');

    const btn = document.getElementById('preview-btn');
    btn.style.setProperty('background-color', color, 'important');
    btn.style.setProperty('border-color', color, 'important');

    const svg = document.getElementById('preview-logo-default');
    if (svg) svg.style.setProperty('color', color, 'important');
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
    btn.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> ' + __('saving');
    btn.disabled = true;

    try {
        // 1. Text Settings
        const payload = {
            action: 'update_system_settings',
            company_name: form.querySelector('[name="company_name"]').value,
            primary_color: form.querySelector('[name="primary_color"]').value
        };

        // Use URLSearchParams for simple text updates via POST
        const textResponse = await fetch(API_AJAX_HANDLER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(payload)
        });
        const textResult = await textResponse.json();

        if (!textResult.success) throw new Error(textResult.body.detail || __('save_data_error'));


        // 2. Logo Upload
        const logoInput = form.querySelector('[name="logo_file"]');
        if (logoInput.files.length > 0) {
            const formData = new FormData();
            formData.append('action', 'upload_logo');
            formData.append('file', logoInput.files[0]);
            formData.append('type', 'logo');

            const logoResponse = await fetch(API_AJAX_HANDLER, { method: 'POST', body: formData });
            const logoResult = await logoResponse.json();
            if (!logoResult.success) throw new Error(__('logo_upload_error') + ' ' + (logoResult.body.detail));

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

        showNotification('success', __('customization_saved'));
        setTimeout(() => location.reload(), 1500);

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
                form.querySelector('[name="smtp_password"]').placeholder = __('password_saved_placeholder');
            }
        }
    } catch (e) {
        console.error("Error loading settings:", e);
        showNotification('danger', __('settings_load_error'));
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
            showNotification('success', __('smtp_settings_saved'));
        } else {
            showNotification('danger', __('save_error') + ' ' + (result.body.detail || result.error));
        }

    } catch (e) {
        showNotification('danger', __('connection_error') + e.message);
    }
}

async function testSMTPSettings() {
    const email = document.getElementById('test-email-dest').value;
    if (!email) {
        showNotification('warning', __('enter_dest_email'));
        return;
    }

    const btn = document.getElementById('btn-test-smtp');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> ' + __('sending');
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
            showNotification('success', __('test_email_success'));
        } else {
            showNotification('danger', __('send_error') + ' ' + (result.body.detail || result.error));
        }
    } catch (e) {
        showNotification('danger', __('connection_error') + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
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
                const lastStatus = data.last_run_status || __('never_executed');
                const lastTime = data.last_run_time ? new Date(data.last_run_time).toLocaleString() : '-';

                const statusEl = document.getElementById('backup-last-status');
                if (statusEl) statusEl.textContent = lastStatus;

                const timeEl = document.getElementById('backup-last-time');
                if (timeEl) timeEl.textContent = lastTime;

                const btnRemote = document.getElementById('btn-backup-remote');
                if (btnRemote) {
                    if (!data.remote_host || !data.remote_user) {
                        btnRemote.disabled = true;
                        btnRemote.title = __('backup_remote_hint');
                    } else {
                        btnRemote.disabled = false;
                        btnRemote.title = "";
                    }
                }
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
    btn.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> ' + __('saving');
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
            showNotification('success', __('backup_config_saved'));
            loadBackupSettings(); // Reload to refresh status
        } else {
            throw new Error(result.error || (result.body && result.body.detail) || __('unknown_error'));
        }
    } catch (e) {
        showNotification('danger', __('save_error') + ' ' + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function testBackupConnection() {
    const form = document.getElementById('backup-form');
    const btn = document.getElementById('btn-test-backup');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<div class="spinner-border spinner-border-sm" role="status"></div> ${__('testing')}`;
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
            showNotification('success', __('connection_success'));
        } else {
            showNotification('danger', __('test_failed') + ' ' + (result.body?.detail || result.error || __('error')));
        }
    } catch (e) {
        showNotification('danger', __('test_error') + ' ' + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function triggerRemoteBackup() {
    // Show Modal instead of confirm
    const modal = new bootstrap.Modal(document.getElementById('modal-confirm-backup'));
    modal.show();
}

async function executeRemoteBackup() {
    const btn = document.getElementById('btn-backup-remote');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div> ' + __('starting');
    btn.disabled = true;
    try {
        const response = await fetch(`${API_AJAX_HANDLER}?action=trigger_manual_backup`);
        const result = await response.json();
        if (result.success) {
            showNotification('success', __('backup_started_remote'));
            setTimeout(loadBackupSettings, 2000);
        } else {
            showNotification('danger', __('backup_start_error') + ' ' + (result.body?.detail || __('unknown_error')));
        }
    } catch (e) {
        showNotification('danger', __('backup_error') + ' ' + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function triggerDownloadBackup() {
    // Direct link to handler which streams the file
    window.location.href = `${API_AJAX_HANDLER}?action=download_backup`;
}

async function executeRestoreLogic(form) {
    const btn = document.getElementById('btn-restore');
    const progressBar = document.getElementById('restore-progress');
    const fileInput = form.querySelector('[name="backup_file"]');

    if (fileInput.files.length === 0) return;

    btn.disabled = true;
    btn.innerHTML = __('restore_in_progress');
    progressBar.classList.remove('d-none');

    const formData = new FormData();
    formData.append('backup_file', fileInput.files[0]);
    formData.append('action', 'restore_backup'); // Passed as POST field for PHP handling

    try {
        const response = await fetch(API_AJAX_HANDLER, {
            method: 'POST',
            body: formData
            // Do NOT set Content-Type header when sending FormData, logic handles it
        });

        const result = await response.json();

        if (result.success) {
            showNotification('success', __('restore_completed_reload'));
            alert(__('restore_success_alert'));
            window.location.reload();
        } else {
            showNotification('danger', __('restore_error') + ' ' + (result.body?.detail || result.error || __('unknown_error')));
        }

    } catch (e) {
        showNotification('danger', __('restore_process_error') + ' ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="ti ti-history me-2"></i> ' + __('restore_backup_btn');
        progressBar.classList.add('d-none');
        form.reset();
    }
}