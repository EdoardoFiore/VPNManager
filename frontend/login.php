<?php
session_start();
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

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if ($username && $password) {
        $result = login_user($username, $password);
        if ($result['success']) {
            $_SESSION['jwt_token'] = $result['token'];
            $_SESSION['username'] = $username;

            // Get user details (Role) to store in session for UI logic
            $user_details = api_request('/users/me');
            if ($user_details['success']) {
                $_SESSION['role'] = $user_details['body']['role'];
            } else {
                $_SESSION['role'] = 'viewer'; // Fallback
            }

            header('Location: index.php');
            exit;
        } else {
            $error = $result['error'];
        }
    } else {
        $error = __('login_error_missing');
    }
}
?>
<!doctype html>
<html lang="<?= $current_lang ?>">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title><?= __('login_title') ?></title>
    <!-- CSS files -->
    <link href="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta17/dist/css/tabler.min.css" rel="stylesheet" />
    <style>
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
    </style>
</head>

<body class=" d-flex flex-column">
    <div class="page page-center">
        <div class="container container-tight py-4">
            <div class="text-center mb-4">
                <!-- Custom Logo -->
                <?php if ($brandLogo): ?>
                    <img src="<?= htmlspecialchars($brandLogo) ?>" alt="Logo" class="navbar-brand-image mb-3"
                        style="max-height: 64px; max-width: 100%; width: auto;">
                <?php else: ?>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="icon text-primary mb-3">
                        <path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />
                        <circle cx="12" cy="11" r="3" />
                        <line x1="12" y1="14" x2="12" y2="15" />
                        <circle cx="12" cy="16" r="1" fill="currentColor" />
                    </svg>
                <?php endif; ?>
                <h2><?= htmlspecialchars($brandName) ?></h2>
            </div>
            <div class="card card-md">
                <div class="card-body">
                    <h2 class="h2 text-center mb-4"><?= __('login_header') ?></h2>
                    <?php if ($error): ?>
                        <div class="alert alert-danger" role="alert">
                            <?= htmlspecialchars($error) ?>
                        </div>
                    <?php endif; ?>
                    <form action="./login.php" method="post" autocomplete="off" novalidate>
                        <div class="mb-3">
                            <label class="form-label"><?= __('username_label') ?></label>
                            <input type="text" name="username" class="form-control" placeholder="<?= __('login_placeholder_user') ?>"
                                autocomplete="off" required>
                        </div>
                        <div class="mb-2">
                            <label class="form-label">
                                <?= __('password_label') ?>
                            </label>
                            <input type="password" name="password" class="form-control" placeholder="<?= __('login_placeholder_pass') ?>"
                                autocomplete="off" required>
                        </div>
                        <div class="form-footer">
                            <button type="submit" class="btn btn-primary w-100"><?= __('login_btn') ?></button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</body>

</html>