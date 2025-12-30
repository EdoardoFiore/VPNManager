// setup.js

document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showError();
        return;
    }

    try {
        // Fetch config
        // AJAX Handler uses api_request, which calls Backend /api/public/setup/{token}
        const response = await fetch(`./ajax_handler.php?action=get_public_client_config&token=${token}`);
        const result = await response.json();

        if (result.success) {
            const data = result.body;
            showSuccess(data);
        } else {
            console.error(result);
            showError();
        }

    } catch (e) {
        console.error(e);
        showError();
    }
});

function showError() {
    document.getElementById('loading-state').classList.add('d-none');
    document.getElementById('error-state').classList.remove('d-none');
}

function showSuccess(data) {
    document.getElementById('loading-state').classList.add('d-none');
    document.getElementById('success-state').classList.remove('d-none');

    document.getElementById('client-name-display').textContent = data.client_name;

    // Render QR Code
    // Ensure QRCode lib is loaded
    if (typeof QRCode !== 'undefined') {
        const container = document.getElementById('qrcode-container');
        container.innerHTML = '';
        new QRCode(container, {
            text: data.config,
            width: 256,
            height: 256,
            correctLevel: QRCode.CorrectLevel.M
        });
    }

    // Setup Download Button
    const btnDown = document.getElementById('btn-download-config');
    btnDown.onclick = function () {
        downloadString(data.config, "plain/text", `${data.client_name}.conf`);
    };
}

function downloadString(text, fileType, fileName) {
    var blob = new Blob([text], { type: fileType });
    var a = document.createElement('a');
    a.download = fileName;
    a.href = URL.createObjectURL(blob);
    a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
}
