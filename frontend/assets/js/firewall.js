// firewall.js - Machine Firewall Management

// --- Helper: Generate iptables preview ---
function generatePreview(mode) {
    const form = document.getElementById(mode === 'add' ? 'addMachineRuleForm' : 'editMachineRuleForm');
    const formData = new FormData(form);

    let cmd = `iptables -t ${formData.get('table')} -A ${formData.get('chain')}`;

    // Proto
    const proto = formData.get('protocol');
    if (proto && proto !== 'all') cmd += ` -p ${proto}`;

    // Source/Dest
    if (formData.get('source')) cmd += ` -s ${formData.get('source')}`;
    if (formData.get('destination')) cmd += ` -d ${formData.get('destination')}`;

    // Port
    if (formData.get('port')) {
        const flag = (proto === 'udp' || proto === 'tcp') ? '--dport' : '';
        if (flag) cmd += ` ${flag} ${formData.get('port')}`;
    }

    // Interfaces
    if (formData.get('in_interface')) cmd += ` -i ${formData.get('in_interface')}`;
    if (formData.get('out_interface')) cmd += ` -o ${formData.get('out_interface')}`;

    // State
    if (formData.get('state')) cmd += ` -m state --state ${formData.get('state')}`;

    // Comment
    if (formData.get('comment')) cmd += ` -m comment --comment "${formData.get('comment')}"`;

    // Action
    cmd += ` -j ${formData.get('action')}`;

    const previewEl = document.getElementById(mode === 'add' ? 'iptables-preview-add' : 'iptables-preview-edit');
    if (previewEl) previewEl.innerText = cmd;
}

// --- Render Main Page ---
async function renderFirewall() {
    // Return the Tabbed Layout
    return `
    <div class="page-header d-print-none">
        <div class="row align-items-center">
            <div class="col">
                 <h2 class="page-title">Machine Firewall (Core)</h2>
            </div>
            <div class="col-auto ms-auto d-print-none">
                <button class="btn btn-warning" onclick="applyRules()">
                    <i class="ti ti-check"></i> Apply Rules
                </button>
            </div>
        </div>
    </div>
    
    <!-- Tabs -->
    <ul class="nav nav-tabs mb-3" data-bs-toggle="tabs">
        <li class="nav-item">
            <a href="#tab-fw" class="nav-link active" data-bs-toggle="tab">Global Firewall</a>
        </li>
        <li class="nav-item">
            <a href="#tab-net" class="nav-link" data-bs-toggle="tab">Network Interfaces</a>
        </li>
    </ul>

    <div class="tab-content">
        <!-- Firewall Tab -->
        <div class="tab-pane active show" id="tab-fw">
            <div class="mb-3 d-flex justify-content-end">
                <button class="btn btn-primary" onclick="showAddRuleModal()">
                    <i class="ti ti-plus"></i> New Global Rule
                </button>
            </div>
            
            <!-- Dynamic Tables per Chain Group -->
             <div class="alert alert-info">
                Displaying rules for <b>INPUT, OUTPUT, FORWARD</b> chains in <b>filter</b> table.
            </div>

            <div id="firewall-tables-container">
                 <!-- Injected by Init -->
            </div>
        </div>
        
        <!-- Interfaces Tab (Placeholder) -->
        <div class="tab-pane" id="tab-net">
            <div class="card">
                <div class="card-body">
                    <h3>Network Interfaces</h3>
                    <p class="text-muted">Interface management coming soon.</p>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Add Rule Modal -->
    ${getRuleModalHtml('add')}
    <!-- Edit Rule Modal (re-use same html structure or distinct) -->
    ${getRuleModalHtml('edit')}
    `;
}

function getRuleModalHtml(mode) {
    const title = mode === 'add' ? 'New Global Firewall Rule' : 'Edit Rule';
    const id = mode === 'add' ? 'modal-add-machine-rule' : 'modal-edit-machine-rule';
    const formId = mode === 'add' ? 'addMachineRuleForm' : 'editMachineRuleForm';
    const fn = mode === 'add' ? 'submitAddRule()' : 'submitEditRule()';
    const previewId = mode === 'add' ? 'iptables-preview-add' : 'iptables-preview-edit';

    return `
<div class="modal modal-blur fade" id="${id}" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${title}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="${formId}" onchange="generatePreview('${mode}')" onkeyup="generatePreview('${mode}')">
                    <input type="hidden" name="id">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Table</label>
                            <select class="form-select" name="table">
                                <option value="filter" selected>filter</option>
                                <option value="nat">nat</option>
                                <option value="mangle">mangle</option>
                                <option value="raw">raw</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Chain</label>
                            <select class="form-select" name="chain" required>
                                <option value="INPUT" selected>INPUT</option>
                                <option value="OUTPUT">OUTPUT</option>
                                <option value="FORWARD">FORWARD</option>
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Action</label>
                            <select class="form-select" name="action">
                                <option value="ACCEPT">ACCEPT</option>
                                <option value="DROP">DROP</option>
                                <option value="REJECT">REJECT</option>
                                <option value="MASQUERADE">MASQUERADE</option>
                                <option value="SNAT">SNAT</option>
                                <option value="DNAT">DNAT</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Protocol</label>
                            <select class="form-select" name="protocol">
                                <option value="all">all</option>
                                <option value="tcp">tcp</option>
                                <option value="udp">udp</option>
                                <option value="icmp">icmp</option>
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                             <label class="form-label">Source</label>
                             <input type="text" class="form-control" name="source" placeholder="any or 192.168.1.0/24">
                        </div>
                        <div class="col-md-6 mb-3">
                             <label class="form-label">Destination</label>
                             <input type="text" class="form-control" name="destination" placeholder="any or 8.8.8.8">
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4 mb-3">
                             <label class="form-label">Port</label>
                             <input type="text" class="form-control" name="port" placeholder="80, 443">
                        </div>
                         <div class="col-md-4 mb-3">
                             <label class="form-label">In Interface</label>
                             <input type="text" class="form-control" name="in_interface" placeholder="eth0">
                        </div>
                         <div class="col-md-4 mb-3">
                             <label class="form-label">Out Interface</label>
                             <input type="text" class="form-control" name="out_interface" placeholder="eth0">
                        </div>
                    </div>
                     <div class="mb-3">
                        <label class="form-label">State</label>
                        <input type="text" class="form-control" name="state" placeholder="NEW,ESTABLISHED">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Comment</label>
                        <input type="text" class="form-control" name="comment" placeholder="Description">
                    </div>
                </form>
                <div class="mt-4">
                    <label class="form-label">Preview</label>
                    <pre class="code-preview"><code id="${previewId}">iptables -t filter -A INPUT -j ACCEPT</code></pre>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn me-auto" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="${fn}">Save Rule</button>
            </div>
        </div>
    </div>
</div>
    `;
}

// --- Init & Data Loading ---
async function initFirewall() {
    const res = await fetch(`${API_BASE}/core/firewall/rules`, { headers: getHeaders() });
    const rules = await res.json();

    // Sort by priority
    rules.sort((a, b) => a.priority - b.priority);

    // Group by Chain
    const chains = { 'INPUT': [], 'OUTPUT': [], 'FORWARD': [] };
    // Also handle custom/other chains if any
    rules.forEach(r => {
        let c = r.chain_name.replace('MADMIN_', '');
        if (!chains[c]) chains[c] = [];
        chains[c].push(r);
    });

    const container = document.getElementById('firewall-tables-container');
    container.innerHTML = '';

    ['INPUT', 'OUTPUT', 'FORWARD'].forEach(chainName => {
        const chainRules = chains[chainName] || [];
        container.innerHTML += renderChainTable(chainName, chainRules);
    });
}


function renderChainTable(chainName, rules) {
    let rows = '';
    if (rules.length === 0) {
        rows = `<tr><td colspan="9" class="text-center text-muted">No rules defined</td></tr>`;
    } else {
        rules.forEach(r => {
            rows += `
            <tr>
                <td><span class="badge bg-${r.action === 'ACCEPT' ? 'green' : 'red'}">${r.action}</span></td>
                <td>${r.protocol || 'all'}</td>
                <td>${r.source || '*'}</td>
                <td>${r.destination || '*'}</td>
                <td>${r.port || '*'}</td>
                <td>${r.in_interface || '*'}</td>
                <td>${r.out_interface || '*'}</td>
                <td>${r.description || ''}</td>
                <td>
                    <button class="btn btn-sm btn-icon btn-ghost-danger" onclick="deleteRule(${r.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><line x1="4" y1="7" x2="20" y2="7" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
                    </button>
                </td>
            </tr>
            `;
        });
    }

    return `
    <div class="card mb-3">
        <div class="card-header">
            <h3 class="card-title">${chainName} Rules</h3>
        </div>
        <div class="table-responsive">
            <table class="table table-vcenter card-table">
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>Proto</th>
                        <th>Source</th>
                        <th>Dest</th>
                        <th>Port</th>
                        <th>In Iface</th>
                        <th>Out Iface</th>
                        <th>Comment</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>
    `;
}

// --- Actions ---
function showAddRuleModal() {
    const modal = new bootstrap.Modal(document.getElementById('modal-add-machine-rule'));
    modal.show();
    generatePreview('add');
}

async function submitAddRule() {
    const form = document.getElementById('addMachineRuleForm');
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => data[key] = value);

    // Cleanup defaults
    if (data.protocol === 'all') delete data.protocol;
    if (!data.port) delete data.port;
    if (!data.source) delete data.source;
    if (!data.destination) delete data.destination;
    if (!data.in_interface) delete data.in_interface;
    if (!data.out_interface) delete data.out_interface;
    if (!data.state) delete data.state;
    // Map comment to description
    data.description = data.comment;
    data.chain_name = data.chain; // Backend uses chain_name

    try {
        const res = await fetch(`${API_BASE}/core/firewall/rules`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (res.ok) {
            document.querySelector('#modal-add-machine-rule .btn-close').click();
            initFirewall();
        } else {
            alert('Failed');
        }
    } catch (e) { console.error(e); }
}

async function deleteRule(id) {
    if (!confirm("Delete rule?")) return;
    await fetch(`${API_BASE}/core/firewall/rules/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    initFirewall();
}

async function applyRules() {
    await fetch(`${API_BASE}/core/firewall/apply`, { method: 'POST', headers: getHeaders() });
    alert("Rules Applied to System");
}
