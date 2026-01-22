/**
 * Admin WhatsApp Modal Component v3.5
 * Handles WhatsApp messaging across all admin modules.
 */

(function () {
    const AdminWaModal = {
        currentData: { name: '', phone: '' },

        init() {
            if (document.getElementById('whatsapp-modal-overlay')) return;
            this.injectCSS();
            this.injectHTML();
            this.bindEvents();
            this.setupDelegation();
        },

        injectCSS() {
            if (!document.querySelector('link[href*="wa-modal.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = '/assets/admin/wa-modal/wa-modal.css';
                document.head.appendChild(link);
            }
        },

        injectHTML() {
            const html = `
            <div class="modal-overlay" id="whatsapp-modal-overlay">
                <div class="modal-container modal-md animate-scale">
                    <div class="modal-header wa-modal-header">
                        <h3><i class="fa-brands fa-whatsapp"></i> Send A Message</h3>
                        <button type="button" class="btn-icon" onclick="window.AdminWaModal.hide()">
                            <i class="fa-solid fa-xmark" style="color: white;"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="wa-student-info">
                            <span>To: <strong id="wa-display-name">---</strong></span>
                            <span class="wa-phone-badge" id="wa-display-phone">---</span>
                        </div>
                        <div class="wa-template-grid">
                            <div class="wa-template-card active">
                                <div class="wa-template-icon"><i class="fa-brands fa-whatsapp"></i></div>
                                <div class="wa-template-content">
                                    <h4>Direct Message</h4>
                                    <p>Open WhatsApp with a custom message</p>
                                </div>
                            </div>
                        </div>
                        <div class="wa-message-preview">
                            <label>Message (Edit directly):</label>
                            <textarea id="wa-message-textarea" rows="5" placeholder="Type your message here..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="window.AdminWaModal.hide()">Cancel</button>
                        <button type="button" class="btn btn-success" id="send-wa-btn-shared" style="background-color: #25D366; border-color: #25D366; color: white;">
                            <i class="fa-brands fa-whatsapp"></i> Open WhatsApp
                        </button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        },

        bindEvents() {
            document.getElementById('send-wa-btn-shared')?.addEventListener('click', () => this.sendMessage());

            // Close on overlay click
            document.getElementById('whatsapp-modal-overlay')?.addEventListener('click', (e) => {
                if (e.target.id === 'whatsapp-modal-overlay') this.hide();
            });
        },

        // Automatically handle any element with .btn-wa-trigger
        setupDelegation() {
            document.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-wa-trigger');
                if (btn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const name = btn.dataset.name || 'User';
                    const phone = btn.dataset.phone || '';
                    this.show(name, phone);
                }
            });
        },

        show(name, phone) {
            this.currentData = { name, phone };

            const overlay = document.getElementById('whatsapp-modal-overlay');
            const nameEl = document.getElementById('wa-display-name');
            const phoneEl = document.getElementById('wa-display-phone');
            const textarea = document.getElementById('wa-message-textarea');

            if (nameEl) nameEl.textContent = name;
            if (phoneEl) phoneEl.textContent = phone;

            // Generate greeting
            const firstName = name.split(' ')[0];
            if (textarea) {
                textarea.value = `Hi ${firstName},\n\n`;
                textarea.focus();
            }

            if (overlay) overlay.classList.add('active');
        },

        hide() {
            document.getElementById('whatsapp-modal-overlay')?.classList.remove('active');
        },

        sendMessage() {
            const message = document.getElementById('wa-message-textarea')?.value;
            if (!this.currentData.phone) return;

            // Clean phone number
            let cleanPhone = this.currentData.phone.replace(/\D/g, '');
            if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

            const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
            this.hide();
        }
    };

    window.AdminWaModal = AdminWaModal;

    // Auto-init on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AdminWaModal.init());
    } else {
        AdminWaModal.init();
    }
})();
