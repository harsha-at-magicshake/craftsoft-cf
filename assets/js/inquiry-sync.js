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
        'Web Development': 'S-WDEV',
        'Web Development Service': 'S-WDEV',
        'Website Development': 'S-WDEV',
        'UI/UX Design Service': 'S-UX',
        'UI/UX Design Services': 'S-UX',
        'Graphic Design Service': 'S-GD',
        'Graphic Design Services': 'S-GD',
        'Branding & Marketing': 'S-BRND',
        'Cloud & DevOps': 'S-CLOUD',
        'Cloud & DevOps Service': 'S-CLOUD',
        'Cloud & DevOps Solutions': 'S-CLOUD',
        'Career Services': 'S-CAREER',
        'Career & Placement Services': 'S-CAREER',
        // Direct code mappings
        'S-GD': 'S-GD', 'S-UX': 'S-UX', 'S-WDEV': 'S-WDEV',
        'S-CLOUD': 'S-CLOUD', 'S-BRND': 'S-BRND', 'S-CAREER': 'S-CAREER'
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

    // Insert inquiry using RPC to bypass RLS (SECURITY DEFINER)
    async insertInquiry(payload) {
        try {
            const { data, error } = await window.supabaseClient.rpc('insert_inquiry', {
                p_name: payload.name,
                p_phone: payload.phone,
                p_email: payload.email || null,
                p_courses: payload.courses || [],
                p_notes: payload.notes || null,
                p_source: payload.source || 'Website',
                p_status: payload.status || 'New',
                p_demo_required: payload.demo_required || false,
                p_demo_date: payload.demo_date || null,
                p_demo_time: payload.demo_time || null
            });

            if (error) {
                console.error('Inquiry submission (RPC) error:', error);
                throw error;
            }

            return {
                success: true,
                inquiryId: data || 'Submitted'
            };
        } catch (e) {
            console.error('Error in insertInquiry RPC:', e);
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
                phone: this.formatPhone(formData.phone, formData.phone_country_code || formData['contact-phone_country_code']),
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
                phone: this.formatPhone(formData.phone, formData.phone_country_code || formData['contact-phone_country_code']),
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
                phone: this.formatPhone(formData.phone, formData.phone_country_code || formData['contact-phone_country_code']),
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
        if (form.dataset.bound) return; // Prevent double binding
        form.dataset.bound = 'true';

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            }

            try {
                const formData = this.extractFormData(form);
                formData.interest = courseName;
                await this.createCourseInquiry(formData, form);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = 'Book Free Session';
                }
            }
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
        if (form.dataset.bound) return; // Prevent double binding
        form.dataset.bound = 'true';

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            }

            try {
                const formData = this.extractFormData(form);
                await this.createServiceInquiry(formData, form);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = 'Book Free Session';
                }
            }
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
        if (form.dataset.bound) return; // Prevent double binding
        form.dataset.bound = 'true';

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            }

            try {
                const formData = this.extractFormData(form);
                const selectEl = form.querySelector('select[name="courses"]') || form.querySelector('select[name="interest"]');
                let type = 'course';
                if (selectEl) {
                    const selected = selectEl.options[selectEl.selectedIndex];
                    type = selected.dataset.type || 'course';
                }

                await this.createContactInquiry(formData, type, form);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = 'Book Free Session';
                }
            }
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

        // Re-inject phone input after form reset (with a delay to ensure HTML is restored)
        setTimeout(() => {
            if (window.PhoneInputInjector) window.PhoneInputInjector.init();
        }, 50);
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
                width: 100% !important;
                margin-top: 0.25rem !important;
            }
            .phone-input-injected:focus-within {
                border-color: #2896cd !important;
                box-shadow: 0 0 0 3px rgba(40, 150, 205, 0.15) !important;
            }
            .phone-input-injected .country-code-input {
                width: 75px !important;
                min-width: 75px !important;
                padding: 0.75rem 0.5rem !important;
                border: none !important;
                border-right: 1px solid #e2e8f0 !important;
                background: #f8fafc !important;
                font-size: 0.95rem !important;
                text-align: center !important;
                outline: none !important;
                font-family: inherit !important;
                display: block !important;
            }
            .phone-input-injected .flag-display-btn {
                display: none !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 0.35rem !important;
                width: 85px !important;
                min-width: 85px !important;
                padding: 0.75rem 0.5rem !important;
                border: none !important;
                border-right: 1px solid #e2e8f0 !important;
                background: #f8fafc !important;
                cursor: pointer !important;
                font-size: 0.9rem !important;
                transition: background 0.2s !important;
                height: 100% !important;
            }
            .phone-input-injected .flag-display-btn:hover {
                background: #e2e8f0 !important;
            }
            .phone-input-injected .flag-emoji {
                font-size: 1.2rem !important;
                line-height: 1 !important;
            }
            .phone-input-injected .code-text {
                font-size: 0.85rem !important;
                color: #475569 !important;
                font-weight: 600 !important;
            }
            .phone-input-injected .phone-number-input {
                flex: 1 !important;
                padding: 0.75rem 1rem !important;
                border: none !important;
                background: transparent !important;
                font-size: 1rem !important;
                outline: none !important;
                font-family: inherit !important;
                width: 100% !important;
            }
            .phone-input-injected .phone-number-input::placeholder {
                color: #94a3b8 !important;
            }
            /* Show/Hide Logic */
            .phone-input-injected.flag-active .country-code-input { display: none !important; }
            .phone-input-injected.flag-active .flag-display-btn { display: flex !important; }
        `;
        document.head.appendChild(style);
    },

    transformInput(originalInput) {
        // CRITICAL: Skip if already transformed OR if it's a child of an injected wrapper
        if (originalInput.dataset.phoneInjected || originalInput.closest('.phone-input-injected')) return;

        const originalId = originalInput.id;
        const originalName = originalInput.name;
        const originalPlaceholder = originalInput.placeholder || 'Phone number';
        const originalValue = originalInput.value;
        const isRequired = originalInput.required;

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
        flagBtn.innerHTML = `<span class="flag-emoji">🇮🇳</span><span class="code-text">+91</span>`;

        const phoneInput = document.createElement('input');
        phoneInput.type = 'tel';
        phoneInput.className = 'phone-number-input';
        phoneInput.id = originalId;
        phoneInput.name = originalName;
        phoneInput.placeholder = originalPlaceholder;
        phoneInput.value = originalValue;
        phoneInput.required = isRequired;
        // IMPORTANT: Mark the new input as injected so we don't transform it again
        phoneInput.dataset.phoneInjected = 'true';

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

        this.bindInputEvents(wrapper, codeInput, flagBtn, hiddenCodeInput);
    },

    bindInputEvents(wrapper, codeInput, flagBtn, hiddenCodeInput) {
        const self = this;

        const updateFlag = () => {
            const code = codeInput.value.trim();
            if (!code) return;

            const countryInfo = self.getFlagForCode(code);
            const displayCode = code.startsWith('+') ? code : `+${code}`;

            flagBtn.querySelector('.flag-emoji').textContent = countryInfo.flag;
            flagBtn.querySelector('.code-text').textContent = displayCode;

            hiddenCodeInput.value = displayCode;
            codeInput.value = displayCode;

            wrapper.classList.add('flag-active');
        };

        codeInput.addEventListener('blur', updateFlag);

        // Also update if they press Enter
        codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                updateFlag();
                wrapper.querySelector('.phone-number-input').focus();
            }
        });

        flagBtn.addEventListener('click', (e) => {
            e.preventDefault();
            wrapper.classList.remove('flag-active');
            setTimeout(() => {
                codeInput.focus();
                codeInput.select();
            }, 10);
        });
    },

    init() {
        this.injectStyles();
        // Find all tel inputs that haven't been processed yet
        const telInputs = document.querySelectorAll('input[type="tel"]:not([data-phone-injected])');
        telInputs.forEach(input => {
            // Check again that it's not a dummy input or already inside a wrapper
            if (!input.classList.contains('phone-number-input')) {
                this.transformInput(input);
            }
        });
    }
};

window.PhoneInputInjector = PhoneInputInjector;

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PhoneInputInjector.init());
} else {
    PhoneInputInjector.init();
}
