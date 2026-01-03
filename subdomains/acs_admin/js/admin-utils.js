/* ============================================
   Admin Utilities
   Helpers, Modals, Validators, Toast
   ============================================ */

// ============================================
// Toast Notifications
// ============================================
const Toast = {
    container: null,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    show(type, title, message, duration = 4000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'fa-check',
            error: 'fa-xmark',
            warning: 'fa-exclamation',
            info: 'fa-info'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fa-solid ${icons[type]}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        this.container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    },

    success(title, message, duration) {
        return this.show('success', title, message, duration);
    },

    error(title, message, duration) {
        return this.show('error', title, message, duration);
    },

    warning(title, message, duration) {
        return this.show('warning', title, message, duration);
    },

    info(title, message, duration) {
        return this.show('info', title, message, duration);
    }
};

// ============================================
// Custom Modal
// ============================================
const Modal = {
    overlay: null,

    create() {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        this.overlay.innerHTML = `
            <div class="modal">
                <button class="modal-close">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div class="modal-icon"></div>
                <h3 class="modal-title"></h3>
                <p class="modal-message"></p>
                <div class="modal-actions"></div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });

        // Close button
        this.overlay.querySelector('.modal-close').addEventListener('click', () => {
            this.hide();
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
                this.hide();
            }
        });
    },

    show(options) {
        this.create();

        const { type = 'info', title, message, buttons = [] } = options;

        const icons = {
            success: 'fa-check',
            error: 'fa-xmark',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info'
        };

        const iconEl = this.overlay.querySelector('.modal-icon');
        iconEl.className = `modal-icon ${type}`;
        iconEl.innerHTML = `<i class="fa-solid ${icons[type]}"></i>`;

        this.overlay.querySelector('.modal-title').textContent = title;
        this.overlay.querySelector('.modal-message').textContent = message;

        const actionsEl = this.overlay.querySelector('.modal-actions');
        actionsEl.innerHTML = '';

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `btn ${btn.primary ? 'btn-primary' : 'btn-outline'}`;
            button.textContent = btn.text;
            button.onclick = () => {
                if (btn.onClick) btn.onClick();
                if (btn.closeOnClick !== false) this.hide();
            };
            actionsEl.appendChild(button);
        });

        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    hide() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    confirm(title, message, onConfirm, onCancel) {
        this.show({
            type: 'warning',
            title,
            message,
            buttons: [
                { text: 'Cancel', onClick: onCancel },
                { text: 'Confirm', primary: true, onClick: onConfirm }
            ]
        });
    },

    alert(type, title, message, onClose) {
        this.show({
            type,
            title,
            message,
            buttons: [
                { text: 'OK', primary: true, onClick: onClose }
            ]
        });
    }
};

// ============================================
// Form Validators
// ============================================
const Validators = {
    // Email validation
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Phone validation (Indian format)
    isValidPhone(phone) {
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        const re = /^(\+91)?[6-9]\d{9}$/;
        return re.test(cleaned);
    },

    // Password strength
    isStrongPassword(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return re.test(password);
    },

    // Admin ID format
    isValidAdminId(id) {
        const re = /^ACS-\d{2,}$/;
        return re.test(id);
    },

    // Full name
    isValidName(name) {
        return name.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(name);
    },

    // Check if passwords match
    passwordsMatch(password, confirmPassword) {
        return password === confirmPassword;
    }
};

// ============================================
// Form Helpers
// ============================================
const FormHelpers = {
    // Show field error
    showError(inputId, message) {
        const input = document.getElementById(inputId);
        const errorEl = document.getElementById(`${inputId}-error`);

        if (input) {
            input.style.borderColor = '#EF4444';
        }

        if (errorEl) {
            errorEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;
            errorEl.classList.add('show');
        }
    },

    // Clear field error
    clearError(inputId) {
        const input = document.getElementById(inputId);
        const errorEl = document.getElementById(`${inputId}-error`);

        if (input) {
            input.style.borderColor = '';
        }

        if (errorEl) {
            errorEl.classList.remove('show');
        }
    },

    // Clear all errors in a form
    clearAllErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.querySelectorAll('.form-error').forEach(el => {
            el.classList.remove('show');
        });

        form.querySelectorAll('.form-input').forEach(input => {
            input.style.borderColor = '';
        });
    },

    // Set button loading state
    setLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        if (loading) {
            button.classList.add('btn-loading');
            button.disabled = true;
        } else {
            button.classList.remove('btn-loading');
            button.disabled = false;
        }
    },

    // Get form data as object
    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value.trim();
        }

        return data;
    }
};

// ============================================
// Security Helpers
// ============================================
const Security = {
    // Disable paste on element
    disablePaste(element) {
        element.addEventListener('paste', (e) => {
            e.preventDefault();
            Toast.warning('Paste Disabled', 'Please type your credentials manually');
        });
    },

    // Disable copy on element
    disableCopy(element) {
        element.addEventListener('copy', (e) => {
            e.preventDefault();
        });
    },

    // Disable cut on element
    disableCut(element) {
        element.addEventListener('cut', (e) => {
            e.preventDefault();
        });
    },

    // Apply all security measures to input
    secureInput(element) {
        this.disablePaste(element);
        this.disableCopy(element);
        this.disableCut(element);

        // Disable autocomplete
        element.setAttribute('autocomplete', 'off');
        element.setAttribute('autocorrect', 'off');
        element.setAttribute('autocapitalize', 'off');
        element.setAttribute('spellcheck', 'false');

        // Add secure class
        element.classList.add('secure-input');
    }
};

// ============================================
// Navigation Security (Back/Forward/History)
// ============================================
const NavigationSecurity = {
    // Initialize protection on protected pages
    initProtectedPage() {
        // Prevent back navigation by pushing state
        this.preventBackNavigation();

        // Check session on visibility change (tab focus)
        this.initVisibilityCheck();

        // Add no-cache meta tags dynamically
        this.addNoCacheMeta();
    },

    // Prevent back button after logout
    preventBackNavigation() {
        // Push a new state to prevent going back
        history.pushState(null, '', location.href);

        window.addEventListener('popstate', async (e) => {
            // Push state again to prevent back
            history.pushState(null, '', location.href);

            // Check if session is still valid
            const session = await window.supabaseConfig.getSession();
            if (!session) {
                // No session - redirect to login
                this.secureRedirect('/admin/login.html');
            }
        });
    },

    // Check session when tab becomes visible
    initVisibilityCheck() {
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible') {
                const session = await window.supabaseConfig.getSession();
                if (!session) {
                    this.secureRedirect('/admin/login.html');
                }
            }
        });
    },

    // Add no-cache meta tags
    addNoCacheMeta() {
        const metaTags = [
            { 'http-equiv': 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
            { 'http-equiv': 'Pragma', content: 'no-cache' },
            { 'http-equiv': 'Expires', content: '0' }
        ];

        metaTags.forEach(attrs => {
            const meta = document.createElement('meta');
            Object.keys(attrs).forEach(key => {
                meta.setAttribute(key, attrs[key]);
            });
            document.head.appendChild(meta);
        });
    },

    // Secure redirect (replaces history, prevents back)
    secureRedirect(url) {
        // Only clear tab_id, not everything
        sessionStorage.removeItem('tab_id');

        // Replace current history entry
        history.replaceState(null, '', url);

        // Navigate to new URL
        window.location.replace(url);
    },

    // Logout with full security (individual tab)
    // Delegates to Auth.logout() - SINGLE SOURCE OF TRUTH
    async secureLogout() {
        if (window.Auth) {
            await window.Auth.logout();
        } else {
            // Fallback if Auth not loaded
            window.location.replace('/admin/login.html');
        }
    },

    // Logout from ALL sessions (global logout)
    // Delegates to Auth.logoutAll() - SINGLE SOURCE OF TRUTH
    async secureLogoutAll() {
        const admin = window.Auth ? await window.Auth.getCurrentAdmin() : null;

        if (admin && window.Auth) {
            await window.Auth.logoutAll(admin.id);
        } else {
            // Fallback if Auth not loaded or no admin
            window.location.replace('/admin/login.html');
        }
    },

    // Initialize for login page (public page)
    initPublicPage() {
        // Add no-cache meta
        this.addNoCacheMeta();

        // Clear forward history by replacing state
        history.replaceState(null, '', location.href);
    }
};

// ============================================
// Password Toggle
// ============================================
function initPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function () {
            const input = this.parentElement.querySelector('.form-input');
            const icon = this.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

// ============================================
// Page Protection (Redirect if not authenticated)
// ============================================
async function requireAuth(redirectTo = null) {
    if (!redirectTo) {
        // If on subdomain, root is login. If not, /admin/login.html
        redirectTo = window.location.hostname.includes('admin.') ? '/' : '/admin/';
    }

    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = redirectTo;
        return false;
    }
    return true;
}

async function requireNoAuth(redirectTo = null) {
    if (!redirectTo) {
        redirectTo = window.location.hostname.includes('admin.') ? '/dashboard/' : '/admin/dashboard/';
    }

    const session = await window.supabaseConfig.getSession();
    if (session) {
        window.location.href = redirectTo;
        return false;
    }
    return true;
}

// ============================================
// Utility Functions
// ============================================
function formatAdminId(num) {
    return `ACS-${String(num).padStart(2, '0')}`;
}

function parseAdminId(id) {
    const match = id.match(/^ACS-(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
}

// Store email temporarily for verify page
function setTempEmail(email) {
    sessionStorage.setItem('pending_verification_email', email);
}

function getTempEmail() {
    return sessionStorage.getItem('pending_verification_email');
}

function clearTempEmail() {
    sessionStorage.removeItem('pending_verification_email');
}

// ============================================
// Account Manager (Gmail-style multi-account)
// ============================================
const AccountManager = {
    STORAGE_KEY: 'admin_accounts',

    // Get all stored accounts
    getAccounts() {
        try {
            const data = sessionStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading accounts:', e);
            return [];
        }
    },

    // Save accounts to storage
    saveAccounts(accounts) {
        try {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts));
        } catch (e) {
            console.error('Error saving accounts:', e);
        }
    },

    // Get current active account
    getCurrentAccount() {
        const accounts = this.getAccounts();
        return accounts.find(acc => acc.is_current) || accounts[0] || null;
    },

    // Generate initials from name
    getInitials(fullName) {
        if (!fullName) return '??';
        const parts = fullName.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return fullName.substring(0, 2).toUpperCase();
    },

    // Add or update an account
    addAccount(accountData, makeCurrent = true) {
        let accounts = this.getAccounts();

        // Check if account already exists
        const existingIndex = accounts.findIndex(acc => acc.id === accountData.id);

        if (existingIndex !== -1) {
            // Update existing account
            accounts[existingIndex] = {
                ...accounts[existingIndex],
                ...accountData,
                is_current: makeCurrent ? true : accounts[existingIndex].is_current
            };
        } else {
            // Add new account
            accounts.push({
                ...accountData,
                initials: this.getInitials(accountData.full_name),
                is_current: makeCurrent
            });
        }

        // If making current, unset others
        if (makeCurrent) {
            accounts = accounts.map(acc => ({
                ...acc,
                is_current: acc.id === accountData.id
            }));
        }

        this.saveAccounts(accounts);
        return accounts;
    },

    // Remove an account
    removeAccount(accountId) {
        let accounts = this.getAccounts();
        const removedAccount = accounts.find(acc => acc.id === accountId);
        const wasCurrent = removedAccount?.is_current;

        accounts = accounts.filter(acc => acc.id !== accountId);

        // If removed account was current, make first remaining account current
        if (wasCurrent && accounts.length > 0) {
            accounts[0].is_current = true;
        }

        this.saveAccounts(accounts);

        return {
            accounts,
            removedAccount,
            newCurrentAccount: wasCurrent ? accounts[0] : null
        };
    },

    // Switch to a different account
    switchAccount(accountId) {
        let accounts = this.getAccounts();

        accounts = accounts.map(acc => ({
            ...acc,
            is_current: acc.id === accountId
        }));

        this.saveAccounts(accounts);
        return accounts.find(acc => acc.id === accountId);
    },

    // Clear all accounts
    clearAll() {
        sessionStorage.removeItem(this.STORAGE_KEY);
    },

    // Check if account exists
    hasAccount(accountId) {
        return this.getAccounts().some(acc => acc.id === accountId);
    },

    // Get account count
    getAccountCount() {
        return this.getAccounts().length;
    },

    // Sync stored accounts with actual Supabase session
    // This ensures the "current" account matches what Supabase actually has
    syncWithSupabaseSession(supabaseUserId) {
        let accounts = this.getAccounts();

        // Check if this user is in our accounts list
        const existingAccount = accounts.find(acc => acc.id === supabaseUserId);

        if (existingAccount) {
            // User exists - make sure they're marked as current
            if (!existingAccount.is_current) {
                accounts = accounts.map(acc => ({
                    ...acc,
                    is_current: acc.id === supabaseUserId
                }));
                this.saveAccounts(accounts);
            }
            return existingAccount;
        }

        // User not in our list - they logged in from another tab
        // Return null to indicate we need to add them
        return null;
    },

    // Store session tokens for an account
    storeSession(accountId, session) {
        let accounts = this.getAccounts();
        const index = accounts.findIndex(acc => acc.id === accountId);

        if (index !== -1 && session) {
            accounts[index].access_token = session.access_token;
            accounts[index].refresh_token = session.refresh_token;
            accounts[index].expires_at = session.expires_at;
            this.saveAccounts(accounts);
        }
    },

    // Get stored session for an account
    getStoredSession(accountId) {
        const accounts = this.getAccounts();
        const account = accounts.find(acc => acc.id === accountId);

        if (account && account.access_token) {
            return {
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at
            };
        }
        return null;
    },

    // Render account panel HTML
    renderAccountPanel(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const accounts = this.getAccounts();
        const currentAccount = this.getCurrentAccount();

        container.innerHTML = `
            <div class="account-panel">
                <button class="account-trigger" id="account-trigger">
                    <div class="account-avatar">
                        ${currentAccount ? currentAccount.initials : '??'}
                    </div>
                    <div class="account-info">
                        <span class="account-name">${currentAccount?.full_name || 'Loading...'}</span>
                        <span class="account-id">${currentAccount?.admin_id || ''}</span>
                    </div>
                    <i class="fa-solid fa-chevron-down account-arrow"></i>
                </button>
                
                <div class="account-dropdown" id="account-dropdown">
                    <div class="account-dropdown-header">
                        <span>Manage Accounts</span>
                    </div>
                    
                    <div class="account-list" id="account-list">
                        ${accounts.map(acc => `
                            <div class="account-item ${acc.is_current ? 'current' : ''}" data-account-id="${acc.id}">
                                <div class="account-item-avatar">${acc.initials}</div>
                                <div class="account-item-details">
                                    <span class="account-item-name">${acc.full_name}</span>
                                    <span class="account-item-email">${acc.email}</span>
                                    <span class="account-item-id">${acc.admin_id || 'Pending'}</span>
                                </div>
                                ${acc.is_current
                ? '<span class="account-current-badge"><i class="fa-solid fa-check"></i></span>'
                : `<button class="account-remove-btn" data-account-id="${acc.id}" title="Remove account">
                                        <i class="fa-solid fa-xmark"></i>
                                       </button>`
            }
                            </div>
                        `).join('')}
                    </div>
                    
                    <button class="account-add-btn" id="add-account-btn">
                        <div class="account-add-icon">
                            <i class="fa-solid fa-plus"></i>
                        </div>
                        <span>Add another account</span>
                    </button>
                    
                    <div class="account-actions">
                        <button class="account-action-btn" id="logout-current-btn">
                            <i class="fa-solid fa-right-from-bracket"></i>
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.initPanelEvents();
    },

    // Initialize panel event listeners
    initPanelEvents() {
        const trigger = document.getElementById('account-trigger');
        const dropdown = document.getElementById('account-dropdown');

        if (!trigger || !dropdown) return;

        // Toggle dropdown
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();

            // Mutual exclusion: close mobile nav if open
            if (window.AdminSidebar && typeof window.AdminSidebar.closeMobileNav === 'function') {
                window.AdminSidebar.closeMobileNav();
            }

            dropdown.classList.toggle('open');
            trigger.classList.toggle('open');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.account-panel')) {
                dropdown.classList.remove('open');
                trigger.classList.remove('open');
            }
        });

        // Account item click (switch) - but not when clicking remove button
        document.querySelectorAll('.account-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                // Don't switch if clicking the remove button
                if (e.target.closest('.account-remove-btn')) return;

                const accountId = item.dataset.accountId;
                if (!item.classList.contains('current')) {
                    await this.handleSwitchAccount(accountId);
                }
            });
        });

        // Remove account buttons
        document.querySelectorAll('.account-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const accountId = btn.dataset.accountId;
                this.handleRemoveAccount(accountId);
            });
        });

        // Add account button
        document.getElementById('add-account-btn')?.addEventListener('click', () => {
            dropdown.classList.remove('open');
            trigger.classList.remove('open');
            this.showAddAccountModal();
        });

        // Logout current
        document.getElementById('logout-current-btn')?.addEventListener('click', () => {
            this.handleLogoutCurrent();
        });
    },

    // Handle switching accounts
    async handleSwitchAccount(accountId) {
        const { Toast, NavigationSecurity } = window.AdminUtils;

        const storedSession = this.getStoredSession(accountId);
        if (!storedSession) {
            Toast.error('Session Expired', 'Please login to this account again');
            this.removeAccount(accountId);
            location.reload();
            return;
        }

        try {
            // Stop realtime session monitoring BEFORE switching
            // This prevents the old session from triggering "logged out" modal
            if (window.Auth && window.Auth.sessionChannel) {
                window.supabaseClient.removeChannel(window.Auth.sessionChannel);
                window.Auth.sessionChannel = null;
            }
            window.Auth.isLoggingOut = true; // Prevent triggers during switch

            // Clear old session token before switching
            sessionStorage.removeItem('session_token');

            // Set the session in Supabase
            const { error } = await window.supabaseClient.auth.setSession({
                access_token: storedSession.access_token,
                refresh_token: storedSession.refresh_token
            });

            if (error) throw error;

            // Update current account
            this.switchAccount(accountId);

            Toast.success('Account Switched', 'Refreshing dashboard...');

            setTimeout(() => {
                location.reload();
            }, 500);

        } catch (error) {
            console.error('Switch account error:', error);
            Toast.error('Switch Failed', 'Could not switch account. Please login again.');
            this.removeAccount(accountId);
            location.reload();
        }
    },

    // Handle removing an account
    handleRemoveAccount(accountId) {
        const { Modal, Toast, NavigationSecurity } = window.AdminUtils;
        const accounts = this.getAccounts();
        const account = accounts.find(acc => acc.id === accountId);

        if (!account) return;

        Modal.show({
            type: 'warning',
            title: 'Remove Account',
            message: `Remove ${account.full_name} (${account.admin_id || account.email}) from this browser?`,
            buttons: [
                { text: 'Cancel' },
                {
                    text: 'Remove',
                    primary: true,
                    onClick: async () => {
                        const result = this.removeAccount(accountId);

                        if (result.accounts.length === 0) {
                            // No accounts left, go to login
                            NavigationSecurity.secureRedirect('/admin/login.html');
                        } else if (result.newCurrentAccount) {
                            // Removed current account, switch to new one
                            await this.handleSwitchAccount(result.newCurrentAccount.id);
                        } else {
                            Toast.success('Account Removed', '');
                            location.reload();
                        }
                    }
                }
            ]
        });
    },

    // Handle logout current
    handleLogoutCurrent() {
        const { Modal, Toast, NavigationSecurity } = window.AdminUtils;
        const currentAccount = this.getCurrentAccount();
        const accountCount = this.getAccountCount();

        Modal.confirm(
            'Logout',
            accountCount > 1
                ? 'Logout from current account? You will be switched to another account.'
                : 'Are you sure you want to logout?',
            async () => {
                if (currentAccount) {
                    const result = this.removeAccount(currentAccount.id);

                    if (result.accounts.length > 0 && result.newCurrentAccount) {
                        // Switch to next account FIRST (before signing out)
                        // This sets the new session before we lose the current one
                        const storedSession = this.getStoredSession(result.newCurrentAccount.id);

                        if (storedSession) {
                            try {
                                // Set the new session
                                await window.supabaseClient.auth.setSession({
                                    access_token: storedSession.access_token,
                                    refresh_token: storedSession.refresh_token
                                });

                                Toast.success('Switched Account', `Now logged in as ${result.newCurrentAccount.full_name}`);

                                setTimeout(() => {
                                    location.reload();
                                }, 500);
                                return;
                            } catch (error) {
                                console.error('Switch error:', error);
                                // If switch fails, remove that account too and continue
                                this.removeAccount(result.newCurrentAccount.id);
                            }
                        }
                    }

                    // No other accounts or switch failed - delegate to Auth
                    await window.Auth.logout();
                } else {
                    // Normal logout - delegate to Auth
                    await window.Auth.logout();
                }
            }
        );
    },

    // Handle logout all
    handleLogoutAll() {
        const { Modal, NavigationSecurity } = window.AdminUtils;

        Modal.confirm(
            'Logout All Accounts',
            'This will sign out from all accounts on this device. Continue?',
            async () => {
                this.clearAll();
                await NavigationSecurity.secureLogoutAll();
            }
        );
    },

    // Show add account modal
    showAddAccountModal() {
        const existingModal = document.getElementById('add-account-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'add-account-modal';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal add-account-modal">
                <button class="modal-close" id="close-add-modal">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                
                <div class="modal-icon info">
                    <i class="fa-solid fa-user-plus"></i>
                </div>
                
                <h3 class="modal-title">Add Another Account</h3>
                
                <form id="add-account-form" class="auth-form" style="margin-top: 1.5rem;">
                    <div class="form-group">
                        <label class="form-label" for="add-identifier">Email or Admin ID</label>
                        <input type="text" id="add-identifier" class="form-input" placeholder="admin@example.com or ACS-01" required>
                        <div id="add-identifier-error" class="form-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="add-password">Password</label>
                        <div class="form-input-wrapper">
                            <input type="password" id="add-password" class="form-input has-icon" placeholder="Enter password" required>
                            <button type="button" class="password-toggle" id="add-password-toggle">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                        </div>
                        <div id="add-password-error" class="form-error"></div>
                    </div>
                    
                    <button type="submit" id="add-account-submit" class="btn btn-primary btn-full">
                        <i class="fa-solid fa-right-to-bracket"></i>
                        Sign In
                    </button>
                </form>
                
                <div class="auth-divider">or</div>
                
                <p class="auth-link">
                    Don't have an account? <a href="/admin/signup.html">Sign Up</a>
                </p>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Close modal
        const closeModal = () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(() => modal.remove(), 300);
        };

        document.getElementById('close-add-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Apply security to inputs (disable paste/copy)
        const { Security } = window.AdminUtils;
        const identifierInput = document.getElementById('add-identifier');
        const passwordInput = document.getElementById('add-password');

        Security.secureInput(identifierInput);
        Security.secureInput(passwordInput);

        // Password toggle
        document.getElementById('add-password-toggle').addEventListener('click', function () {
            const input = document.getElementById('add-password');
            const icon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });

        // Form submit
        document.getElementById('add-account-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddAccountSubmit(closeModal);
        });
    },

    // Handle add account form submission
    async handleAddAccountSubmit(closeModal) {
        const { Toast, FormHelpers, Validators } = window.AdminUtils;

        const identifier = document.getElementById('add-identifier').value.trim();
        const password = document.getElementById('add-password').value;
        const submitBtn = document.getElementById('add-account-submit');

        // Clear errors
        document.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));

        // Validate
        if (!identifier) {
            document.getElementById('add-identifier-error').innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Please enter email or Admin ID';
            document.getElementById('add-identifier-error').classList.add('show');
            return;
        }

        if (!password) {
            document.getElementById('add-password-error').innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Please enter password';
            document.getElementById('add-password-error').classList.add('show');
            return;
        }

        // Check if already added
        const accounts = this.getAccounts();
        const existing = accounts.find(acc =>
            acc.email === identifier || acc.admin_id === identifier
        );
        if (existing) {
            Toast.warning('Already Added', 'This account is already in your list');
            closeModal();
            return;
        }

        // Loading state
        submitBtn.classList.add('btn-loading');
        submitBtn.disabled = true;

        try {
            // Login via Auth
            const result = await window.Auth.login(identifier, password);

            if (!result.success) {
                throw new Error(result.error);
            }

            // Get session
            const { data: { session } } = await window.supabaseClient.auth.getSession();

            // Add account
            this.addAccount({
                id: result.user.id,
                admin_id: result.admin.admin_id,
                email: result.user.email,
                full_name: result.admin.full_name,
                initials: this.getInitials(result.admin.full_name)
            }, true);

            // Store session tokens
            if (session) {
                this.storeSession(result.user.id, session);
            }

            Toast.success('Account Added', `Signed in as ${result.admin.full_name}`);
            closeModal();

            setTimeout(() => {
                location.reload();
            }, 500);

        } catch (error) {
            console.error('Add account error:', error);
            Toast.error('Sign In Failed', error.message);
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
        }
    }
};

// ============================================
// Session Timeout (Inactivity Lock)
// ============================================
const SessionTimeout = {
    INACTIVITY_TIMEOUT: 30 * 60 * 1000, // Default 30 minutes in ms
    WARNING_DURATION: 15, // 15 seconds countdown
    ACTIVITY_UPDATE_INTERVAL: 60 * 1000, // Update DB every 60 seconds

    inactivityTimer: null,
    countdownTimer: null,
    activityUpdateTimer: null,
    countdownSeconds: 15,
    isWarningShown: false,
    modalElement: null,
    lastActivityUpdate: 0,

    // Activity events to track
    activityEvents: ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'],

    // Initialize session timeout
    async init() {
        // Fetch timeout setting from database
        await this.loadTimeoutSetting();

        // Only run if timeout is not 'never' (0)
        if (this.INACTIVITY_TIMEOUT > 0) {
            this.resetTimer();
            this.bindActivityListeners();
        }
    },

    // Load timeout setting from database
    async loadTimeoutSetting() {
        try {
            const { data, error } = await window.supabaseClient
                .from('settings')
                .select('setting_value')
                .eq('setting_key', 'inactivity_timeout')
                .single();

            if (!error && data && data.setting_value !== undefined) {
                const value = data.setting_value;
                // Handle both string '0' and 'never'
                if (value === '0' || value === 0 || value === 'never') {
                    this.INACTIVITY_TIMEOUT = 0; // Never timeout
                } else {
                    const minutes = parseInt(value, 10);
                    if (!isNaN(minutes) && minutes > 0) {
                        this.INACTIVITY_TIMEOUT = minutes * 60 * 1000;
                    }
                }
            }
        } catch (err) {
            // Use default timeout setting on error
        }
    },

    // Bind activity listeners
    bindActivityListeners() {
        this.activityEvents.forEach(event => {
            document.addEventListener(event, () => this.handleActivity(), { passive: true });
        });

        // Also reset on visibility change (tab becomes visible)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !this.isWarningShown) {
                this.resetTimer();
            }
        });
    },

    // Handle user activity
    handleActivity() {
        if (!this.isWarningShown) {
            this.resetTimer();

            // Update session activity in DB (throttled)
            const now = Date.now();
            if (now - this.lastActivityUpdate > this.ACTIVITY_UPDATE_INTERVAL) {
                this.lastActivityUpdate = now;
                this.updateSessionActivity();
            }
        }
    },

    // Update session activity in database
    async updateSessionActivity() {
        if (window.Auth && typeof window.Auth.updateSessionActivity === 'function') {
            await window.Auth.updateSessionActivity();
        }
    },

    // Reset the inactivity timer
    resetTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }

        if (this.INACTIVITY_TIMEOUT <= 0) return; // Never timeout

        this.inactivityTimer = setTimeout(() => {
            this.showWarning();
        }, this.INACTIVITY_TIMEOUT);
    },

    // Show timeout warning modal
    showWarning() {
        if (this.isWarningShown) return;

        this.isWarningShown = true;
        this.countdownSeconds = this.WARNING_DURATION;

        // Create modal
        const inactivityMinutes = Math.round(this.INACTIVITY_TIMEOUT / 60000);
        this.modalElement = document.createElement('div');
        this.modalElement.id = 'session-timeout-modal';
        this.modalElement.className = 'session-timeout-overlay';
        this.modalElement.innerHTML = `
            <div class="session-timeout-modal">
                <div class="session-timeout-icon">
                    <i class="fa-solid fa-clock"></i>
                </div>
                <h3 class="session-timeout-title">Session Expiring</h3>
                <p class="session-timeout-message">
                    You've been inactive for ${inactivityMinutes} minute${inactivityMinutes !== 1 ? 's' : ''}.<br>
                    For security, you'll be logged out in:
                </p>
                <div class="session-timeout-countdown" id="timeout-countdown">
                    ${this.formatTime(this.countdownSeconds)}
                </div>
                <div class="session-timeout-actions">
                    <button class="btn btn-outline" id="timeout-logout-btn">
                        Logout Now
                    </button>
                    <button class="btn btn-primary" id="timeout-stay-btn">
                        <i class="fa-solid fa-check"></i>
                        Stay Logged In
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalElement);
        document.body.style.overflow = 'hidden';

        // Show with animation
        requestAnimationFrame(() => {
            this.modalElement.classList.add('active');
        });

        // Bind button events
        document.getElementById('timeout-stay-btn').addEventListener('click', () => {
            this.extendSession();
        });

        document.getElementById('timeout-logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Start countdown
        this.startCountdown();
    },

    // Format time as MM:SS
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    // Start countdown timer
    startCountdown() {
        const countdownEl = document.getElementById('timeout-countdown');

        this.countdownTimer = setInterval(() => {
            this.countdownSeconds--;

            if (countdownEl) {
                countdownEl.textContent = this.formatTime(this.countdownSeconds);

                // Add urgency class when low
                if (this.countdownSeconds <= 5) {
                    countdownEl.classList.add('urgent');
                }
            }

            if (this.countdownSeconds <= 0) {
                this.logout();
            }
        }, 1000);
    },

    // User chose to stay logged in
    extendSession() {
        this.hideWarning();
        this.resetTimer();

        const { Toast } = window.AdminUtils;
        Toast.success('Session Extended', 'You can continue working');
    },

    // Hide warning modal
    hideWarning() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }

        if (this.modalElement) {
            this.modalElement.classList.remove('active');
            document.body.style.overflow = '';

            setTimeout(() => {
                if (this.modalElement) {
                    this.modalElement.remove();
                    this.modalElement = null;
                }
            }, 300);
        }

        this.isWarningShown = false;
    },

    // Logout user
    async logout() {
        this.hideWarning();

        const { Toast } = window.AdminUtils;
        Toast.info('Session Expired', 'Logging out...');

        // Clear timers
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }

        // Delegate to Auth - SINGLE SOURCE OF TRUTH
        if (window.Auth) {
            await window.Auth.logout();
        } else {
            window.location.replace('/admin/login.html');
        }
    },

    // Stop all timers (call when leaving page)
    destroy() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
        }
        this.hideWarning();
    }
};

// ============================================
// Initialize on DOM Ready
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
});

// ============================================
// Skeleton Loading Helper
// ============================================
const Skeleton = {
    // Generate table skeleton rows
    tableRows(count = 5, columns = 4) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += '<div class="skeleton-row">';
            for (let j = 0; j < columns; j++) {
                html += '<div class="skeleton skeleton-cell"></div>';
            }
            html += '</div>';
        }
        return html;
    },

    // Generate card skeleton
    cards(count = 3) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="skeleton-card">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text" style="width: 50%"></div>
                    <div class="skeleton-actions">
                        <div class="skeleton skeleton-btn"></div>
                        <div class="skeleton skeleton-btn"></div>
                        <div class="skeleton skeleton-btn"></div>
                    </div>
                </div>
            `;
        }
        return html;
    },

    // Show skeleton in container
    show(containerId, type = 'table', count = 5) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (type === 'table') {
            container.innerHTML = this.tableRows(count);
        } else if (type === 'cards') {
            container.innerHTML = this.cards(count);
        }
    }
};

// ============================================
// Activity Logging
// ============================================
const Activity = {
    async add(type, name, link = null) {
        try {
            const session = await window.supabaseConfig.getSession();
            await window.supabaseClient.from('activities').insert({
                activity_type: type,
                activity_name: name,
                activity_link: link,
                admin_id: session?.user?.id || null
            });
        } catch (error) {
            console.error('Error adding activity:', error);
        }
    }
};

// ============================================
// Pagination Helper
// ============================================
const Pagination = {
    render(containerId, totalItems, currentPage, itemsPerPage, onPageChange) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) {
            const container = document.getElementById(containerId);
            if (container) container.innerHTML = '';
            return;
        }

        let html = `
            <div class="pagination">
                <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                html += `<span class="pagination-dots">...</span>`;
            }
        }

        html += `
                <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
        `;

        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
            container.querySelectorAll('.pagination-btn').forEach(btn => {
                btn.onclick = () => {
                    const page = parseInt(btn.dataset.page);
                    if (page >= 1 && page <= totalPages && page !== currentPage) {
                        onPageChange(page);
                    }
                };
            });
        }
    }
};

// Export utilities
window.AdminUtils = {
    Toast,
    Modal,
    Validators,
    Activity,
    Pagination,
    FormHelpers,
    Security,
    NavigationSecurity,
    AccountManager,
    SessionTimeout,
    Skeleton,
    requireAuth,
    requireNoAuth,
    formatAdminId,
    parseAdminId,
    setTempEmail,
    getTempEmail,
    clearTempEmail
};
