<?php
// index.php

require_once 'api_client.php';

$notification = null;

// --- Gestione Azioni POST ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add_client' && !empty($_POST['client_name'])) {
        $client_name = trim($_POST['client_name']);

        // Validazione del nome client
        if (preg_match('/^[a-zA-Z0-9_-]+$/', $client_name)) {
            $response = create_client($client_name);
            
            if ($response['success']) {
                // Se la risposta è un successo, il corpo contiene il file .ovpn
                // Inviamo il file per il download
                header('Content-Type: application/octet-stream');
                header('Content-Disposition: attachment; filename="' . $client_name . '.ovpn"');
                header('Content-Length: ' . strlen($response['body']));
                echo $response['body'];
                exit; // Termina lo script dopo il download
            } else {
                $error_detail = $response['body']['detail'] ?? 'Errore sconosciuto durante la creazione del client.';
                $notification = ['type' => 'danger', 'message' => 'Errore: ' . htmlspecialchars($error_detail)];
            }
        } else {
            $notification = ['type' => 'danger', 'message' => 'Nome client non valido. Usare solo lettere, numeri, trattini e underscore.'];
        }
    }

    if ($action === 'revoke_client' && !empty($_POST['client_name'])) {
        $client_name = $_POST['client_name'];
        $response = revoke_client($client_name);
        
        if ($response['success']) {
            $notification = ['type' => 'success', 'message' => 'Client ' . htmlspecialchars($client_name) . ' revocato con successo.'];
        } else {
            $error_detail = $response['body']['detail'] ?? 'Errore sconosciuto durante la revoca.';
            $notification = ['type' => 'danger', 'message' => 'Errore: ' . htmlspecialchars($error_detail)];
        }
    }
}

// --- Caricamento Dati per la Visualizzazione ---
$clients_response = get_clients();
$clients = [];
if ($clients_response['success']) {
    $clients = $clients_response['body'];
} else {
    $error_detail = $clients_response['body']['detail'] ?? 'Impossibile caricare i dati.';
    $notification = ['type' => 'danger', 'message' => 'Errore API: ' . htmlspecialchars($error_detail)];
}

function format_date($iso_string) {
    if (!$iso_string) return '<span class="text-muted">N/D</span>';
    try {
        $date = new DateTime($iso_string);
        return $date->format('d/m/Y H:i:s');
    } catch (Exception $e) {
        return '<span class="text-muted">N/D</span>';
    }
}
?>

<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pannello di Gestione VPN</title>
    <!-- Tabler Core CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/core@1.4.0/dist/css/tabler.min.css" />
    <!-- Tabler Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
    <style>
        body { min-width: 320px; }
    </style>
</head>
<body>
    <div class="page">
        <header class="navbar navbar-expand-md d-print-none">
            <div class="container-xl">
                <h1 class="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3">
                    <a href=".">Pannello di Gestione VPN</a>
                </h1>
            </div>
        </header>

        <div class="page-wrapper">
            <div class="page-body">
                <div class="container-xl">

                    <?php if ($notification): ?>
                        <div class="alert alert-<?php echo $notification['type']; ?> alert-dismissible" role="alert">
                            <?php echo $notification['message']; ?>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>
                    <?php endif; ?>

                    <div class="card mb-4">
                        <div class="card-header">
                            <h3 class="card-title">Aggiungi Nuovo Client</h3>
                        </div>
                        <div class="card-body">
                            <form action="index.php" method="POST">
                                <input type="hidden" name="action" value="add_client">
                                <div class="row g-2">
                                    <div class="col">
                                        <input type="text" name="client_name" class="form-control" placeholder="Es: laptop-mario-rossi" required>
                                    </div>
                                    <div class="col-auto">
                                        <button type="submit" class="btn btn-primary">
                                            <i class="ti ti-plus icon"></i> Crea e Scarica
                                        </button>
                                    </div>
                                </div>
                                <div class="form-text">
                                    Usare solo lettere, numeri, trattini (-) e underscore (_).
                                </div>
                            </form>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Client VPN</h3>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-vcenter card-table table-striped">
                                <thead>
                                    <tr>
                                        <th>Client</th>
                                        <th>IP Virtuale</th>
                                        <th>IP Reale</th>
                                        <th>Connesso Dal</th>
                                        <th class="w-1"></th>
                                    </tr>

                                </thead>
                                <tbody>
                                    <?php if (empty($clients)): ?>
                                        <tr>
                                            <td colspan="5" class="text-center text-muted">
                                                <i class="ti ti-server-off icon-lg my-3"></i>
                                                <p>Nessun client VPN trovato.</p>
                                            </td>
                                        </tr>
                                    <?php else: ?>
                                        <?php foreach ($clients as $client): ?>
                                            <tr>
                                                <td>
                                                    <span class="badge bg-<?php echo $client['status'] === 'connected' ? 'success' : 'secondary'; ?> me-1"></span>
                                                    <?php echo htmlspecialchars($client['name']); ?>
                                                </td>
                                                <td class="text-muted"><?php echo htmlspecialchars($client['virtual_ip'] ?? 'N/D'); ?></td>
                                                <td class="text-muted"><?php echo htmlspecialchars($client['real_ip'] ?? 'N/D'); ?></td>
                                                <td class="text-muted"><?php echo format_date($client['connected_since'] ?? null); ?></td>
                                                <td>
                                                    <form action="index.php" method="POST" onsubmit="return confirm('Sei sicuro di voler revocare <?php echo htmlspecialchars($client['name']); ?>?');">
                                                        <input type="hidden" name="action" value="revoke_client">
                                                        <input type="hidden" name="client_name" value="<?php echo htmlspecialchars($client['name']); ?>">
                                                        <button type="submit" class="btn btn-danger btn-sm" title="Revoca Client">
                                                            <i class="ti ti-trash"></i>
                                                        </button>
                                                    </form>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
    <!-- Tabler Core JS for features like alert dismissal -->
    <script src="https://cdn.jsdelivr.net/npm/@tabler/core@1.4.0/dist/js/tabler.min.js"></script>
</body>
</html>
