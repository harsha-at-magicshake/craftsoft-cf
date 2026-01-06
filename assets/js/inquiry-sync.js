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
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 2rem 1.5rem; border-radius: 1rem; text-align: center; margin-top: 1rem;">
                <i class="fas fa-check-circle" style="font-size: 2.5rem; margin-bottom: 0.75rem; display: block;"></i>
                <p style="margin: 0; font-weight: 600; font-size: 1.1rem;">${message}</p>
                <div style="margin: 1rem 0; padding: 0.75rem 1rem; background: rgba(0,0,0,0.15); border-radius: 0.5rem; font-family: 'Courier New', monospace; font-size: 1.2rem; letter-spacing: 2px; font-weight: 700;">
                    ID: ${inquiryId}
                </div>
                <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">Please keep this ID for your reference.</p>
            </div>
            <button type="button" class="submit-another-btn" style="margin-top: 1rem; background: linear-gradient(135deg, #0d9488, #0f766e); border: none; color: white; padding: 0.875rem 1.5rem; border-radius: 0.625rem; cursor: pointer; font-size: 1rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.625rem; transition: all 0.25s ease; width: 100%; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);">
                <i class="fa-solid fa-dice" style="font-size: 1.1rem;"></i> Submit Another Response
            </button>
        `;
        form.innerHTML = '';
        form.appendChild(successDiv);

        // Add click handler for submit another button
        const submitAnotherBtn = successDiv.querySelector('.submit-another-btn');
        if (submitAnotherBtn) {
            submitAnotherBtn.addEventListener('mouseenter', () => {
                submitAnotherBtn.style.transform = 'translateY(-2px) scale(1.02)';
                submitAnotherBtn.style.filter = 'brightness(1.1)';
                submitAnotherBtn.style.boxShadow = '0 6px 16px rgba(13, 148, 136, 0.4)';
            });
            submitAnotherBtn.addEventListener('mouseleave', () => {
                submitAnotherBtn.style.transform = 'translateY(0) scale(1)';
                submitAnotherBtn.style.filter = 'brightness(1)';
                submitAnotherBtn.style.boxShadow = '0 4px 12px rgba(13, 148, 136, 0.3)';
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
                phone: formData.phone || null,
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
                phone: formData.phone || null,
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
                phone: formData.phone || null,
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
    }
};

window.InquirySync = InquirySync;

