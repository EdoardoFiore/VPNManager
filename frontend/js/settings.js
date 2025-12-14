// settings.js

document.addEventListener('DOMContentLoaded', function () {
    loadSMTPSettings();

    document.getElementById('smtp-form').addEventListener('submit', function (e) {
        e.preventDefault();
        saveSMTPSettings();
    });

    document.getElementById('btn-test-smtp').addEventListener('click', testSMTPSettings);
});

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
}
