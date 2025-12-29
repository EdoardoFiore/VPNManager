async function showUploadModal() {
    // Check if modal exists
    let modalEl = document.getElementById('modal-upload-module');
    if (!modalEl) {
        document.body.insertAdjacentHTML('beforeend', `
        <div class="modal modal-blur fade" id="modal-upload-module" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog modal-sm" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Upload Module</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div class="mb-3">
                  <div class="form-label">Select .zip file</div>
                  <input type="file" class="form-control" id="module-file" accept=".zip">
                </div>
              </div>
              <div class="modal-footer">
                <a href="#" class="btn btn-link link-secondary" data-bs-dismiss="modal">
                  Cancel
                </a>
                <a href="#" class="btn btn-primary ms-auto" onclick="uploadModule()">
                  Upload
                </a>
              </div>
            </div>
          </div>
        </div>
        `);
        modalEl = document.getElementById('modal-upload-module');
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

async function uploadModule() {
    const fileInput = document.getElementById('module-file');
    if (!fileInput.files[0]) {
        alert("Please select a file");
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const btn = document.querySelector('#modal-upload-module .btn-primary');
        const originalText = btn.innerText;
        btn.innerText = 'Uploading...';
        btn.disabled = true;

        const res = await fetch(`${API_BASE}/core/modules/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${requireAuth()}`
                // Content-Type must be unset for FormData
            },
            body: formData
        });

        if (res.ok) {
            alert('Module Uploaded Successfully. Please restart the service to apply changes.');
            document.querySelector('#modal-upload-module .btn-close').click();
            initModules();
        } else {
            const err = await res.json();
            alert('Upload Failed: ' + (err.detail || 'Unknown error'));
        }

    } catch (e) {
        console.error(e);
        alert('Upload Error');
    } finally {
        const btn = document.querySelector('#modal-upload-module .btn-primary');
        if (btn) {
            btn.innerText = 'Upload'; // Restore
            btn.disabled = false;
        }
    }
}
