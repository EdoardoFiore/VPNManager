<?php
// setup.php
require_once 'api_client.php';
require_once 'includes/i18n.php'; // Include i18n

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
<html lang="<?= $current_lang ?>">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
    <meta http-equiv="X-UA-Compatible" content="ie=edge"/>
    <title><?= __('vpn_configuration') ?></title>
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
                <div class="mt-2 text-muted"><?= __('verifying_link') ?></div>
            </div>

            <div id="error-state" class="card card-md d-none">
                <div class="card-body text-center">
                    <div class="mb-3">
                        <i class="ti ti-alert-circle text-danger display-4"></i>
                    </div>
                    <h2 class="h2 text-danger"><?= __('invalid_link_title') ?></h2>
                    <p class="text-muted"><?= __('invalid_link_message') ?></p>
                </div>
            </div>

            <div id="success-state" class="card card-md d-none">
                <div class="card-body">
                    <div class="d-flex align-items-center justify-content-between mb-4">
                        <div>
                            <h2 class="h2 mb-0"><?= __('hello') ?> <span id="client-name-display" class="text-primary"></span></h2>
                            <p class="text-muted mb-0"><?= __('config_ready_message') ?></p>
                        </div>
                        <div class="avatar bg-blue-lt rounded text-uppercase" id="client-initials">VPN</div>
                    </div>
                    
                    <div class="card-header-tabs nav-fill mb-4">
                         <ul class="nav nav-pills w-100 p-2 bg-muted-lt rounded" data-bs-toggle="tabs">
                            <li class="nav-item">
                                <a href="#tabs-mobile" class="nav-link active py-2" data-bs-toggle="tab">
                                    <i class="ti ti-device-mobile me-2"></i> <?= __('smartphone_tablet') ?>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a href="#tabs-desktop" class="nav-link py-2" data-bs-toggle="tab">
                                    <i class="ti ti-device-desktop me-2"></i> <?= __('pc_mac') ?>
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
                                    <h3 class="mb-3"><?= __('instructions_step') ?></h3>
                                    <ul class="list-group list-group-flush bg-transparent">
                                        <li class="list-group-item bg-transparent px-0">
                                            <div class="mb-1"><strong><?= __('download_app_step') ?></strong></div>
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
                                            <strong><?= __('open_wireguard_step_mobile') ?></strong>
                                        </li>
                                        <li class="list-group-item bg-transparent px-0">
                                            <strong><?= __('scan_qr_step') ?></strong>
                                        </li>
                                        <li class="list-group-item bg-transparent px-0">
                                            <strong><?= __('activate_step') ?></strong>
                                        </li>
                                    </ul>
                                </div>

                                <!-- QR Card (Second on Mobile, Right on Desktop) -->
                                <div class="col-md-5">
                                    <div class="card h-100 bg-white border shadow-sm">
                                        <div class="card-body d-flex flex-column align-items-center justify-content-center text-center p-4">
                                            <h4 class="card-title text-primary mb-3"><?= __('scan_title') ?></h4>
                                            <div id="qrcode-container" class="p-2 border rounded mb-3 bg-white"></div>
                                            <div class="text-muted small"><i class="ti ti-lock"></i> <?= __('secure') ?></div>
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
                                                <i class="ti ti-download me-2"></i> <?= __('download_config') ?>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Instructions -->
                                <div class="col-md-7 order-md-1">
                                    <h3 class="mb-3"><?= __('instructions_step') ?></h3>
                                    <ul class="list-group list-group-flush bg-transparent">
                                        <li class="list-group-item bg-transparent px-0">
                                            <div class="mb-1"><strong><?= __('install_client_step') ?></strong></div>
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
                                            <strong><?= __('download_conf_step') ?></strong>
                                        </li>
                                        <li class="list-group-item bg-transparent px-0">
                                            <strong><?= __('import_tunnel_step') ?></strong>
                                        </li>
                                        <li class="list-group-item bg-transparent px-0">
                                            <strong><?= __('click_activate_step') ?></strong>
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
    <script>
        // No inline logic here
    </script>
    <script src="./js/setup.js"></script>
</body>
</html>