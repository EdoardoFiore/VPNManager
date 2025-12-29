async function renderFirewall() {
    return `
    <div class="page-header d-print-none">
        <div class="row align-items-center">
            <div class="col">
                 <h2 class="page-title">Machine Firewall (Core)</h2>
                 <div class="text-muted mt-1">Manage global iptables rules for the host.</div>
            </div>
            <div class="col-auto ms-auto d-print-none">
                <button class="btn btn-primary" onclick="showAddRuleModal()">
                    Add Rule
                </button>
                <button class="btn btn-warning" onclick="applyRules()">
                    Apply Rules
                </button>
            </div>
        </div>
    </div>
    
    <!-- Chains: Input, Output, Forward -->
    <div class="row row-cards">
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">INPUT Chain</h3>
                </div>
                <div class="table-responsive">
                    <table class="table table-vcenter card-table" id="table-INPUT">
                        <thead>
                            <tr>
                                <th>Priority</th>
                                <th>Protocol</th>
                                <th>Source</th>
                                <th>Port</th>
                                <th>Action</th>
                                <th>Description</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">OUTPUT Chain</h3>
                </div>
                <div class="table-responsive">
                    <table class="table table-vcenter card-table" id="table-OUTPUT">
                        <thead>
                            <tr>
                                <th>Priority</th>
                                <th>Protocol</th>
                                <th>Dest</th>
                                <th>Port</th>
                                <th>Action</th>
                                <th>Description</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">FORWARD Chain</h3>
                </div>
                <div class="table-responsive">
                    <table class="table table-vcenter card-table" id="table-FORWARD">
                         <thead>
                            <tr>
                                <th>Priority</th>
                                <th>Protocol</th>
                                <th>Source</th>
                                <th>Dest</th>
                                <th>Action</th>
                                <th>Description</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Modal -->
    <div class="modal modal-blur fade" id="modal-rule" tabindex="-1" role="dialog" aria-hidden="true">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">New Firewall Rule</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
             <form id="rule-form">
                <div class="mb-3">
                    <label class="form-label">Chain</label>
                    <select name="chain_name" class="form-control">
                        <option value="INPUT" selected>INPUT</option>
                        <option value="OUTPUT">OUTPUT</option>
                        <option value="FORWARD">FORWARD</option>
                    </select>
                </div>
                <div class="row">
                    <div class="col-lg-6">
                        <div class="mb-3">
                            <label class="form-label">Protocol</label>
                            <select name="protocol" class="form-control">
                                <option value="tcp">TCP</option>
                                <option value="udp">UDP</option>
                                <option value="icmp">ICMP</option>
                                <option value="any">Any</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-lg-6">
                         <div class="mb-3">
                            <label class="form-label">Port (Optional)</label>
                            <input type="text" name="port" class="form-control" placeholder="80, 443">
                         </div>
                    </div>
                </div>
                <div class="row">
                     <div class="col-lg-6">
                        <div class="mb-3">
                            <label class="form-label">Source (Optional)</label>
                            <input type="text" name="source" class="form-control" placeholder="192.168.1.0/24">
                        </div>
                     </div>
                     <div class="col-lg-6">
                        <div class="mb-3">
                            <label class="form-label">Destination (Optional)</label>
                            <input type="text" name="destination" class="form-control" placeholder="0.0.0.0/0">
                        </div>
                     </div>
                </div>
                 <div class="mb-3">
                    <label class="form-label">Action</label>
                    <select name="action" class="form-control">
                        <option value="ACCEPT" selected>ACCEPT</option>
                        <option value="DROP">DROP</option>
                        <option value="REJECT">REJECT</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label">Description</label>
                    <input type="text" name="description" class="form-control">
                </div>
             </form>
          </div>
          <div class="modal-footer">
            <a href="#" class="btn btn-link link-secondary" data-bs-dismiss="modal">
              Cancel
            </a>
            <a href="#" class="btn btn-primary ms-auto" onclick="submitRule()">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Create Rule
            </a>
          </div>
        </div>
      </div>
    </div>
    `;
}

async function initFirewall() {
    const res = await fetch(`${API_BASE}/core/firewall/rules`, { headers: getHeaders() });
    const rules = await res.json();

    // Clear tables
    ['INPUT', 'OUTPUT', 'FORWARD'].forEach(c => {
        document.querySelector(`#table-${c} tbody`).innerHTML = '';
    });

    rules.sort((a, b) => a.priority - b.priority);

    rules.forEach(rule => {
        let chain = rule.chain_name;
        // Map old/system names to UI simple names if needed
        if (chain === 'MADMIN_INPUT') chain = 'INPUT';
        if (chain === 'MADMIN_OUTPUT') chain = 'OUTPUT';
        if (chain === 'MADMIN_FORWARD') chain = 'FORWARD';

        const tbody = document.querySelector(`#table-${chain} tbody`);
        if (tbody) {
            tbody.innerHTML += `
            <tr>
                <td>${rule.priority}</td>
                <td>${rule.protocol}</td>
                <td>${rule.source || '*'}</td>
                <td>${rule.port || '*'}</td>
                <td><span class="badge bg-${rule.action === 'ACCEPT' ? 'green' : 'red'}">${rule.action}</span></td>
                <td>${rule.description || ''}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-icon btn-ghost-danger" onclick="deleteRule(${rule.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><line x1="4" y1="7" x2="20" y2="7" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
                    </button>
                </td>
            </tr>
            `; // Note: Logic simplified (Destination needed for Output/Forward)
        }
    });
}

function showAddRuleModal() {
    const modal = new bootstrap.Modal(document.getElementById('modal-rule'));
    modal.show();
}

async function submitRule() {
    const form = document.getElementById('rule-form');
    // Simple json conversion
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => data[key] = value);

    // Cleanup empty strings
    if (!data.port) delete data.port;
    if (!data.source) delete data.source;
    if (!data.destination) delete data.destination;

    try {
        const res = await fetch(`${API_BASE}/core/firewall/rules`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (res.ok) {
            // Hide modal manually or reload
            document.querySelector('.btn-close').click();
            initFirewall(); // Reload table
        } else {
            alert('Failed to add rule');
        }
    } catch (e) {
        console.error(e);
    }
}

async function deleteRule(id) {
    if (!confirm('Delete this rule?')) return;
    await fetch(`${API_BASE}/core/firewall/rules/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    initFirewall();
}

async function applyRules() {
    await fetch(`${API_BASE}/core/firewall/apply`, { method: 'POST', headers: getHeaders() });
    alert('Rules Applied');
}
