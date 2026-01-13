/**
 * Inquiry Sync Module v3
 * Syncs form submissions to Supabase inquiries table
 * Handles duplicate key errors with retry mechanism
 */

const InquirySync = {
    // Course name to code mapping
    courseCodeMap: {
        'Graphic Design': 'GD',
        'UI/UX Design': 'UX',
        'Full Stack Development': 'MERN',
        'Full Stack Development (MERN)': 'MERN',
        'Python Full Stack': 'PYFS',
        'Python Full Stack Development': 'PYFS',
        'Java Full Stack': 'JAVA',
        'Java Full Stack Development': 'JAVA',
        'DSA Mastery': 'DSA',
        'Data Analytics': 'DA',
        'Salesforce': 'SF',
        'Salesforce Administration': 'SF',
        'Python Programming': 'PY',
        'React JS': 'REACT',
        'Git & GitHub': 'GIT',
        'DevOps Engineering': 'DEVOPS',
        'DevOps': 'DEVOPS',
        'AWS Cloud': 'AWS',
        'AWS': 'AWS',
        'DevSecOps': 'DEVSEC',
        'Microsoft Azure': 'AZURE',
        'Azure': 'AZURE',
        'Automation with Python': 'AUTOPY',
        'Spoken English': 'ENG',
        'Spoken English Mastery': 'ENG',
        'Soft Skills': 'SOFT',
        'Soft Skills Training': 'SOFT',
        'Resume & Interview': 'RESUME',
        'Resume & Interview Prep': 'RESUME',
        'Handwriting': 'HW',
        'Handwriting Improvement': 'HW',
        // Direct code mappings
        'GD': 'GD', 'UX': 'UX', 'MERN': 'MERN', 'PYFS': 'PYFS', 'JAVA': 'JAVA',
        'DSA': 'DSA', 'DA': 'DA', 'SF': 'SF', 'PY': 'PY', 'REACT': 'REACT',
        'GIT': 'GIT', 'DEVOPS': 'DEVOPS', 'AWS': 'AWS', 'DEVSEC': 'DEVSEC',
        'AZURE': 'AZURE', 'AUTOPY': 'AUTOPY', 'ENG': 'ENG', 'SOFT': 'SOFT',
        'RESUME': 'RESUME', 'HW': 'HW'
    },

    // Service codes (with S- prefix)
    serviceCodeMap: {
        'Web Development': 'S-WEB',
        'Web Development Service': 'S-WEB',
        'Website Development': 'S-WEB',
        'UI/UX Design Service': 'S-UX',
        'UI/UX Design Services': 'S-UX',
        'Graphic Design Service': 'S-GD',
        'Graphic Design Services': 'S-GD',
        'Branding & Marketing': 'S-BM',
        'Cloud & DevOps': 'S-CLOUD',
        'Cloud & DevOps Service': 'S-CLOUD',
        'Cloud & DevOps Solutions': 'S-CLOUD',
        'Career Services': 'S-CAREER',
        'Career & Placement Services': 'S-CAREER',
        // Direct code mappings
        'S-GD': 'S-GD', 'S-UX': 'S-UX', 'S-WEB': 'S-WEB',
        'S-CLOUD': 'S-CLOUD', 'S-BM': 'S-BM', 'S-CAREER': 'S-CAREER'
    },

    getCourseCode(name) {
        return this.courseCodeMap[name] || name;
    },

    getServiceCode(name) {
        return this.serviceCodeMap[name] || name;
    },

    isServiceCode(code) {
        return code && code.startsWith('S-');
    },

    // Format phone for storage: "+91 - 9492020292"
    // Can accept optional countryCode from the injected phone input
    formatPhone(phone, countryCode = null) {
        if (!phone) return null;
        const cleaned = phone.replace(/[\s\-()]/g, '');

        // If countryCode is provided (from injected input), use it
        if (countryCode) {
            const normalizedCode = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
            return `${normalizedCode} - ${cleaned}`;
        }

        // If already has country code format, normalize it
        if (cleaned.startsWith('+')) {
            const match = cleaned.match(/^(\+\d{1,4})(\d+)$/);
            if (match) return `${match[1]} - ${match[2]}`;
            return cleaned;
        }
        // For 10-digit Indian numbers, add +91 prefix
        if (/^[6-9]\d{9}$/.test(cleaned)) {
            return `+91 - ${cleaned}`;
        }
        // Return as-is for other formats
        return phone;
    },


    // Generate unique inquiry ID (INQ-ACS-001 style)
    async getNextInquiryId() {
        try {
            const { data, error } = await window.supabaseClient
                .from('inquiries')
                .select('inquiry_id')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            let nextNum = 1;
            if (data && data[0] && data[0].inquiry_id) {
                // Handle various ID formats we might have used
                const match = data[0].inquiry_id.match(/INQ-ACS-(\d+)/);
                if (match) {
                    nextNum = parseInt(match[1]) + 1;
                }
            }

            return `INQ-ACS-${String(nextNum).padStart(3, '0')}`;
        } catch (e) {
            console.error('Error getting next inquiry ID:', e);
            return `INQ-ACS-${Date.now()}`;
        }
    },

    // Insert inquiry and let database generate the ID
    async insertInquiry(payload) {
        try {
            // Remove inquiry_id from payload to let the database trigger handle it
            const submissionPayload = { ...payload };
            delete submissionPayload.inquiry_id;

            const { data, error } = await window.supabaseClient
                .from('inquiries')
                .insert(submissionPayload)
                .select('inquiry_id')
                .single();

            if (error) {
                console.error('Inquiry submission error:', error);
                throw error;
            }

            return {
                success: true,
                inquiryId: data ? data.inquiry_id : 'Submitted'
            };
        } catch (e) {
            console.error('Error inserting inquiry:', e);
            throw e;
        }
    },

    showSuccess(form, inquiryId, message = 'Thank you! Your inquiry has been submitted successfully.') {
        // Store original form HTML before replacing
        const originalFormHTML = form.dataset.originalHtml || form.innerHTML;
        if (!form.dataset.originalHtml) {
            form.dataset.originalHtml = originalFormHTML;
        }

        const successDiv = document.createElement('div');
        successDiv.className = 'form-success-message';
        successDiv.innerHTML = `
            <div style="background: linear-gradient(135deg, #2896cd, #6C5CE7); color: white; padding: 2.5rem 1.5rem; border-radius: 1.25rem; text-align: center; margin-top: 1rem; box-shadow: 0 10px 25px -5px rgba(108, 92, 231, 0.3); border: 1px solid rgba(255,255,255,0.1); position: relative; overflow: hidden;">
                <!-- Decorative Circle -->
                <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                
                <div style="background: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; color: #2896cd; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <i class="fas fa-check" style="font-size: 1.5rem;"></i>
                </div>
                
                <h3 style="margin: 0 0 0.5rem; font-family: 'Outfit', sans-serif; font-size: 1.25rem; font-weight: 700;">Submission Received</h3>
                <p style="margin: 0; font-weight: 400; font-size: 0.95rem; opacity: 0.9; line-height: 1.5;">${message}</p>
                
                <div style="margin: 1.5rem 0 1rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.1);">
                    <span style="display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.25rem; opacity: 0.8;">Reference ID</span>
                    <span style="font-family: 'Outfit', monospace; font-size: 1.4rem; letter-spacing: 2px; font-weight: 800; display: block;">${inquiryId}</span>
                </div>
                
                <p style="margin: 0; font-size: 0.8rem; opacity: 0.7;">We'll get back to you within 24 hours.</p>
            </div>
            <button type="button" class="submit-another-btn" style="margin-top: 1.25rem; background: white; border: 2px solid #e5e7eb; color: #4b5563; padding: 0.875rem 1.5rem; border-radius: 0.75rem; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.625rem; transition: all 0.3s ease; width: 100%;">
                <i class="fa-solid fa-rotate-left" style="font-size: 1rem; opacity: 0.7;"></i> Submit Another Response
            </button>
        `;
        form.innerHTML = '';
        form.appendChild(successDiv);

        // Add click handler for submit another button
        const submitAnotherBtn = successDiv.querySelector('.submit-another-btn');
        if (submitAnotherBtn) {
            submitAnotherBtn.addEventListener('mouseenter', () => {
                submitAnotherBtn.style.borderColor = '#2896cd';
                submitAnotherBtn.style.color = '#2896cd';
                submitAnotherBtn.style.background = 'rgba(40, 150, 205, 0.05)';
                submitAnotherBtn.style.transform = 'translateY(-1px)';
            });
            submitAnotherBtn.addEventListener('mouseleave', () => {
                submitAnotherBtn.style.borderColor = '#e5e7eb';
                submitAnotherBtn.style.color = '#4b5563';
                submitAnotherBtn.style.background = 'white';
                submitAnotherBtn.style.transform = 'translateY(0)';
            });
            submitAnotherBtn.addEventListener('click', () => {
                form.innerHTML = form.dataset.originalHtml;
                form.reset();
                // Re-initialize form handlers
                this.reinitializeForm(form);
            });
        }
    },

    reinitializeForm(form) {
        // This will be called to rebind event listeners after form reset
        // The specific init function will handle rebinding based on form type
    },

    showError(form, message = 'Something went wrong. Please try again.') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error-message';
        errorDiv.style.cssText = 'background: #fee2e2; color: #dc2626; padding: 1rem; border-radius: 0.5rem; margin-top: 1rem; text-align: center;';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        form.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    },

    async createCourseInquiry(formData, form = null) {
        try {
            const rawInterest = formData.courses || formData.interest || formData.course;
            const courseCode = this.getCourseCode(rawInterest);

            const payload = {
                name: formData.name,
                email: formData.email || null,
                phone: this.formatPhone(formData.phone),
                courses: [courseCode],
                notes: formData.message || formData.query || null,
                source: 'Website',
                status: 'New',
                demo_required: false
            };

            const result = await this.insertInquiry(payload);
            if (!result.success) throw new Error(result.error);

            console.log('Course inquiry created:', result.inquiryId);
            if (form) this.showSuccess(form, result.inquiryId);
            return result;
        } catch (e) {
            console.error('Error creating course inquiry:', e);
            if (form) this.showError(form, e.message);
            return { success: false, error: e.message };
        }
    },

    async createServiceInquiry(formData, form = null) {
        try {
            const rawService = formData.courses || formData.interest;
            let serviceCode = this.getServiceCode(rawService);

            if (!this.isServiceCode(serviceCode)) {
                serviceCode = 'S-' + serviceCode;
            }

            const payload = {
                name: formData.name,
                email: formData.email || null,
                phone: this.formatPhone(formData.phone),
                courses: [serviceCode],
                notes: formData.message || null,
                source: 'Website',
                status: 'New',
                demo_required: false
            };

            const result = await this.insertInquiry(payload);
            if (!result.success) throw new Error(result.error);

            console.log('Service inquiry created:', result.inquiryId);
            if (form) this.showSuccess(form, result.inquiryId);
            return result;
        } catch (e) {
            console.error('Error creating service inquiry:', e);
            if (form) this.showError(form, e.message);
            return { success: false, error: e.message };
        }
    },

    async createContactInquiry(formData, type = 'course', form = null) {
        try {
            let code = formData.courses;

            // Map full names to codes if necessary
            if (type === 'course') {
                code = this.getCourseCode(code);
            } else if (type === 'service') {
                code = this.getServiceCode(code);
                if (!this.isServiceCode(code)) {
                    code = 'S-' + code;
                }
            }

            const payload = {
                name: formData.name,
                email: formData.email || null,
                phone: this.formatPhone(formData.phone),
                courses: [code],
                notes: formData.message || null,
                source: 'Website',
                status: 'New',
                demo_required: false
            };

            const result = await this.insertInquiry(payload);
            if (!result.success) throw new Error(result.error);

            console.log('Contact inquiry created:', result.inquiryId);
            if (form) this.showSuccess(form, result.inquiryId);
            return result;
        } catch (e) {
            console.error('Error creating contact inquiry:', e);
            if (form) this.showError(form, e.message);
            return { success: false, error: e.message };
        }
    },

    extractFormData(form) {
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        return data;
    },

    // Store form type for reinitialization
    formTypes: {},

    initCourseForm(formId, courseName) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Store original HTML and type
        if (!form.dataset.originalHtml) {
            form.dataset.originalHtml = form.innerHTML;
        }
        this.formTypes[formId] = { type: 'course', courseName };

        form.removeAttribute('action');
        form.removeAttribute('method');

        this.bindCourseFormSubmit(form, courseName);
    },

    bindCourseFormSubmit(form, courseName) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = this.extractFormData(form);
            formData.interest = courseName;
            await this.createCourseInquiry(formData, form);
        });
    },

    initServiceForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Store original HTML and type
        if (!form.dataset.originalHtml) {
            form.dataset.originalHtml = form.innerHTML;
        }
        this.formTypes[formId] = { type: 'service' };

        form.removeAttribute('action');
        form.removeAttribute('method');

        this.bindServiceFormSubmit(form);
    },

    bindServiceFormSubmit(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = this.extractFormData(form);
            await this.createServiceInquiry(formData, form);
        });
    },

    initContactForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Store original HTML and type
        if (!form.dataset.originalHtml) {
            form.dataset.originalHtml = form.innerHTML;
        }
        this.formTypes[formId] = { type: 'contact' };

        form.removeAttribute('action');
        form.removeAttribute('method');

        this.bindContactFormSubmit(form);
    },

    bindContactFormSubmit(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = this.extractFormData(form);
            const selectEl = form.querySelector('select[name="courses"]');

            let type = 'course';
            if (selectEl) {
                const selected = selectEl.options[selectEl.selectedIndex];
                type = selected.dataset.type || 'course';
            }

            await this.createContactInquiry(formData, type, form);
        });
    },

    reinitializeForm(form) {
        const formId = form.id;
        const formConfig = this.formTypes[formId];

        if (!formConfig) return;

        // Rebind submit handler based on form type
        switch (formConfig.type) {
            case 'course':
                this.bindCourseFormSubmit(form, formConfig.courseName);
                break;
            case 'service':
                this.bindServiceFormSubmit(form);
                break;
            case 'contact':
                this.bindContactFormSubmit(form);
                break;
        }

        // Re-inject phone input after form reset
        setTimeout(() => PhoneInputInjector.init(), 100);
    }
};

window.InquirySync = InquirySync;

// ============================================
// Phone Input Auto-Injector
// Transforms all tel inputs into flag-based country code inputs
// ============================================

const PhoneInputInjector = {
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

    injectStyles() {
        if (document.getElementById('phone-injector-styles')) return;

        const style = document.createElement('style');
        style.id = 'phone-injector-styles';
        style.textContent = `
            .phone-input-injected {
                display: flex !important;
                align-items: stretch !important;
                gap: 0 !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 0.5rem !important;
                overflow: hidden !important;
                background: #fff !important;
                transition: border-color 0.2s, box-shadow 0.2s !important;
            }
            .phone-input-injected:focus-within {
                border-color: #2896cd !important;
                box-shadow: 0 0 0 3px rgba(40, 150, 205, 0.15) !important;
            }
            .phone-input-injected .country-code-input {
                width: 70px !important;
                min-width: 70px !important;
                padding: 0.75rem 0.5rem !important;
                border: none !important;
                border-right: 1px solid #e2e8f0 !important;
                background: #f8fafc !important;
                font-size: 0.9rem !important;
                text-align: center !important;
                outline: none !important;
                font-family: inherit !important;
            }
            .phone-input-injected .flag-display-btn {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 0.25rem !important;
                width: 70px !important;
                min-width: 70px !important;
                padding: 0.75rem 0.5rem !important;
                border: none !important;
                border-right: 1px solid #e2e8f0 !important;
                background: #f8fafc !important;
                cursor: pointer !important;
                font-size: 0.85rem !important;
                transition: background 0.2s !important;
            }
            .phone-input-injected .flag-display-btn:hover {
                background: #e2e8f0 !important;
            }
            .phone-input-injected .flag-display-btn .flag-emoji {
                font-size: 1.1rem !important;
            }
            .phone-input-injected .flag-display-btn .code-text {
                font-size: 0.75rem !important;
                color: #64748b !important;
                font-weight: 500 !important;
            }
            .phone-input-injected .phone-number-input {
                flex: 1 !important;
                padding: 0.75rem !important;
                border: none !important;
                background: transparent !important;
                font-size: 0.95rem !important;
                outline: none !important;
                font-family: inherit !important;
            }
            .phone-input-injected .phone-number-input::placeholder {
                color: #94a3b8 !important;
            }
        `;
        document.head.appendChild(style);
    },

    transformInput(originalInput) {
        if (originalInput.dataset.phoneInjected) return;

        const originalId = originalInput.id;
        const originalName = originalInput.name;
        const originalValue = originalInput.value;

        const wrapper = document.createElement('div');
        wrapper.className = 'phone-input-injected';

        const codeInput = document.createElement('input');
        codeInput.type = 'text';
        codeInput.className = 'country-code-input';
        codeInput.id = `${originalId}-country-code`;
        codeInput.placeholder = '+91';
        codeInput.maxLength = 5;
        codeInput.value = '+91';

        const flagBtn = document.createElement('button');
        flagBtn.type = 'button';
        flagBtn.className = 'flag-display-btn';
        flagBtn.style.display = 'none';
        flagBtn.innerHTML = `<span class="flag-emoji">🇮🇳</span><span class="code-text">+91</span>`;

        const phoneInput = document.createElement('input');
        phoneInput.type = 'tel';
        phoneInput.className = 'phone-number-input';
        phoneInput.id = originalId;
        phoneInput.name = originalName;
        phoneInput.placeholder = 'Phone number';
        phoneInput.value = originalValue;

        const hiddenCodeInput = document.createElement('input');
        hiddenCodeInput.type = 'hidden';
        hiddenCodeInput.id = `${originalId}-hidden-code`;
        hiddenCodeInput.name = `${originalName}_country_code`;
        hiddenCodeInput.value = '+91';

        wrapper.appendChild(codeInput);
        wrapper.appendChild(flagBtn);
        wrapper.appendChild(phoneInput);
        wrapper.appendChild(hiddenCodeInput);

        originalInput.parentNode.replaceChild(wrapper, originalInput);
        originalInput.dataset.phoneInjected = 'true';

        this.bindInputEvents(codeInput, flagBtn, hiddenCodeInput);
    },

    bindInputEvents(codeInput, flagBtn, hiddenCodeInput) {
        const self = this;

        codeInput.addEventListener('blur', () => {
            const code = codeInput.value.trim();
            if (!code) return;

            const countryInfo = self.getFlagForCode(code);
            const displayCode = code.startsWith('+') ? code : `+${code}`;

            flagBtn.querySelector('.flag-emoji').textContent = countryInfo.flag;
            flagBtn.querySelector('.code-text').textContent = displayCode;

            hiddenCodeInput.value = displayCode;
            codeInput.value = displayCode;

            codeInput.style.display = 'none';
            flagBtn.style.display = 'flex';
        });

        flagBtn.addEventListener('click', () => {
            flagBtn.style.display = 'none';
            codeInput.style.display = 'block';
            codeInput.focus();
            codeInput.select();
        });
    },

    init() {
        this.injectStyles();
        const telInputs = document.querySelectorAll('input[type="tel"]:not([data-phone-injected])');
        telInputs.forEach(input => this.transformInput(input));
        console.log(`PhoneInputInjector: Transformed ${telInputs.length} phone inputs`);
    }
};

window.PhoneInputInjector = PhoneInputInjector;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PhoneInputInjector.init());
} else {
    PhoneInputInjector.init();
}
