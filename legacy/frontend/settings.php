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
                    <?= __('system_settings_title') ?>
                </h2>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <ul class="nav nav-tabs card-header-tabs" data-bs-toggle="tabs">
                <li class="nav-item">
                    <a href="#tabs-general" class="nav-link active"
                        data-bs-toggle="tab"><?= __('general_customization') ?></a>
                </li>
                <li class="nav-item">
                    <a href="#tabs-smtp" class="nav-link" data-bs-toggle="tab"><?= __('smtp_configuration') ?></a>
                </li>
                <li class="nav-item">
                    <a href="#tabs-backup" class="nav-link" data-bs-toggle="tab"><?= __('backup_restore') ?></a>
                </li>
            </ul>
        </div>
        <div class="card-body">
            <div class="tab-content">
                <!-- GENERAL TAB -->
                <div class="tab-pane active show" id="tabs-general">
                    <div class="row">
                        <div class="col-md-6">
                            <form id="system-settings-form">
                                <div class="mb-3">
                                    <label class="form-label"><?= __('company_name_label') ?></label>
                                    <input type="text" class="form-control" name="company_name"
                                        placeholder="VPN Manager">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><?= __('primary_color_label') ?></label>
                                    <div class="row g-2">
                                        <div class="col-auto">
                                            <input type="color" class="form-control form-control-color"
                                                name="primary_color" value="#0054a6" title="<?= __('choose_color') ?>">
                                        </div>
                                        <div class="col">
                                            <input type="text" class="form-control" name="primary_color_text"
                                                value="#0054a6" placeholder="#0054a6">
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><?= __('custom_logo_label') ?></label>
                                    <input type="file" class="form-control" name="logo_file"
                                        accept=".png,.jpg,.jpeg,.svg">
                                    <small class="form-hint"><?= __('logo_help') ?></small>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><?= __('custom_favicon_label') ?></label>
                                    <input type="file" class="form-control" name="favicon_file"
                                        accept=".png,.jpg,.jpeg,.svg,.ico">
                                    <small class="form-hint"><?= __('favicon_help') ?></small>
                                </div>

                                <div class="mt-4 d-flex gap-2">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="ti ti-device-floppy me-2"></i> <?= __('save_settings') ?>
                                    </button>
                                    <button type="button" class="btn btn-warning" id="btn-reset-system-settings">
                                        <i class="ti ti-rotate-clockwise me-2"></i> <?= __('reset_to_default') ?>
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div class="col-md-6">
                            <!-- Preview Card -->
                            <div class="card">
                                <div class="card-status-top bg-primary" id="preview-color-strip"></div>
                                <div class="card-body text-center">
                                    <h3 class="card-title text-muted"><?= __('branding_preview') ?></h3>
                                    <div class="my-4">
                                        <!-- Placeholder or current logo -->
                                        <div id="preview-logo-container"
                                            class="d-flex justify-content-center align-items-center"
                                            style="height: 60px;">
                                            <img src="" id="preview-logo-img" class="d-none"
                                                style="max-height: 60px; max-width: 100%; object-fit: contain;">
                                            <svg id="preview-logo-default" xmlns="http://www.w3.org/2000/svg" width="48"
                                                height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                                class="icon text-primary">
                                                <path
                                                    d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />
                                                <circle cx="12" cy="11" r="3" />
                                                <line x1="12" y1="14" x2="12" y2="15" />
                                                <circle cx="12" cy="16" r="1" fill="currentColor" />
                                            </svg>
                                        </div>
                                        <h2 class="mt-2" id="preview-company-name">VPN Manager</h2>
                                    </div>
                                    <div class="my-4">
                                        <h4 class="text-muted"><?= __('custom_favicon_label') ?></h4>
                                        <div id="preview-favicon-container" class="d-flex justify-content-center align-items-center" style="height: 32px;">
                                              <img src="" id="preview-favicon-img" class="d-none" style="height: 32px; width: 32px; object-fit: contain;">
                                              <svg id="preview-favicon-default" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="<?= $brandColor ?>" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                                                  <path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />
                                                  <circle cx="12" cy="11" r="3" />
                                                  <line x1="12" y1="14" x2="12" y2="15" />
                                                  <circle cx="12" cy="16" r="1" fill="<?= $brandColor ?>" />
                                              </svg>
                                        </div>
                                    </div>
                                    <button class="btn btn-primary"
                                        id="preview-btn"><?= __('button_example') ?></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SMTP Tab -->
                <div class="tab-pane" id="tabs-smtp">

                    <div class="row">
                        <div class="col-md-6">
                            <form id="smtp-form">
                                <div class="mb-3">
                                    <label class="form-label"><?= __('smtp_host_label') ?></label>
                                    <input type="text" class="form-control" name="smtp_host"
                                        placeholder="smtp.example.com" required>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label"><?= __('port') ?></label>
                                            <input type="number" class="form-control" name="smtp_port" placeholder="587"
                                                required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label"><?= __('encryption_label') ?></label>
                                            <select class="form-select" name="smtp_encryption">
                                                <option value="none"><?= __('none') ?></option>
                                                <option value="tls">TLS</option>
                                                <option value="ssl">SSL</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><?= __('smtp_username_label') ?></label>
                                    <input type="text" class="form-control" name="smtp_username"
                                        placeholder="user@example.com">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><?= __('smtp_password_label') ?></label>
                                    <input type="password" class="form-control" name="smtp_password"
                                        placeholder="Password">
                                </div>
                                <hr>
                                <div class="mb-3">
                                    <label class="form-label"><?= __('sender_name_label') ?></label>
                                    <input type="text" class="form-control" name="sender_name" placeholder="VPN Manager"
                                        required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><?= __('sender_email_label') ?></label>
                                    <input type="email" class="form-control" name="sender_email"
                                        placeholder="noreply@example.com" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><?= __('public_url_label') ?></label>
                                    <input type="url" class="form-control" name="public_url"
                                        placeholder="https://vpn.example.com" title="<?= __('public_url_help') ?>">
                                    <small class="form-hint"><?= __('public_url_hint') ?></small>
                                </div>

                                <div class="d-flex">
                                    <button type="submit" class="btn btn-primary" id="btn-save-smtp">
                                        <i class="ti ti-device-floppy me-2"></i> <?= __('save_configuration') ?>
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div class="col-md-6">
                            <div class="card bg-muted-lt">
                                <div class="card-body">
                                    <h3 class="card-title"><?= __('test_email_title') ?></h3>
                                    <p class="text-muted"><?= __('test_email_desc') ?></p>
                                    <form id="test-email-form">
                                        <div class="mb-3">
                                            <label class="form-label"><?= __('recipient_email_label') ?></label>
                                            <input type="email" class="form-control" id="test-email-dest"
                                                placeholder="tua@email.com" required>
                                        </div>
                                        <button type="button" class="btn btn-secondary w-100" id="btn-test-smtp">
                                            <i class="ti ti-mail me-2"></i> <?= __('send_test_email_btn') ?>
                                        </button>
                                    </form>
                                    <div id="test-result" class="mt-3"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BACKUP Tab -->
                <div class="tab-pane" id="tabs-backup">
                    <div class="row">
                        <div class="col-md-6">
                            <form id="backup-form">
                                <div class="mb-3">
                                    <label class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" name="backup_enabled">
                                        <span class="form-check-label"><?= __('enable_recurring_backup') ?></span>
                                    </label>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label"><?= __('frequency_label') ?></label>
                                            <select class="form-select" name="backup_frequency">
                                                <option value="daily"><?= __('daily') ?></option>
                                                <option value="weekly"><?= __('weekly') ?></option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label"><?= __('time_label') ?></label>
                                            <input type="time" class="form-control" name="backup_time" value="03:00">
                                        </div>
                                    </div>
                                </div>

                                <h3 class="mt-4"><?= __('remote_destination_title') ?></h3>
                                <div class="mb-3">
                                    <label class="form-label"><?= __('protocol') ?></label>
                                    <select class="form-select" name="remote_protocol">
                                        <option value="sftp">SFTP (SSH)</option>
                                        <option value="ftp">FTP</option>
                                    </select>
                                </div>
                                <div class="row">
                                    <div class="col-md-8">
                                        <div class="mb-3">
                                            <label class="form-label"><?= __('remote_host_label') ?></label>
                                            <input type="text" class="form-control" name="remote_host"
                                                placeholder="backup.example.com">
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label class="form-label"><?= __('port') ?></label>
                                            <input type="number" class="form-control" name="remote_port" value="22">
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><?= __('username') ?></label>
                                    <input type="text" class="form-control" name="remote_user" placeholder="backupuser">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><?= __('password') ?></label>
                                    <input type="password" class="form-control" name="remote_password"
                                        placeholder="********">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><?= __('remote_path_label') ?></label>
                                    <input type="text" class="form-control" name="remote_path"
                                        placeholder="/var/backups/vpn">
                                </div>

                                <div class="d-flex gap-2 mt-4">
                                    <button type="submit" class="btn btn-primary" id="btn-save-backup">
                                        <i class="ti ti-device-floppy me-2"></i> <?= __('save_configuration') ?>
                                    </button>
                                    <button type="button" class="btn btn-secondary" id="btn-test-backup">
                                        <i class="ti ti-plug me-2"></i> <?= __('test_connection_btn') ?>
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div class="col-md-6">
                            <!-- Status & Manual Backup -->
                            <div class="card mb-3">
                                <div class="card-status-top bg-green"></div>
                                <div class="card-body">
                                    <h3 class="card-title"><?= __('backup_status_title') ?></h3>
                                    <dl class="row">
                                        <dt class="col-5"><?= __('last_backup_label') ?></dt>
                                        <dd class="col-7" id="backup-last-time">-</dd>
                                        <dt class="col-5"><?= __('outcome_label') ?></dt>
                                        <dd class="col-7" id="backup-last-status">-</dd>
                                    </dl>
                                    <p class="text-muted small"><?= __('backup_info_text') ?></p>
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-primary" id="btn-backup-remote">
                                            <i class="ti ti-cloud-upload me-2"></i> <?= __('remote_backup_btn') ?>
                                        </button>
                                        <button class="btn btn-outline-secondary" id="btn-backup-download">
                                            <i class="ti ti-download me-2"></i> <?= __('download_backup_btn') ?>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Restore Card -->
                            <div class="card border-danger mt-3">
                                <div class="card-status-top bg-danger"></div>
                                <div class="card-body">
                                    <h3 class="card-title text-danger"><?= __('restore_backup_title') ?></h3>
                                    <p class="text-muted small"><?= __('restore_backup_desc') ?></p>
                                    <div class="alert alert-warning">
                                        <i class="ti ti-alert-triangle me-2"></i>
                                        <strong><?= __('warning_label') ?></strong> <?= __('restore_warning_text') ?>
                                    </div>
                                    <form id="restore-form">
                                        <div class="mb-3">
                                            <input type="file" class="form-control" name="backup_file" accept=".zip"
                                                required>
                                        </div>
                                        <button type="submit" class="btn btn-danger w-100" id="btn-restore">
                                            <i class="ti ti-history me-2"></i> <?= __('restore_backup_action') ?>
                                        </button>
                                    </form>
                                    <div id="restore-progress" class="mt-3 d-none">
                                        <div class="progress">
                                            <div class="progress-bar progress-bar-indeterminate bg-danger"></div>
                                        </div>
                                        <div class="text-center small mt-1 text-muted"><?= __('restore_loading') ?>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="notification-container"></div>

                <!-- Backup Confirmation Modal -->
                <div class="modal modal-blur fade" id="modal-confirm-backup" tabindex="-1" role="dialog"
                    aria-hidden="true">
                    <div class="modal-dialog modal-sm modal-dialog-centered" role="document">
                        <div class="modal-content">
                            <div class="modal-body">
                                <div class="modal-title"><?= __('start_remote_backup_title') ?></div>
                                <div><?= __('start_remote_backup_desc') ?></div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-link link-secondary me-auto"
                                    data-bs-dismiss="modal"><?= __('cancel') ?></button>
                                <button type="button" class="btn btn-primary"
                                    id="btn-confirm-backup-remote"><?= __('yes_start_backup') ?></button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Restore Confirmation Modal -->
                <div class="modal modal-blur fade" id="modal-confirm-restore" tabindex="-1" role="dialog"
                    aria-hidden="true">
                    <div class="modal-dialog modal-sm modal-dialog-centered" role="document">
                        <div class="modal-content">
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            <div class="modal-status bg-danger"></div>
                            <div class="modal-body text-center py-4">
                                <i class="ti ti-alert-triangle text-danger icon mb-2" style="font-size: 3rem;"></i>
                                <h3><?= __('are_you_sure') ?></h3>
                                <div class="text-muted"><?= __('restore_confirm_text') ?></div>
                            </div>
                            <div class="modal-footer">
                                <div class="w-100">
                                    <div class="row">
                                        <div class="col"><a href="#" class="btn w-100" data-bs-dismiss="modal">
                                                <?= __('cancel') ?>
                                            </a></div>
                                        <div class="col"><a href="#" class="btn btn-danger w-100"
                                                id="btn-confirm-restore-action">
                                                <?= __('restore_btn') ?>
                                            </a></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Reset Confirmation Modal -->
                <div class="modal modal-blur fade" id="modal-confirm-reset-system" tabindex="-1" role="dialog"
                    aria-hidden="true">
                    <div class="modal-dialog modal-sm modal-dialog-centered" role="document">
                        <div class="modal-content">
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            <div class="modal-status bg-warning"></div>
                            <div class="modal-body text-center py-4">
                                <i class="ti ti-alert-triangle text-warning icon mb-2" style="font-size: 3rem;"></i>
                                <h3><?= __('are_you_sure') ?></h3>
                                <div class="text-muted"><?= __('reset_customization_confirm') ?></div>
                            </div>
                            <div class="modal-footer">
                                <div class="w-100">
                                    <div class="row">
                                        <div class="col"><a href="#" class="btn w-100" data-bs-dismiss="modal">
                                                <?= __('cancel') ?>
                                            </a></div>
                                        <div class="col"><a href="#" class="btn btn-warning w-100"
                                                id="btn-confirm-reset-system-action">
                                                <?= __('reset_to_default') ?>
                                            </a></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                </div>
            </div>
        </div>
    </div>

    <script src="js/settings.js"></script>

    <?php require_once 'includes/footer.php'; ?>