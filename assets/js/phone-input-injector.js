/**
 * Phone Input Auto-Injection
 * Automatically transforms all tel inputs into flag-based country code inputs
 * Works on all pages without manual HTML changes
 */

const PhoneInputInjector = {
    // Country code to flag mapping
    countryFlags: {
        '+91': { flag: '🇮🇳', name: 'India' },
        '+1': { flag: '🇺🇸', name: 'USA/Canada' },
        '+44': { flag: '🇬🇧', name: 'UK' },
        '+61': { flag: '🇦🇺', name: 'Australia' },
        '+971': { flag: '🇦🇪', name: 'UAE' },
        '+966': { flag: '🇸🇦', name: 'Saudi Arabia' },
        '+65': { flag: '🇸🇬', name: 'Singapore' },
        '+49': { flag: '🇩🇪', name: 'Germany' },
        '+33': { flag: '🇫🇷', name: 'France' },
        '+81': { flag: '🇯🇵', name: 'Japan' },
        '+86': { flag: '🇨🇳', name: 'China' },
        '+82': { flag: '🇰🇷', name: 'South Korea' },
        '+60': { flag: '🇲🇾', name: 'Malaysia' },
        '+63': { flag: '🇵🇭', name: 'Philippines' },
        '+94': { flag: '🇱🇰', name: 'Sri Lanka' },
        '+977': { flag: '🇳🇵', name: 'Nepal' },
        '+880': { flag: '🇧🇩', name: 'Bangladesh' },
        '+92': { flag: '🇵🇰', name: 'Pakistan' },
        '+27': { flag: '🇿🇦', name: 'South Africa' },
        '+234': { flag: '🇳🇬', name: 'Nigeria' },
        '+254': { flag: '🇰🇪', name: 'Kenya' }
    },

    getFlagForCode(code) {
        const normalized = code.startsWith('+') ? code : `+${code}`;
        return this.countryFlags[normalized] || { flag: '🌍', name: 'Other' };
    },

    // Inject CSS styles
    injectStyles() {
        if (document.getElementById('phone-injector-styles')) return;

        const style = document.createElement('style');
        style.id = 'phone-injector-styles';
        style.textContent = `
            .phone-input-injected {
                display: flex !important;
                align-items: stretch !important;
                gap: 0 !important;
                border: 1.5px solid #f1f5f9 !important;
                border-radius: 0.875rem !important;
                overflow: hidden !important;
                background: #f8fafc !important;
                transition: border-color 0.2s, box-shadow 0.2s !important;
            }
            .phone-input-injected:focus-within {
                border-color: #3b82f6 !important;
                box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.05) !important;
                background: white !important;
            }
            .phone-input-injected .country-code-input {
                width: 80px !important;
                min-width: 80px !important;
                padding: 0.875rem 0.5rem !important;
                border: none !important;
                border-right: 1.5px solid #f1f5f9 !important;
                background: rgba(40, 150, 205, 0.05) !important;
                font-size: 0.95rem !important;
                text-align: center !important;
                outline: none !important;
                font-family: inherit !important;
                color: #0f172a !important;
            }
            .phone-input-injected .flag-display-btn {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 0.5rem !important;
                width: 80px !important;
                min-width: 80px !important;
                padding: 0.875rem 0.5rem !important;
                border: none !important;
                border-right: 1.5px solid #f1f5f9 !important;
                background: rgba(40, 150, 205, 0.05) !important;
                cursor: pointer !important;
                font-size: 0.95rem !important;
                transition: background 0.2s !important;
            }
            .phone-input-injected .flag-display-btn:hover {
                background: rgba(40, 150, 205, 0.1) !important;
            }
            .phone-input-injected .flag-display-btn .flag-emoji {
                font-size: 1.25rem !important;
            }
            .phone-input-injected .flag-display-btn .code-text {
                font-size: 0.85rem !important;
                color: #0f172a !important;
                font-weight: 700 !important;
            }
            .phone-input-injected .phone-number-input {
                flex: 1 !important;
                padding: 0.875rem 1.25rem !important;
                border: none !important;
                background: transparent !important;
                font-size: 1rem !important;
                color: #0f172a !important;
                outline: none !important;
                font-family: inherit !important;
            }
            .phone-input-injected .phone-number-input::placeholder {
                color: #94a3b8 !important;
            }
        `;
        document.head.appendChild(style);
    },

    // Transform a single tel input
    transformInput(originalInput) {
        // Skip if already transformed
        if (originalInput.dataset.phoneInjected) return;

        // Get original attributes
        const originalId = originalInput.id;
        const originalName = originalInput.name;
        const originalPlaceholder = originalInput.placeholder;
        const originalValue = originalInput.value;

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'phone-input-injected';

        // Create country code input
        const codeInput = document.createElement('input');
        codeInput.type = 'text';
        codeInput.className = 'country-code-input';
        codeInput.id = `${originalId}-country-code`;
        codeInput.placeholder = '+91';
        codeInput.maxLength = 5;
        codeInput.value = '+91';

        // Create flag button (hidden initially)
        const flagBtn = document.createElement('button');
        flagBtn.type = 'button';
        flagBtn.className = 'flag-display-btn';
        flagBtn.style.display = 'none';
        flagBtn.innerHTML = `
            <span class="flag-emoji">🇮🇳</span>
            <span class="code-text">+91</span>
        `;

        // Create phone number input
        const phoneInput = document.createElement('input');
        phoneInput.type = 'tel';
        phoneInput.className = 'phone-number-input';
        phoneInput.id = originalId;
        phoneInput.name = originalName;
        phoneInput.placeholder = 'Phone number';
        phoneInput.value = originalValue;

        // Add hidden field to store country code for form submission
        const hiddenCodeInput = document.createElement('input');
        hiddenCodeInput.type = 'hidden';
        hiddenCodeInput.id = `${originalId}-hidden-code`;
        hiddenCodeInput.name = `${originalName}_country_code`;
        hiddenCodeInput.value = '+91';

        // Assemble wrapper
        wrapper.appendChild(codeInput);
        wrapper.appendChild(flagBtn);
        wrapper.appendChild(phoneInput);
        wrapper.appendChild(hiddenCodeInput);

        // Replace original input
        originalInput.parentNode.replaceChild(wrapper, originalInput);
        originalInput.dataset.phoneInjected = 'true';

        // Bind events
        this.bindInputEvents(codeInput, flagBtn, hiddenCodeInput);
    },

    bindInputEvents(codeInput, flagBtn, hiddenCodeInput) {
        const self = this;

        // On blur: transform to flag button
        codeInput.addEventListener('blur', () => {
            const code = codeInput.value.trim();
            if (!code) return;

            const countryInfo = self.getFlagForCode(code);
            const displayCode = code.startsWith('+') ? code : `+${code}`;

            flagBtn.querySelector('.flag-emoji').textContent = countryInfo.flag;
            flagBtn.querySelector('.code-text').textContent = displayCode;

            // Update hidden field
            hiddenCodeInput.value = displayCode;
            codeInput.value = displayCode;

            codeInput.style.display = 'none';
            flagBtn.style.display = 'flex';
        });

        // On flag click: transform back to input
        flagBtn.addEventListener('click', () => {
            flagBtn.style.display = 'none';
            codeInput.style.display = 'block';
            codeInput.focus();
            codeInput.select();
        });
    },

    // Initialize on page load
    init() {
        this.injectStyles();

        // Find all tel inputs and transform them
        const telInputs = document.querySelectorAll('input[type="tel"]:not([data-phone-injected])');
        telInputs.forEach(input => this.transformInput(input));

        console.log(`PhoneInputInjector: Transformed ${telInputs.length} phone inputs`);
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PhoneInputInjector.init());
} else {
    PhoneInputInjector.init();
}

// Export for manual use if needed
window.PhoneInputInjector = PhoneInputInjector;
