/**
 * Send A Message Modal - Shared WhatsApp Messaging Utility
 * v3.0 - CraftSoft Admin
 * 
 * Usage: 
 * 1. Include this script in your page
 * 2. Call window.AdminWaModal.show(name, phone) to open
 * 
 * Modal HTML is auto-injected if not present.
 */

window.AdminWaModal = (function () {
    let currentData = { name: '', phone: '' };
    let initialized = false;

    const modalHTML = `
    <div class="modal-overlay" id="whatsapp-modal-overlay">
        <div class="modal-container modal-md animate-scale">
            <div class="modal-header wa-modal-header">
                <h3><i class="fa-brands fa-whatsapp"></i> Send A Message</h3>
                <button class="modal-close" id="close-wa-modal">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="modal-body">
                <p class="wa-student-info">
                    Messaging: <strong id="wa-student-name"></strong>
                    <span class="wa-phone-badge" id="wa-student-phone"></span>
                </p>

                <div class="wa-template-grid">
                    <div class="wa-template-card active" data-action="direct">
                        <div class="wa-template-icon"><i class="fa-brands fa-whatsapp"></i></div>
                        <div class="wa-template-content">
                            <h4>Send a Message</h4>
                            <p>Open WhatsApp with custom message</p>
                        </div>
                    </div>
                </div>

                <div class="wa-message-preview" id="wa-message-section">
                    <label>MESSAGE (EDITABLE):</label>
                    <textarea id="wa-message-textarea" rows="5" placeholder="Type your message here..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" id="cancel-wa-modal">Cancel</button>
                <button class="btn btn-success" id="send-wa-btn">
                    <i class="fa-brands fa-whatsapp"></i> Open WhatsApp
                </button>
            </div>
        </div>
    </div>`;

    function init() {
        if (initialized) return;

        // Inject modal if not present
        if (!document.getElementById('whatsapp-modal-overlay')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
        initialized = true;
    }

    function show(name, phone) {
        init();
        currentData = { name, phone };

        const overlay = document.getElementById('whatsapp-modal-overlay');
        if (!overlay) {
            console.warn('WhatsApp modal overlay not found');
            return;
        }

        document.getElementById('wa-student-name').textContent = name;
        document.getElementById('wa-student-phone').textContent = phone;

        // Pre-fill with greeting
        const firstName = name.split(' ')[0];
        document.getElementById('wa-message-textarea').value = `Hi ${firstName},\n\n`;

        // Bind modal close/cancel
        document.getElementById('close-wa-modal').onclick = hide;
        document.getElementById('cancel-wa-modal').onclick = hide;
        document.getElementById('send-wa-btn').onclick = send;

        // Show modal
        overlay.classList.add('active');
    }

    function hide() {
        const overlay = document.getElementById('whatsapp-modal-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    function send() {
        const message = document.getElementById('wa-message-textarea').value;
        const cleanPhone = currentData.phone.replace(/\D/g, '');
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
        hide();
    }

    return { show, hide, send, init };
})();
