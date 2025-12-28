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
async function requireAuth(redirectTo = '/admin/login.html') {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = redirectTo;
        return false;
    }
    return true;
}

async function requireNoAuth(redirectTo = '/admin/dashboard.html') {
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
// Initialize on DOM Ready
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
});

// Export utilities
window.AdminUtils = {
    Toast,
    Modal,
    Validators,
    FormHelpers,
    Security,
    requireAuth,
    requireNoAuth,
    formatAdminId,
    parseAdminId,
    setTempEmail,
    getTempEmail,
    clearTempEmail
};
