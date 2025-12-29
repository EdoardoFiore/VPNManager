<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
// Ensure API Client is loaded
// Ensure API Client is loaded
require_once __DIR__ . '/../api_client.php';
require_once __DIR__ . '/i18n.php';

if (!isset($_SESSION['jwt_token']) && basename($_SERVER['PHP_SELF']) !== 'login.php') {
    header('Location: login.php');
    exit;
}
$currentUser = $_SESSION['username'] ?? 'User';
$currentRole = $_SESSION['role'] ?? 'viewer';

// Fetch Branding
$brandName = 'VPN Manager';
$brandColor = '#0054a6';
$brandLogo = '';
$brandFavicon = '';

$sysSettings = get_system_settings();
if (isset($sysSettings['success']) && $sysSettings['success'] && !empty($sysSettings['body'])) {
    $s = $sysSettings['body'];
    if (!empty($s['company_name']))
        $brandName = $s['company_name'];
    if (!empty($s['primary_color']))
        $brandColor = $s['primary_color'];
    if (!empty($s['logo_url']))
        $brandLogo = $s['logo_url'];
    if (!empty($s['favicon_url']))
        $brandFavicon = $s['favicon_url'];
}
?>
<!doctype html>
<html lang="<?= $current_lang ?>">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <?php if ($brandFavicon): ?>
        <link rel="icon" href="<?= htmlspecialchars($brandFavicon) ?>" />
    <?php else: ?>
        <!-- Default Favicon (SVG Data URI) -->
        <link rel="icon" href="data:image/svg+xml;base64,<?= base64_encode(str_replace('currentColor', $brandColor, '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" /><circle cx="12" cy="11" r="3" /><line x1="12" y1="14" x2="12" y2="15" /><circle cx="12" cy="16" r="1" fill="currentColor" /></svg>')) ?>" />
    <?php endif; ?>
    <title><?= __('dashboard') ?> - <?= htmlspecialchars($brandName) ?></title>
    <!-- CSS files -->
    <link href="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta17/dist/css/tabler.min.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta17/dist/css/tabler-flags.min.css"
        rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
    <link href="css/dark-theme.css?v=<?= time() ?>" rel="stylesheet" />
    <style>
        .card-actions {
            margin-left: auto;
        }

        .icon {
            width: 20px;
            height: 20px;
        }

        .cursor-pointer {
            cursor: pointer;
        }

        /* SortableJS Ghost Class for drag-and-drop preview */
        .sortable-ghost {
            background-color: #f0f8ff;
            /* Light blue background */
            opacity: 0.6;
        }

        .sortable-chosen {
            cursor: grabbing;
        }

        /* 1. Card Hover Effect */
        .instance-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .instance-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
        }

        /* 2. Wider Layout (Less "Claustrophobic") */
        @media (min-width: 1200px) {
            .container-xl {
                max-width: 1300px;
            }
        }

        /* 3. Notification Styles (Left Border) */
        .alert-success {
            border-left: 5px solid #2fb344 !important;
        }

        .alert-danger {
            border-left: 5px solid #d63939 !important;
        }

        /* Dynamic Branding */
        :root {
            --tblr-primary:
                <?= $brandColor ?>
            ;
        }

        .text-primary {
            color:
                <?= $brandColor ?>
                !important;
        }

        .bg-primary {
            background-color:
                <?= $brandColor ?>
                !important;
        }

        .btn-primary {
            background-color:
                <?= $brandColor ?>
                !important;
            border-color:
                <?= $brandColor ?>
                !important;
        }

        .nav-link.active {
            border-bottom-color:
                <?= $brandColor ?>
                !important;
            color:
                <?= $brandColor ?>
                !important;
        }

        .form-check-input:checked {
            background-color:
                <?= $brandColor ?>
                !important;
            border-color:
                <?= $brandColor ?>
                !important;
        }
    </style>
</head>

<body class="layout-boxed">
    <script>
        (function() {
            var theme = localStorage.getItem('theme');
            if (!theme) {
                theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            document.body.setAttribute('data-bs-theme', theme);
        })();
    </script>
    <?php export_translations_to_js(); ?>
    <div class="page">
        <!-- Navbar -->
        <header class="navbar navbar-expand-md d-print-none">
            <div class="container-xl">
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-menu">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <h1 class="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3">
                    <a href="index.php" class="d-flex align-items-center text-decoration-none">
                        <?php if ($brandLogo): ?>
                            <img src="<?= htmlspecialchars($brandLogo) ?>" alt="Logo" class="navbar-brand-image me-2"
                                style="height: 32px; width: auto;">
                        <?php else: ?>
                            <!-- Default SVG -->
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                class="icon text-primary me-2">
                                <path
                                    d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />
                                <circle cx="12" cy="11" r="3" />
                                <line x1="12" y1="14" x2="12" y2="15" />
                                <circle cx="12" cy="16" r="1" fill="currentColor" />
                            </svg>
                        <?php endif; ?>
                        <?= htmlspecialchars($brandName) ?>
                    </a>
                </h1>
                <div class="collapse navbar-collapse" id="navbar-menu">
                    <div class="d-flex flex-column flex-md-row flex-grow-1 align-items-center justify-content-end">
                        <ul class="navbar-nav">
                            <li class="nav-item">
                                <a class="nav-link" href="./index.php">
                                    <span
                                        class="nav-link-icon d-md-none d-lg-inline-block"><!-- Download SVG icon from http://tabler-icons.io/i/home -->
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                            stroke-linecap="round" stroke-linejoin="round"
                                            class="icon icon-tabler icons-tabler-outline icon-tabler-home">
                                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                            <path d="M5 12l-2 0l9 -9l9 9l-2 0" />
                                            <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" />
                                            <path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />
                                        </svg>
                                    </span>
                                    <span class="nav-link-title">
                                        <?= __('dashboard') ?>
                                    </span>
                                </a>
                            </li>
                            <?php if (in_array($currentRole, ['admin', 'admin_readonly'])): ?>
                                <li class="nav-item">
                                    <a class="nav-link" href="./machine_settings.php">
                                        <span
                                            class="nav-link-icon d-md-none d-lg-inline-block"><!-- Download SVG icon from http://tabler-icons.io/i/settings -->
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                                stroke-linecap="round" stroke-linejoin="round"
                                                class="icon icon-tabler icons-tabler-outline icon-tabler-settings">
                                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                                <path
                                                    d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
                                                <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                                            </svg>
                                        </span>
                                        <span class="nav-link-title">
                                            <?= __('machine_settings') ?>
                                        </span>
                                    </a>
                                </li>
                            <?php endif; ?>
                        </ul>
                    </div>
                </div>
                <div class="navbar-nav flex-row order-md-last">
                    <div class="nav-item d-none d-md-flex me-3">
                        <a href="#" class="nav-link px-0" onclick="toggleTheme(); return false;" title="Toggle Dark Mode" data-bs-toggle="tooltip" data-bs-placement="bottom">
                            <span id="theme-icon">
                                 <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" /></svg>
                            </span>
                        </a>
                    </div>
                    <!-- Language Switcher -->
                    <div class="nav-item dropdown me-3">
                        <a href="#" class="nav-link d-flex lh-1 text-reset p-0" data-bs-toggle="dropdown">
                            <?php if ($current_lang == 'it'): ?>
                                <span class="flag flag-country-it"></span>
                            <?php else: ?>
                                <span class="flag flag-country-gb"></span> <!-- 'gb' or 'us' -->
                            <?php endif; ?>
                        </a>
                        <div class="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
                            <a href="change_lang.php?lang=it" class="dropdown-item">
                                <span class="flag flag-country-it me-2"></span> Italiano
                            </a>
                            <a href="change_lang.php?lang=en" class="dropdown-item">
                                <span class="flag flag-country-gb me-2"></span> English
                            </a>
                        </div>
                    </div>

                    <div class="nav-item dropdown">
                        <a href="#" class="nav-link d-flex lh-1 text-reset p-0" data-bs-toggle="dropdown"
                            aria-label="Open user menu">
                            <span
                                class="avatar avatar-sm bg-blue-lt"><?= strtoupper(substr($currentUser, 0, 1)) ?></span>
                            <div class="d-none d-xl-block ps-2">
                                <div><?= htmlspecialchars($currentUser) ?></div>
                                <div class="mt-1 small text-muted">
                                    <?php
                                    $roleKey = 'role_' . $currentRole;
                                    // Simple translation for header badge, shortened if needed, or full
                                    echo htmlspecialchars(__($roleKey) !== $roleKey ? __($roleKey) : ucfirst($currentRole));
                                    ?>
                                </div>
                            </div>
                        </a>
                        <div class="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
                            <?php if ($currentRole == 'admin'): ?>
                                <a href="./users.php" class="dropdown-item"><?= __('users') ?></a>
                                <a href="./settings.php" class="dropdown-item"><?= __('settings') ?></a>
                            <?php endif; ?>
                            <!-- <a href="./settings.php" class="dropdown-item">Settings</a> -->
                            <div class="dropdown-divider"></div>
                            <a href="./logout.php" class="dropdown-item"><?= __('logout') ?></a>
                        </div>
                    </div>
                </div>
            </div>
        </header>
        <script>
            window.currentUser = '<?= $_SESSION['username'] ?? '' ?>';
            window.userRole = '<?= $_SESSION['role'] ?? '' ?>';
        </script>

        <div class="page-wrapper">
            <!-- Page body -->
            <div class="page-body">
                <div class="container-xl">