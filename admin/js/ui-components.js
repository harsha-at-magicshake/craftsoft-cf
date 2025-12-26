/* ============================================
   UI Components - Custom Modals & Toasts
   Website-themed (no browser alerts)
   ============================================ */

// ============================================
// MODAL COMPONENT
// ============================================

class Modal {
    constructor() {
        this.overlay = null;
        this.createOverlay();
    }

    createOverlay() {
        // Check if overlay already exists
        if (document.getElementById('modalOverlay')) {
            this.overlay = document.getElementById('modalOverlay');
            return;
        }

        this.overlay = document.createElement('div');
        this.overlay.id = 'modalOverlay';
        this.overlay.className = 'modal-overlay';
        this.overlay.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true">
                <button class="modal-close" aria-label="Close modal">
                    <i class="fas fa-times"></i>
                </button>
                <div class="modal-icon"></div>
                <h2 class="modal-title"></h2>
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
    }

    show({ type = 'info', title, message, buttons = [], showClose = true, customIcon = null }) {
        const modal = this.overlay.querySelector('.modal');
        const iconEl = modal.querySelector('.modal-icon');
        const titleEl = modal.querySelector('.modal-title');
        const messageEl = modal.querySelector('.modal-message');
        const actionsEl = modal.querySelector('.modal-actions');
        const closeBtn = modal.querySelector('.modal-close');

        // Set icon based on type
        const icons = {
            success: 'fa-check',
            error: 'fa-times',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info',
            primary: 'fa-user-shield'
        };

        const iconClass = customIcon || icons[type] || icons.info;
        iconEl.className = `modal-icon ${type}`;
        iconEl.innerHTML = `<i class="fas ${iconClass}"></i>`;

        // Set content
        titleEl.textContent = title;
        messageEl.innerHTML = message;

        // Close button visibility
        closeBtn.style.display = showClose ? 'flex' : 'none';

        // Create buttons
        actionsEl.innerHTML = '';
        if (buttons.length === 0) {
            buttons = [{ text: 'Got it', type: 'primary', onClick: () => this.hide() }];
        }

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = `modal-btn modal-btn-${btn.type || 'primary'} ${btn.className || ''}`;
            button.textContent = btn.text;
            button.addEventListener('click', () => {
                if (btn.onClick) btn.onClick();
                if (btn.closeOnClick !== false) this.hide();
            });
            actionsEl.appendChild(button);
        });

        // Show modal
        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Execute onRender callback if provided
        if (arguments[0].onRender) {
            arguments[0].onRender(modal);
        }

        // Focus first button
        const firstButton = actionsEl.querySelector('button');
        if (firstButton) firstButton.focus();
    }

    hide() {
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Convenience methods
    success(title, message, buttons) {
        this.show({ type: 'success', title, message, buttons });
    }

    error(title, message, buttons) {
        this.show({ type: 'error', title, message, buttons });
    }

    warning(title, message, buttons) {
        this.show({ type: 'warning', title, message, buttons });
    }

    info(title, message, buttons) {
        this.show({ type: 'info', title, message, buttons });
    }

    confirm(title, message, onConfirm, onCancel) {
        this.show({
            type: 'warning',
            title,
            message,
            showClose: false,
            buttons: [
                {
                    text: 'Cancel',
                    type: 'secondary',
                    onClick: onCancel
                },
                {
                    text: 'Confirm',
                    type: 'primary',
                    onClick: onConfirm
                }
            ]
        });
    }
}

// ============================================
// TOAST COMPONENT
// ============================================

class Toast {
    constructor() {
        this.container = null;
        this.createContainer();
    }

    createContainer() {
        // Check if container already exists
        if (document.getElementById('toastContainer')) {
            this.container = document.getElementById('toastContainer');
            return;
        }

        this.container = document.createElement('div');
        this.container.id = 'toastContainer';
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    }

    show({ type = 'info', title, message, duration = 5000 }) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'fa-check',
            error: 'fa-times',
            warning: 'fa-exclamation',
            info: 'fa-info'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icons[type] || icons.info}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to container
        this.container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.remove(toast));

        // Auto remove
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        return toast;
    }

    remove(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // Convenience methods
    success(title, message, duration) {
        return this.show({ type: 'success', title, message, duration });
    }

    error(title, message, duration) {
        return this.show({ type: 'error', title, message, duration });
    }

    warning(title, message, duration) {
        return this.show({ type: 'warning', title, message, duration });
    }

    info(title, message, duration) {
        return this.show({ type: 'info', title, message, duration });
    }
}

// ============================================
// Initialize and export
// ============================================

window.modal = new Modal();
window.toast = new Toast();
