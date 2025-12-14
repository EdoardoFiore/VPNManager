<?php
// frontend/ajax_handler.php

require_once 'api_client.php';

header('Content-Type: application/json');

// Handle both traditional POST and JSON payload
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// If no action in GET/POST, try JSON body
if (empty($action)) {
    $input = file_get_contents('php://input');
    $json_data = json_decode($input, true);
    if ($json_data && isset($json_data['action'])) {
        $action = $json_data['action'];
    }
}

switch ($action) {
    case 'get_network_interfaces':
        $response = get_network_interfaces();
        echo json_encode($response);
        break;

    case 'get_instances':
        $response = get_instances();
        echo json_encode($response);
        break;

    case 'get_instance':
        $instance_id = $_GET['instance_id'] ?? '';
        if (empty($instance_id)) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'ID istanza mancante.']]);
            exit;
        }
        $response = get_instance($instance_id);
        echo json_encode($response);
        break;

    case 'create_instance':
        // Handle JSON payload
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (!$data || !isset($data['name']) || !isset($data['port']) || !isset($data['subnet'])) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati mancanti.']]);
            exit;
        }

        $response = create_instance(
            $data['name'],
            $data['port'],
            $data['subnet'],
            $data['protocol'] ?? 'udp',
            $data['tunnel_mode'] ?? 'full',
            $data['routes'] ?? [],
            $data['dns_servers'] ?? []
        );
        echo json_encode($response);
        break;

    case 'delete_instance':
        $instance_id = $_POST['instance_id'] ?? '';
        if (empty($instance_id)) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Instance ID mancante.']]);
            exit;
        }
        $response = delete_instance($instance_id);
        echo json_encode($response);
        break;

    case 'update_instance_routes':
        // Handle JSON payload
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (!$data || !isset($data['instance_id'])) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Instance ID mancante.']]);
            exit;
        }

        $response = update_instance_routes(
            $data['instance_id'],
            $data['tunnel_mode'] ?? 'full',
            $data['routes'] ?? [],
            $data['dns_servers'] ?? []
        );
        echo json_encode($response);
        break;

    case 'get_clients':
        $instance_id = $_GET['instance_id'] ?? '';
        if (empty($instance_id)) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'ID istanza mancante.']]);
            exit;
        }
        $response = get_clients($instance_id);
        echo json_encode($response);
        break;

    case 'create_client':
        $instance_id = $_POST['instance_id'] ?? '';
        $client_name = $_POST['client_name'] ?? '';
        if (empty($instance_id) || empty($client_name) || !preg_match('/^[a-zA-Z0-9_.-]+$/', $client_name)) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati non validi.']]);
            exit;
        }
        $response = create_client($instance_id, $client_name);
        echo json_encode($response);
        break;

    case 'download_client':
        $instance_id = $_GET['instance_id'] ?? '';
        $client_name = $_GET['client_name'] ?? '';
        if (empty($instance_id) || empty($client_name) || !preg_match('/^[a-zA-Z0-9_.-]+$/', $client_name)) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati non validi.']]);
            exit;
        }
        $response = download_client_config($instance_id, $client_name);
        if ($response['success']) {
            header('Content-Type: text/plain');
            header('Content-Disposition: attachment; filename="' . $client_name . '.conf"');
            echo $response['body'];
        } else {
            echo json_encode($response);
        }
        break;

    case 'revoke_client':
        $instance_id = $_POST['instance_id'] ?? '';
        $client_name = $_POST['client_name'] ?? '';
        if (empty($instance_id) || empty($client_name) || !preg_match('/^[a-zA-Z0-9_.-]+$/', $client_name)) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati non validi.']]);
            exit;
        }
        $response = revoke_client($instance_id, $client_name);
        echo json_encode($response);
        break;

    case 'get_top_clients':
        $response = get_top_clients();
        echo json_encode($response);
        break;

    // --- Groups & Rules Cases ---

    case 'get_groups':
        $instance_id = $_GET['instance_id'] ?? null;
        $response = get_groups($instance_id);
        echo json_encode($response);
        break;

    case 'create_group':
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (!$data || !isset($data['name']) || !isset($data['instance_id'])) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati mancanti.']]);
            exit;
        }
        $response = create_group($data['name'], $data['instance_id'], $data['description'] ?? '');
        echo json_encode($response);
        break;

    case 'delete_group':
        $group_id = $_POST['group_id'] ?? '';
        if (empty($group_id)) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'ID gruppo mancante.']]);
            exit;
        }
        $response = delete_group($group_id);
        echo json_encode($response);
        break;

    case 'add_group_member':
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (!$data || !isset($data['group_id']) || !isset($data['client_identifier']) || !isset($data['subnet_info'])) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati mancanti.']]);
            exit;
        }
        $response = add_group_member($data['group_id'], $data['client_identifier'], $data['subnet_info']);
        echo json_encode($response);
        break;

    case 'remove_group_member':
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (!$data || !isset($data['group_id']) || !isset($data['client_identifier']) || !isset($data['instance_name'])) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati mancanti.']]);
            exit;
        }
        $response = remove_group_member($data['group_id'], $data['client_identifier'], $data['instance_name']);
        echo json_encode($response);
        break;

    case 'get_rules':
        $group_id = $_GET['group_id'] ?? null;
        $response = get_rules($group_id);
        echo json_encode($response);
        break;

    case 'create_rule':
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        // Validazione minima
        if (!$data || !isset($data['group_id']) || !isset($data['action']) || !isset($data['destination'])) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati mancanti.']]);
            exit;
        }
        $response = create_rule(
            $data['group_id'],
            $data['action'],
            $data['protocol'] ?? 'all',
            $data['destination'],
            $data['port'] ?? null,
            $data['description'] ?? '',
            $data['order'] ?? null
        );
        echo json_encode($response);
        break;

    case 'delete_rule':
        $rule_id = $_POST['rule_id'] ?? '';
        if (empty($rule_id)) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'ID regola mancante.']]);
            exit;
        }
        $response = delete_rule($rule_id);
        echo json_encode($response);
        break;

    case 'reorder_rules':
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (!$data || !isset($data['orders'])) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati mancanti.']]);
            exit;
        }
        $response = reorder_rules($data['orders']);
        echo json_encode($response);
        break;

    case 'update_rule':
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (!$data || !isset($data['rule_id']) || !isset($data['group_id']) || !isset($data['action_type']) || !isset($data['protocol']) || !isset($data['destination'])) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati mancanti per aggiornare la regola del gruppo.']]);
            exit;
        }
        $response = update_group_firewall_rule(
            $data['rule_id'],
            $data['group_id'],
            $data['action_type'],
            $data['protocol'],
            $data['destination'],
            $data['port'] ?? null,
            $data['description'] ?? ''
        );
        echo json_encode($response);
        break;

    case 'update_instance_firewall_policy':
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (!$data || !isset($data['instance_id']) || !isset($data['default_policy'])) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati mancanti per aggiornamento policy firewall.']]);
            exit;
        }
        $response = update_instance_firewall_policy($data['instance_id'], $data['default_policy']);
        echo json_encode($response);
        break;



    // --- Machine Firewall Rules Cases ---

    case 'get_machine_firewall_rules':
        $response = get_machine_firewall_rules();
        echo json_encode($response);
        break;

    case 'add_machine_firewall_rule':
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (!$data || !isset($data['chain']) || !isset($data['action'])) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati mancanti per aggiungere la regola firewall macchina.']]);
            exit;
        }
        $response = add_machine_firewall_rule($data);
        echo json_encode($response);
        break;

    case 'delete_machine_firewall_rule':
        $rule_id = $_GET['rule_id'] ?? '';
        if (empty($rule_id)) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'ID regola macchina mancante.']]);
            exit;
        }
        $response = delete_machine_firewall_rule($rule_id);
        echo json_encode($response);
        break;

    case 'update_machine_firewall_rule':
        $rule_id = $_GET['rule_id'] ?? '';
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (empty($rule_id) || !$data) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati mancanti per aggiornare la regola.']]);
            exit;
        }
        $response = update_machine_firewall_rule($rule_id, $data);
        echo json_encode($response);
        break;

    case 'apply_machine_firewall_rules':
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (!$data) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati mancanti per applicare le regole firewall macchina.']]);
            exit;
        }
        $response = apply_machine_firewall_rules($data);
        echo json_encode($response);
        break;

    // --- Machine Network Interface Cases ---

    case 'get_machine_network_interfaces':
        $response = get_machine_network_interfaces();
        echo json_encode($response);
        break;

    case 'get_machine_network_interface_config':
        $interface_name = $_GET['interface_name'] ?? '';
        if (empty($interface_name)) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Nome interfaccia mancante.']]);
            exit;
        }
        $response = get_machine_network_interface_config($interface_name);
        echo json_encode($response);
        break;

    case 'update_machine_network_interface_config':
        $interface_name = $_GET['interface_name'] ?? ''; // From URL for DELETE/GET-like actions
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (empty($interface_name) || !$data) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'Dati mancanti per aggiornare la configurazione interfaccia.']]);
            exit;
        }
        $response = update_machine_network_interface_config($interface_name, $data);
        echo json_encode($response);
        break;

    case 'apply_global_netplan_config':
        $response = apply_global_netplan_config();
        echo json_encode($response);
        break;

    case 'get_smtp_settings':
        $response = get_smtp_settings();
        echo json_encode($response);
        break;

    case 'update_smtp_settings':
        $response = update_smtp_settings($_POST);
        echo json_encode($response);
        break;

    case 'test_smtp_settings':
        $email = $_POST['email'] ?? '';
        $response = test_smtp_settings($email);
        echo json_encode($response);
        break;

    case 'share_client_config':
        $instance_id = $_POST['instance_id'] ?? '';
        $client_name = $_POST['client_name'] ?? '';
        $email = $_POST['email'] ?? '';
        $response = share_client_config($instance_id, $client_name, $email);
        echo json_encode($response);
        break;

    case 'get_public_client_config':
        $token = $_GET['token'] ?? '';
        $response = api_request('/public/setup/' . urlencode($token), 'GET');
        echo json_encode($response);
        break;


    case 'get_system_settings':
        $response = get_system_settings();
        echo json_encode($response);
        break;

    case 'update_system_settings':
        $input = file_get_contents('php://input');
        $json_data = json_decode($input, true);

        $data = [];
        if ($json_data) {
            $data = $json_data;
        } else {
            $data = $_POST;
        }

        $response = update_system_settings($data);
        echo json_encode($response);
        break;

    case 'upload_logo':
        if (!isset($_FILES['file']) || !isset($_POST['type'])) {
            echo json_encode(['success' => false, 'body' => ['detail' => 'File o tipo mancante.']]);
            exit;
        }
        $response = upload_logo($_FILES['file'], $_POST['type']);
        echo json_encode($response);
        break;

    case 'get_backup_settings':
        echo json_encode(get_backup_settings());
        break;

    case 'update_backup_settings':
        $json_data = json_decode($input, true);
        $data = $json_data ?: $_POST;
        echo json_encode(update_backup_settings($data));
        break;

    case 'test_backup_connection':
        $json_data = json_decode($input, true);
        $data = $json_data ?: $_POST;
        echo json_encode(test_backup_connection($data));
        break;

    case 'trigger_manual_backup':
        echo json_encode(trigger_manual_backup());
        break;

    case 'download_backup':
        stream_backup_download();
        exit;

    default:

        echo json_encode(['success' => false, 'body' => ['detail' => 'Azione non riconosciuta.']]);
        break;

}

