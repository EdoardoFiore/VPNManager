<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
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
$brandName = 'MADmin';
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
        <link rel="icon" href="data:image/svg+xml;base64,<?= base64_encode(str_replace('currentColor', $brandColor, '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" /><circle cx="12" cy="11" r="3" /><line x1="12" y1="14" x2="12" y2="15" /><circle cx="12" cy="16" r="1" fill="currentColor" /></svg>')) ?>" />
    <?php endif; ?>
    <title><?= __('dashboard') ?> - <?= htmlspecialchars($brandName) ?></title>
    <!-- CSS files -->
    <link href="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta17/dist/css/tabler.min.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta17/dist/css/tabler-flags.min.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
    <style>
        .icon { width: 20px; height: 20px; }
        .cursor-pointer { cursor: pointer; }
        
        /* Branding */
        :root { --tblr-primary: <?= $brandColor ?>; }
        .text-primary { color: <?= $brandColor ?> !important; }
        .bg-primary { background-color: <?= $brandColor ?> !important; }
        .btn-primary { background-color: <?= $brandColor ?> !important; border-color: <?= $brandColor ?> !important; }
        .form-check-input:checked { background-color: <?= $brandColor ?> !important; border-color: <?= $brandColor ?> !important; }

        /* Menu Highlights and Styling */
        .nav-link.active { 
            border-right: 3px solid <?= $brandColor ?>; 
            color: <?= $brandColor ?> !important; 
            background: rgba(var(--tblr-primary-rgb), 0.05); 
        }
        
        .nav-link:hover {
            background-color: rgba(var(--tblr-body-color-rgb), 0.04);
            color: var(--tblr-body-color);
            transition: all 0.2s ease;
        }

        /* 1. Card Hover Effect (Legacy CSS) */
        .instance-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .instance-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
        }

        /* 2. Notification Styles (Left Border) */
        .alert-success {
            border-left: 5px solid #2fb344 !important;
        }

        .alert-danger {
            border-left: 5px solid #d63939 !important;
        }
        
        /* Loading skeleton styles */
        .box-loading {
            animation: pulse 1.5s infinite ease-in-out;
            background-color: #e0e0e0; 
            background-image: linear-gradient(90deg, #e0e0e0 0px, #f0f0f0 40px, #e0e0e0 80px);
            background-size: 200% 100%;
            background-position: -100% 0;
        }

        [data-bs-theme="dark"] .box-loading {
            background-color: #333; 
            background-image: linear-gradient(90deg, #333 0px, #444 40px, #333 80px);
        }
        
        @keyframes pulse {
            0% { background-position: -100% 0; }
            100% { background-position: 100% 0; }
        }
    </style>
</head>

<body class="layout-fluid">
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
        <!-- Sidebar -->
        <aside class="navbar navbar-vertical navbar-expand-lg navbar-transparent">
            <div class="container-fluid">
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#sidebar-menu" aria-controls="sidebar-menu" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <h1 class="navbar-brand navbar-brand-autodark">
                    <a href="index.php">
                         <?php if ($brandLogo): ?>
                            <img src="<?= htmlspecialchars($brandLogo) ?>" alt="Logo" class="navbar-brand-image" style="height: 32px; width: auto;">
                        <?php else: ?>
                            <!-- Default SVG -->
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                class="icon text-primary me-2">
                                <path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />
                                <circle cx="12" cy="11" r="3" />
                                <line x1="12" y1="14" x2="12" y2="15" />
                                <circle cx="12" cy="16" r="1" fill="currentColor" />
                            </svg>
                            <?= htmlspecialchars($brandName) ?>
                        <?php endif; ?>
                    </a>
                </h1>
                
                <!-- Mobile User Menu -->
                <div class="navbar-nav flex-row d-lg-none">
                     <div class="nav-item">
                        <a href="logout.php" class="nav-link d-flex lh-1 text-reset p-0">
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" /><path d="M20 12h-13l3 -3m0 6l-3 -3" /></svg>
                        </a>
                    </div>
                </div>

                <div class="collapse navbar-collapse" id="sidebar-menu">
                    <ul class="navbar-nav pt-lg-3" id="dynamic-menu-container">
                        <!-- Dynamic Content Loading -->
                        <li class="nav-item">
                            <a class="nav-link" href="#">
                                <span class="nav-link-icon box-loading" style="width: 20px; height: 20px; background: #eee; border-radius: 4px;"></span>
                                <span class="nav-link-title box-loading" style="width: 100px; height: 16px; background: #eee; border-radius: 4px;"></span>
                            </a>
                        </li>
                    </ul>
                    
                    <!-- Bottom User Section in Sidebar -->
                    <div class="mt-auto p-3">
                         <div class="d-flex align-items-center mb-3">
                            <span class="avatar avatar-sm bg-blue-lt me-2"><?= strtoupper(substr($currentUser, 0, 1)) ?></span>
                            <div class="d-none d-xl-block">
                                <div><?= htmlspecialchars($currentUser) ?></div>
                                <div class="mt-1 small text-muted"><?= ucfirst($currentRole) ?></div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-4">
                                <a href="change_lang.php?lang=<?= $current_lang == 'it' ? 'en' : 'it' ?>" class="btn btn-ghost-secondary w-100 px-0" title="Switch Language">
                                    <?= $current_lang == 'it' ? 'EN' : 'IT' ?>
                                </a>
                            </div>
                            <div class="col-4">
                                <a href="#" class="btn btn-ghost-secondary w-100 px-0" id="dark-mode-toggle" title="Toggle Dark Mode">
                                     <!-- Initial Icon Placeholders - JS will update -->
                                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-moon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" /></svg>
                                </a>
                            </div>
                            <div class="col-4">
                                 <a href="logout.php" class="btn btn-ghost-danger w-100 px-0" title="<?= __('logout') ?>">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" /><path d="M20 12h-13l3 -3m0 6l-3 -3" /></svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>

        <script>
            window.currentUser = '<?= $_SESSION['username'] ?? '' ?>';
            window.userRole = '<?= $_SESSION['role'] ?? '' ?>';
            
            // Dark Mode Toggle Logic
            document.addEventListener("DOMContentLoaded", function() {
                const toggle = document.getElementById('dark-mode-toggle');
                const body = document.body;
                
                function updateIcon() {
                    const isDark = body.getAttribute('data-bs-theme') === 'dark';
                    if (isDark) {
                        toggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-sun" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="12" r="4" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" /></svg>`;
                        toggle.title = "Switch to Light Mode";
                    } else {
                         toggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-moon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" /></svg>`;
                         toggle.title = "Switch to Dark Mode";
                    }
                }
                
                // Init Icon
                updateIcon();
                
                toggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    const newTheme = body.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
                    body.setAttribute('data-bs-theme', newTheme);
                    localStorage.setItem('theme', newTheme);
                    updateIcon();
                });
            });

            // Dynamic Menu Loader
            document.addEventListener("DOMContentLoaded", function() {
                fetch('/api/core/menu', {
                    headers: {
                        'Authorization': 'Bearer ' + '<?= $_SESSION['jwt_token'] ?? '' ?>'
                    }
                })
                .then(response => response.json())
                .then(menu => {
                    const container = document.getElementById('dynamic-menu-container');
                    container.innerHTML = '';
                    
                    const renderMenuItem = (item) => {
                         if (item.header) {
                            return `<div class="nav-link disabled text-muted text-uppercase small mt-2 mb-1">${item.header}</div>`;
                        }
                        
                         // Check active state
                        const currentPath = window.location.pathname.split("/").pop();
                        const isActive = item.url === currentPath || (item.url === 'index.php' && currentPath === '');
                        const activeClass = isActive ? 'active' : '';
                        
                        // Handle Submenu
                        if (item.submenu && item.submenu.length > 0) {
                            let subHtml = `
                                <a class="nav-link dropdown-toggle" href="#navbar-extra" data-bs-toggle="dropdown" data-bs-auto-close="false" role="button" aria-expanded="false" >
                                    <span class="nav-link-icon d-md-none d-lg-inline-block"><i class="ti ti-${item.icon}"></i></span>
                                    <span class="nav-link-title">${item.label}</span>
                                </a>
                                <div class="dropdown-menu">
                                    <div class="dropdown-menu-columns">
                                        <div class="dropdown-menu-column">
                            `;
                            
                            item.submenu.forEach(sub => {
                                 const isSubActive = sub.url === currentPath ? 'active' : '';
                                 subHtml += `
                                    <a class="dropdown-item ${isSubActive}" href="${sub.url}">
                                        <span class="nav-link-icon d-md-none d-lg-inline-block me-1"><i class="ti ti-${sub.icon}" style="font-size:14px"></i></span>
                                        ${sub.label}
                                    </a>
                                 `;
                            });
                            
                            subHtml += `</div></div></div>`;
                            return `<li class="nav-item dropdown">${subHtml}</li>`;
                        }
                        
                        return `
                            <li class="nav-item ${activeClass}">
                                <a class="nav-link" href="${item.url}">
                                    <span class="nav-link-icon d-md-none d-lg-inline-block">
                                        <i class="ti ti-${item.icon}"></i> 
                                    </span>
                                    <span class="nav-link-title">
                                        ${item.label}
                                    </span>
                                </a>
                            </li>
                        `;
                    };
                    
                    menu.forEach(item => {
                         if (item.header) {
                             const header = document.createElement('li');
                             header.className = 'nav-item';
                             header.innerHTML = renderMenuItem(item);
                             container.appendChild(header);
                         } else {
                            // Helper to convert string info to DOM
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = renderMenuItem(item);
                            container.appendChild(tempDiv.firstElementChild);
                         }
                    });
                })
                .catch(err => console.error("Menu load failed", err));
            });
        </script>

        <div class="page-wrapper">
             <!-- Topbar for Mobile Toggling is handled by Sidebar's own toggler on small screens -->
            <!-- Page body -->
            <div class="page-body">
                <div class="container-xl">