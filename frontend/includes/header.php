<!doctype html>
<html lang="it">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>VPN Manager Dashboard</title>
    <!-- CSS files -->
    <link href="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta17/dist/css/tabler.min.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" rel="stylesheet" />
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
    </style>
</head>

<body class="layout-boxed">
    <div class="page">
        <!-- Navbar -->
        <header class="navbar navbar-expand-md navbar-light d-print-none">
            <div class="container-xl">
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-menu">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <h1 class="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3">
                    <a href="index.php">
                        <i class="ti ti-brand-openvpn me-2"></i> VPN Manager
                    </a>
                </h1>
                <div class="navbar-nav flex-row order-md-last">
                    <div class="nav-item">
                        <a href="https://github.com/edoardofiore/vpn_management_system" target="_blank"
                            class="nav-link px-0" title="Source Code" rel="noreferrer">
                            <i class="ti ti-brand-github icon"></i>
                        </a>
                    </div>
                </div>
            </div>
        </header>

        <div class="page-wrapper">
            <!-- Page body -->
            <div class="page-body">
                <div class="container-xl">