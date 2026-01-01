/**
 * MADMIN - Network Interfaces View
 * 
 * Displays network interface information with IP, MAC, status, and traffic stats.
 */

import { apiGet } from '../api.js';
import { showToast } from '../utils.js';

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Render the network interfaces view
 */
export async function render(container) {
    container.innerHTML = `
        <div class="row row-deck row-cards">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="ti ti-network me-2"></i>Interfacce di Rete
                        </h3>
                        <div class="card-actions">
                            <button class="btn btn-ghost-primary" id="btn-refresh-interfaces" title="Aggiorna">
                                <i class="ti ti-refresh"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body" id="interfaces-container">
                        <div class="text-center py-4 text-muted">
                            <i class="ti ti-loader ti-spin" style="font-size: 2rem;"></i>
                            <p class="mt-2">Caricamento interfacce...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Setup refresh button
    document.getElementById('btn-refresh-interfaces')?.addEventListener('click', loadInterfaces);

    // Load interfaces
    await loadInterfaces();
}

/**
 * Load network interfaces from API
 */
async function loadInterfaces() {
    const container = document.getElementById('interfaces-container');
    if (!container) return;

    try {
        const response = await apiGet('/network/interfaces');
        const interfaces = response.interfaces || [];

        if (interfaces.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="ti ti-network-off" style="font-size: 2rem;"></i>
                    <p class="mt-2">Nessuna interfaccia di rete trovata</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="row g-3">
                ${interfaces.map(iface => renderInterfaceCard(iface)).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading interfaces:', error);
        container.innerHTML = `
            <div class="text-center py-4 text-danger">
                <i class="ti ti-alert-circle" style="font-size: 2rem;"></i>
                <p class="mt-2">Errore caricamento interfacce: ${error.message}</p>
            </div>
        `;
    }
}

/**
 * Render a single interface card
 */
function renderInterfaceCard(iface) {
    const isUp = iface.is_up;
    const statusClass = isUp ? 'bg-green' : 'bg-secondary';
    const statusText = isUp ? 'Attiva' : 'Inattiva';

    // Determine interface type icon
    let icon = 'ti-network';
    if (iface.name.startsWith('wg') || iface.name.startsWith('tun') || iface.name.startsWith('tap')) {
        icon = 'ti-lock';
    } else if (iface.name.startsWith('docker') || iface.name.startsWith('br-') || iface.name.startsWith('veth')) {
        icon = 'ti-container';
    } else if (iface.name === 'lo') {
        icon = 'ti-arrow-loop-right';
    } else if (iface.name.startsWith('wl') || iface.name.includes('wlan')) {
        icon = 'ti-wifi';
    }

    return `
        <div class="col-md-6 col-lg-4">
            <div class="card">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="avatar bg-primary-lt me-3">
                            <i class="ti ${icon}"></i>
                        </div>
                        <div class="flex-fill">
                            <h4 class="mb-0">${iface.name}</h4>
                            <span class="badge ${statusClass}">${statusText}</span>
                            ${iface.speed > 0 ? `<span class="badge bg-azure-lt ms-1">${iface.speed} Mbps</span>` : ''}
                        </div>
                    </div>
                    
                    <dl class="row mb-0 small">
                        ${iface.ipv4 ? `
                            <dt class="col-4 text-muted">IPv4:</dt>
                            <dd class="col-8"><code>${iface.ipv4}</code></dd>
                        ` : ''}
                        ${iface.ipv6 ? `
                            <dt class="col-4 text-muted">IPv6:</dt>
                            <dd class="col-8"><code class="small">${iface.ipv6.substring(0, 20)}...</code></dd>
                        ` : ''}
                        ${iface.mac && iface.mac !== '00:00:00:00:00:00' ? `
                            <dt class="col-4 text-muted">MAC:</dt>
                            <dd class="col-8"><code>${iface.mac}</code></dd>
                        ` : ''}
                        ${iface.mtu > 0 ? `
                            <dt class="col-4 text-muted">MTU:</dt>
                            <dd class="col-8">${iface.mtu}</dd>
                        ` : ''}
                    </dl>
                    
                    <hr class="my-2">
                    
                    <div class="row text-center small">
                        <div class="col-6">
                            <div class="text-muted mb-1">
                                <i class="ti ti-arrow-down text-green"></i> Ricevuti
                            </div>
                            <strong>${formatBytes(iface.bytes_recv)}</strong>
                            <div class="text-muted">${iface.packets_recv.toLocaleString()} pkt</div>
                        </div>
                        <div class="col-6">
                            <div class="text-muted mb-1">
                                <i class="ti ti-arrow-up text-blue"></i> Inviati
                            </div>
                            <strong>${formatBytes(iface.bytes_sent)}</strong>
                            <div class="text-muted">${iface.packets_sent.toLocaleString()} pkt</div>
                        </div>
                    </div>
                    
                    ${(iface.errors_in > 0 || iface.errors_out > 0) ? `
                        <div class="mt-2 text-center small text-danger">
                            <i class="ti ti-alert-triangle"></i>
                            Errori: ${iface.errors_in} in / ${iface.errors_out} out
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}
