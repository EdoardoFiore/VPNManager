<?php
// settings.php
require_once 'includes/header.php';

// Only Admin access
if ($currentRole !== 'admin') {
    echo "<script>window.location.href = 'index.php';</script>";
    exit;
}
?>

<div class="container-xl">
    <div class="page-header d-print-none">
        <div class="row align-items-center">
            <div class="col">
                <h2 class="page-title">
                    Impostazioni di Sistema
                </h2>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <ul class="nav nav-tabs card-header-tabs" data-bs-toggle="tabs">
                <li class="nav-item">
                    <a href="#tabs-smtp" class="nav-link active" data-bs-toggle="tab">Configurazione SMTP</a>
                </li>
            </ul>
        </div>
        <div class="card-body">
            <div class="tab-content">
                <!-- SMTP Tab -->
                <div class="tab-pane active show" id="tabs-smtp">
                    <div class="row">
                        <div class="col-md-6">
                            <form id="smtp-form">
                                <div class="mb-3">
                                    <label class="form-label">Host SMTP</label>
                                    <input type="text" class="form-control" name="smtp_host"
                                        placeholder="smtp.example.com" required>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Porta</label>
                                            <input type="number" class="form-control" name="smtp_port" placeholder="587"
                                                required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Crittografia</label>
                                            <select class="form-select" name="smtp_encryption">
                                                <option value="none">Nessuna</option>
                                                <option value="tls">TLS</option>
                                                <option value="ssl">SSL</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Username SMTP</label>
                                    <input type="text" class="form-control" name="smtp_username"
                                        placeholder="user@example.com">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Password SMTP</label>
                                    <input type="password" class="form-control" name="smtp_password"
                                        placeholder="Password">
                                </div>
                                <hr>
                                <div class="mb-3">
                                    <label class="form-label">Nome Mittente</label>
                                    <input type="text" class="form-control" name="sender_name" placeholder="VPN Manager"
                                        required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Email Mittente</label>
                                    <input type="email" class="form-control" name="sender_email"
                                        placeholder="noreply@example.com" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">URL Pubblico Istanza</label>
                                    <input type="url" class="form-control" name="public_url" placeholder="https://vpn.example.com"
                                        title="L'URL base usato per i link nelle email (es. https://tuo-dominio.com)">
                                    <small class="form-hint">URL utilizzato per generare i link di configurazione inviati via email.</small>
                                </div>

                                <div class="d-flex">
                                    <button type="submit" class="btn btn-primary" id="btn-save-smtp">
                                        <i class="ti ti-device-floppy me-2"></i> Salva Configurazione
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div class="col-md-6">
                            <div class="card bg-muted-lt">
                                <div class="card-body">
                                    <h3 class="card-title">Test Invio Email</h3>
                                    <p class="text-muted">Invia una email di prova per verificare la configurazione
                                        salvata.</p>
                                    <form id="test-email-form">
                                        <div class="mb-3">
                                            <label class="form-label">Email Destinatario</label>
                                            <input type="email" class="form-control" id="test-email-dest"
                                                placeholder="tua@email.com" required>
                                        </div>
                                        <button type="button" class="btn btn-secondary w-100" id="btn-test-smtp">
                                            <i class="ti ti-mail me-2"></i> Invia Email di Test
                                        </button>
                                    </form>
                                    <div id="test-result" class="mt-3"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<div id="notification-container"></div>

<script src="js/settings.js"></script>

<?php require_once 'includes/footer.php'; ?>