// js/utils.js

const API_AJAX_HANDLER = 'ajax_handler.php';

function showNotification(type, message) {
    // Check if notification container exists, if not create it
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1050';
        document.body.appendChild(container);
    } else {
        // Ensure styling updates if container already exists (and was created by old logic)
        if (!container.className.includes('toast-container')) {
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.top = ''; // Reset inline styles if any
            container.style.right = '';
        }
    }

    // Default title mapping
    const titles = {
        'success': __('status_success'),
        'danger': __('status_error'),
        'warning': __('status_warning'),
        'info': __('status_info')
    };


    // Icon mapping (Tabler icons)
    const icons = {
        'success': '<svg xmlns="http://www.w3.org/2000/svg" class="icon alert-icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10" /></svg>',
        'danger': '<svg xmlns="http://www.w3.org/2000/svg" class="icon alert-icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>',
        'warning': '<svg xmlns="http://www.w3.org/2000/svg" class="icon alert-icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 9v2m0 4v.01" /><path d="M5 19h14a2 2 0 0 0 1.84 -2.75l-7.1 -12.25a2 2 0 0 0 -3.5 0l-7.1 12.25a2 2 0 0 0 1.84 2.75z" /></svg>',
        'info': '<svg xmlns="http://www.w3.org/2000/svg" class="icon alert-icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12.01" y2="8" /><polyline points="11 12 12 12 12 16 13 16" /></svg>'
    };

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';

    // Make alerts stand out more with white background and border
    alertDiv.style.backgroundColor = '#fff';
    alertDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

    alertDiv.innerHTML = `
        <div class="d-flex">
            <div>
                ${icons[type] || icons['info']}
            </div>
            <div>
                <h4 class="alert-title">${titles[type] || __('notification_title')}</h4>

                <div class="text-secondary">${message}</div>
            </div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    container.appendChild(alertDiv);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 4000);
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
    // Remove nanoseconds if present to ensure compatibility
    const cleanIso = isoString.split('.')[0];
    const date = new Date(cleanIso);
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Get translated string
 * @param {string} key 
 * @returns {string}
 */
function __(key) {
    if (window.translations && window.translations[key]) {
        return window.translations[key];
    }
    return key;
}

