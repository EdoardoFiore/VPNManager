<?php
// setup.php
require_once 'api_client.php';

// Fetch Branding
$brandName = 'VPN Manager';
$brandColor = '#0054a6';
$brandLogo = '';

$sysSettings = get_system_settings();
if (isset($sysSettings['success']) && $sysSettings['success'] && !empty($sysSettings['body'])) {
    $s = $sysSettings['body'];
    if (!empty($s['company_name']))
        $brandName = $s['company_name'];
    if (!empty($s['primary_color']))
        $brandColor = $s['primary_color'];
    if (!empty($s['logo_url']))
        $brandLogo = $s['logo_url'];
}
?>
<!doctype html>
<html lang="it">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
    <meta http-equiv="X-UA-Compatible" content="ie=edge"/>
    <title>Configurazione VPN</title>
    <!-- CSS files -->
    <link href="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta17/dist/css/tabler.min.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" rel="stylesheet" />
    <style>
        :root {
            --tblr-primary: <?= $brandColor ?>;
        }
        .text-primary { color: <?= $brandColor ?> !important; }
        .bg-primary { background-color: <?= $brandColor ?> !important; }
        .btn-primary { 
            background-color: <?= $brandColor ?> !important; 
            border-color: <?= $brandColor ?> !important; 
        }
        /* Spinner color override */
        .spinner-border.text-primary { color: <?= $brandColor ?> !important; }
    </style>
</head>
<body class="d-flex flex-column bg-light">
    <div class="page page-center">
        <div class="container container-sm py-4">
            <div class="text-center mb-4">
                <a href="." class="navbar-brand navbar-brand-autodark" style="text-decoration: none;">
                    <?php if ($brandLogo): ?>
                            <img src="<?= htmlspecialchars($brandLogo) ?>" alt="Logo" style="height: 48px; width: auto; vertical-align: middle;">
                    <?php else: ?>
                            <i class="ti ti-shield-lock text-primary" style="font-size: 2rem; vertical-align: middle;"></i>
                    <?php endif; ?>
                    <span class="ms-2" style="font-size: 1.5rem; vertical-align: middle; color: inherit;"><?= htmlspecialchars($brandName) ?></span>
                </a>
            </div>
            
            <div id="loading-state" class="text-center">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="mt-2 text-muted">Verifica del link in corso...</div>
            </div>

            <div id="error-state" class="card card-md d-none">
                <div class="card-body text-center">
                    <div class="mb-3">
                        <i class="ti ti-alert-circle text-danger display-4"></i>
                    </div>
                    <h2 class="h2 text-danger">Link Invalido o Scaduto</h2>
                    <p class="text-muted">Il link che hai utilizzato non è valido o è scaduto. Per favore contatta l'amministratore per riceverne uno nuovo.</p>
                </div>
            </div>

            <div id="success-state" class="card card-md d-none">
                <div class="card-body">
                    <div class="d-flex align-items-center justify-content-between mb-4">
                        <div>
                            <h2 class="h2 mb-0">Ciao, <span id="client-name-display" class="text-primary"></span></h2>
                            <p class="text-muted mb-0">Ecco la tua configurazione VPN sicura.</p>
                        </div>
                        <div class="avatar bg-blue-lt rounded text-uppercase" id="client-initials">VPN</div>
                    </div>
                    
                    <div class="card-header-tabs nav-fill mb-4">
                         <ul class="nav nav-pills w-100 p-2 bg-muted-lt rounded" data-bs-toggle="tabs">
                            <li class="nav-item">
                                <a href="#tabs-mobile" class="nav-link active py-2" data-bs-toggle="tab">
                                    <i class="ti ti-device-mobile me-2"></i> Smartphone / Tablet
                                </a>
                            </li>
                            <li class="nav-item">
                                <a href="#tabs-desktop" class="nav-link py-2" data-bs-toggle="tab">
                                    <i class="ti ti-device-desktop me-2"></i> PC / Mac
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div class="tab-content">
                        <!-- MOBILE TAB -->
                        <div class="tab-pane active show" id="tabs-mobile">
                            <div class="row g-4">
                                <!-- Instructions (First on Mobile, Left on Desktop) -->
                                <div class="col-md-7">
                                    <h3 class="mb-3">1. Istruzioni</h3>
                                    <ul class="list-group list-group-flush bg-transparent">
                                        <li class="list-group-item bg-transparent px-0">
                                            <div class="mb-1"><strong>1. Scarica l'App</strong></div>
                                            <div class="d-flex gap-2">
                                                <a href="https://play.google.com/store/apps/details?id=com.wireguard.android" target="_blank" class="btn btn-sm btn-outline-dark">
                                                    <i class="ti ti-brand-android me-1"></i> Android
                                                </a>
                                                <a href="https://apps.apple.com/us/app/wireguard/id1441195209" target="_blank" class="btn btn-sm btn-outline-dark">
                                                    <i class="ti ti-brand-apple me-1"></i> iOS
                                                </a>
                                            </div>
                                        </li>
                                        <li class="list-group-item bg-transparent px-0">
                                            <strong>2. Apri WireGuard</strong> e premi il tasto <strong>+</strong>
                                        </li>
                                        <li class="list-group-item bg-transparent px-0">
                                            <strong>3. Scegli "Scansiona QR"</strong> e inquadra il codice.
                                        </li>
                                        <li class="list-group-item bg-transparent px-0">
                                            <strong>4. Attiva</strong> la connessione.
                                        </li>
                                    </ul>
                                </div>

                                <!-- QR Card (Second on Mobile, Right on Desktop) -->
                                <div class="col-md-5">
                                    <div class="card h-100 bg-white border shadow-sm">
                                        <div class="card-body d-flex flex-column align-items-center justify-content-center text-center p-4">
                                            <h4 class="card-title text-primary mb-3">2. Scansiona</h4>
                                            <div id="qrcode-container" class="p-2 border rounded mb-3 bg-white"></div>
                                            <div class="text-muted small"><i class="ti ti-lock"></i> Sicuro</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- DESKTOP TAB -->
                        <div class="tab-pane" id="tabs-desktop">
                             <div class="row g-4 align-items-center">
                                <!-- Download Card -->
                                <div class="col-md-5 order-md-2">
                                    <div class="card h-100 bg-light border-0">
                                        <div class="card-body d-flex flex-column align-items-center justify-content-center text-center p-4">
                                            <i class="ti ti-file-settings text-primary mb-3" style="font-size: 3rem;"></i>
                                            <button id="btn-download-config" class="btn btn-primary w-100 btn-pill">
                                                <i class="ti ti-download me-2"></i> Scarica Config
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Instructions -->
                                <div class="col-md-7 order-md-1">
                                    <h3 class="mb-3">Istruzioni</h3>
                                    <ul class="list-group list-group-flush bg-transparent">
                                        <li class="list-group-item bg-transparent px-0">
                                            <div class="mb-1"><strong>1. Installa Client</strong></div>
                                            <div class="d-flex gap-2">
                                                <a href="https://download.wireguard.com/windows-client/wireguard-installer.exe" target="_blank" class="btn btn-sm btn-outline-primary">
                                                    Windows
                                                </a>
                                                <a href="https://apps.apple.com/us/app/wireguard/id1451685025?mt=12" target="_blank" class="btn btn-sm btn-outline-primary">
                                                    MacOS
                                                </a>
                                            </div>
                                        </li>
                                        <li class="list-group-item bg-transparent px-0">
                                            <strong>2. Scarica il file .conf</strong> dal pulsante a fianco.
                                        </li>
                                        <li class="list-group-item bg-transparent px-0">
                                            <strong>3. Apri WireGuard</strong> > Importa Tunnel da File.
                                        </li>
                                        <li class="list-group-item bg-transparent px-0">
                                            <strong>4. Clicca "Attiva"</strong>.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Libs JS -->
    <script src="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta17/dist/js/tabler.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <!-- Page JS -->
    <script>
        const API_AJAX_HANDLER = './ajax_handler.php'; // Reuse existing handler? 
        // Wait, ajax_handler checks for SESSION mostly? 
        // NO, ajax_handler calls `api_client` which calls Backend.
        // Backend `get_public_client_config` is PUBLIC (No Auth).
        // `api_client.php` adds Bearer token if session exists. If not, no header.
        // So public endpoint logic should work even without session.
        // BUT `ajax_handler.php` doesn't enforce auth globally? 
        // `ajax_handler.php` requires `api_client.php`.
        // `api_client.php` starts session. 
        // It should be fine.
        
        // However, `ajax_handler.php` switches on actions. We need a new action `get_public_config`.
        // I need to add that to `ajax_handler.php`.
    </script>
    <script src="./js/setup.js"></script>
</body>
</html>
