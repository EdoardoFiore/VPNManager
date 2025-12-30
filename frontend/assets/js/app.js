/**
 * MADMIN - Main Application Module
 * 
 * Handles routing, menu loading, and view rendering.
 * Uses ES modules for dynamic view loading.
 */

import { isAuthenticated, redirectToLogin, getCurrentUser, clearToken } from './api.js';
import { showToast, loadingSpinner } from './utils.js';

// View registry - maps routes to view modules
const views = {
    'dashboard': () => import('./views/dashboard.js'),
    'users': () => import('./views/users.js'),
    'firewall': () => import('./views/firewall.js'),
    'settings': () => import('./views/settings.js'),
    'modules': () => import('./views/modules.js'),
};

// Current user data
let currentUser = null;

/**
 * Initialize the application
 */
async function init() {
    console.log('MADMIN initializing...');

    // Check authentication
    if (!isAuthenticated()) {
        redirectToLogin();
        return;
    }

    // Load user info
    try {
        currentUser = await getCurrentUser();
        updateUserDisplay();
    } catch (error) {
        console.error('Failed to get user info:', error);
        redirectToLogin();
        return;
    }

    // Setup event listeners
    setupLogout();
    setupNavigation();

    // Load menu
    await loadMenu();

    // Handle initial route
    handleRoute();

    // Listen for hash changes
    window.addEventListener('hashchange', handleRoute);

    console.log('MADMIN ready');
}

/**
 * Update user display in sidebar
 */
function updateUserDisplay() {
    const userNameEl = document.getElementById('user-name');
    if (userNameEl && currentUser) {
        userNameEl.textContent = currentUser.username;
    }
}

/**
 * Setup logout button
 */
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearToken();
            redirectToLogin();
        });
    }
}

/**
 * Setup navigation click handlers
 */
function setupNavigation() {
    const navMenu = document.getElementById('nav-menu');
    if (navMenu) {
        navMenu.addEventListener('click', (e) => {
            const link = e.target.closest('a.nav-link');
            if (link) {
                // Update active state
                navMenu.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    }
}

/**
 * Load menu from API
 */
async function loadMenu() {
    const navMenu = document.getElementById('nav-menu');
    if (!navMenu) return;

    try {
        const response = await fetch('/api/ui/menu', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('madmin_token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to load menu');

        const menuData = await response.json();

        // Build menu HTML
        let menuHtml = '';

        // Core menu items
        for (const item of menuData.core) {
            // Check permission (null = always visible)
            if (item.permission && !hasPermission(item.permission)) {
                continue;
            }

            menuHtml += createMenuItem(item);
        }

        // Module menu items (if any)
        if (menuData.modules && menuData.modules.length > 0) {
            menuHtml += `
                <li class="nav-item pt-3">
                    <span class="nav-link disabled text-uppercase text-muted" style="font-size: 0.7rem;">
                        Moduli
                    </span>
                </li>
            `;

            for (const item of menuData.modules) {
                menuHtml += createMenuItem(item);
            }
        }

        navMenu.innerHTML = menuHtml;

    } catch (error) {
        console.error('Failed to load menu:', error);
    }
}

/**
 * Create a menu item HTML
 */
function createMenuItem(item) {
    const iconClass = item.icon ? `ti-${item.icon}` : 'ti-circle';
    return `
        <li class="nav-item">
            <a class="nav-link" href="${item.route}">
                <span class="nav-link-icon d-md-none d-lg-inline-block">
                    <i class="ti ${iconClass}"></i>
                </span>
                <span class="nav-link-title">${item.label}</span>
            </a>
        </li>
    `;
}

/**
 * Check if current user has a permission
 */
function hasPermission(permission) {
    if (!currentUser) return false;
    if (currentUser.is_superuser) return true;
    if (currentUser.permissions.includes('*')) return true;
    return currentUser.permissions.includes(permission);
}

/**
 * Handle route changes
 */
async function handleRoute() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    const [viewName, ...params] = hash.split('/');

    // Update page title
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = getViewTitle(viewName);
    }

    // Update active menu item
    updateActiveMenuItem(viewName);

    // Clear page actions
    const pageActions = document.getElementById('page-actions');
    if (pageActions) {
        pageActions.innerHTML = '';
    }

    // Load view
    const contentEl = document.getElementById('app-content');
    if (!contentEl) return;

    contentEl.innerHTML = loadingSpinner();

    try {
        const viewLoader = views[viewName];

        if (!viewLoader) {
            contentEl.innerHTML = `
                <div class="card">
                    <div class="card-body text-center py-5">
                        <i class="ti ti-error-404 text-muted" style="font-size: 4rem;"></i>
                        <h3 class="mt-3">Pagina non trovata</h3>
                        <p class="text-muted">La pagina richiesta non esiste.</p>
                        <a href="#dashboard" class="btn btn-primary">Torna alla Dashboard</a>
                    </div>
                </div>
            `;
            return;
        }

        const viewModule = await viewLoader();
        await viewModule.render(contentEl, params);

    } catch (error) {
        console.error('Failed to load view:', error);
        contentEl.innerHTML = `
            <div class="card">
                <div class="card-body text-center py-5">
                    <i class="ti ti-alert-circle text-danger" style="font-size: 4rem;"></i>
                    <h3 class="mt-3">Errore di caricamento</h3>
                    <p class="text-muted">${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">Ricarica</button>
                </div>
            </div>
        `;
    }
}

/**
 * Get human-readable title for a view
 */
function getViewTitle(viewName) {
    const titles = {
        'dashboard': 'Dashboard',
        'users': 'Gestione Utenti',
        'firewall': 'Firewall Macchina',
        'settings': 'Impostazioni',
        'modules': 'Gestione Moduli',
    };
    return titles[viewName] || viewName.charAt(0).toUpperCase() + viewName.slice(1);
}

/**
 * Update active menu item
 */
function updateActiveMenuItem(viewName) {
    const navMenu = document.getElementById('nav-menu');
    if (!navMenu) return;

    navMenu.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        const linkView = href ? href.replace('#', '').split('/')[0] : '';

        if (linkView === viewName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Set page actions (buttons in header)
 */
export function setPageActions(html) {
    const pageActions = document.getElementById('page-actions');
    if (pageActions) {
        pageActions.innerHTML = html;
    }
}

/**
 * Get current user
 */
export function getUser() {
    return currentUser;
}

/**
 * Check user permission
 */
export function checkPermission(permission) {
    return hasPermission(permission);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
