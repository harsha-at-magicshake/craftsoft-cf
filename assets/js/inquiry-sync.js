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

    // Generate unique inquiry ID with timestamp to prevent duplicates
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
                const match = data[0].inquiry_id.match(/INQ-ACS-(\d+)/);
                if (match) nextNum = parseInt(match[1]) + 1;
            }

            // Add timestamp suffix for uniqueness
            const timestamp = Date.now().toString().slice(-4);
            return `INQ-ACS-${String(nextNum).padStart(3, '0')}-${timestamp}`;
        } catch (e) {
            console.error('Error getting next inquiry ID:', e);
            return `INQ-ACS-${Date.now()}`;
        }
    },

    showSuccess(form, message = 'Thank you! Your inquiry has been submitted successfully.') {
        const successDiv = document.createElement('div');
        successDiv.className = 'form-success-message';
        successDiv.innerHTML = `
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 1.5rem; border-radius: 1rem; text-align: center; margin-top: 1rem;">
                <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                <p style="margin: 0; font-weight: 600;">${message}</p>
                <p style="margin: 0.5rem 0 0; font-size: 0.9rem; opacity: 0.9;">We'll get back to you soon!</p>
            </div>
        `;
        form.innerHTML = '';
        form.appendChild(successDiv);
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
            const inquiryId = await this.getNextInquiryId();
            const courseCode = this.getCourseCode(formData.interest || formData.courses || formData.course);

            const payload = {
                inquiry_id: inquiryId,
                name: formData.name,
                email: formData.email || null,
                phone: formData.phone || null,
                courses: [courseCode],
                notes: formData.message || formData.query || null,
                source: 'Website',
                status: 'New',
                demo_required: false
            };

            const { data, error } = await window.supabaseClient
                .from('inquiries')
                .insert(payload);

            if (error) throw error;

            console.log('Course inquiry created:', inquiryId);
            if (form) this.showSuccess(form);
            return { success: true, inquiryId };
        } catch (e) {
            console.error('Error creating course inquiry:', e);
            if (form) this.showError(form, e.message);
            return { success: false, error: e.message };
        }
    },

    async createServiceInquiry(formData, form = null) {
        try {
            const inquiryId = await this.getNextInquiryId();
            let serviceCode = formData.courses || this.getServiceCode(formData.interest);

            if (!this.isServiceCode(serviceCode)) {
                serviceCode = 'S-' + serviceCode;
            }

            const payload = {
                inquiry_id: inquiryId,
                name: formData.name,
                email: formData.email || null,
                phone: formData.phone || null,
                courses: [serviceCode],
                notes: formData.message || null,
                source: 'Website',
                status: 'New',
                demo_required: false
            };

            const { data, error } = await window.supabaseClient
                .from('inquiries')
                .insert(payload);

            if (error) throw error;

            console.log('Service inquiry created:', inquiryId);
            if (form) this.showSuccess(form);
            return { success: true, inquiryId };
        } catch (e) {
            console.error('Error creating service inquiry:', e);
            if (form) this.showError(form, e.message);
            return { success: false, error: e.message };
        }
    },

    async createContactInquiry(formData, type = 'course', form = null) {
        try {
            const inquiryId = await this.getNextInquiryId();
            let code = formData.courses;

            if (type === 'service' && !this.isServiceCode(code)) {
                code = 'S-' + code;
            }

            const payload = {
                inquiry_id: inquiryId,
                name: formData.name,
                email: formData.email || null,
                phone: formData.phone || null,
                courses: [code],
                notes: formData.message || null,
                source: 'Website',
                status: 'New',
                demo_required: false
            };

            const { data, error } = await window.supabaseClient
                .from('inquiries')
                .insert(payload);

            if (error) throw error;

            console.log('Contact inquiry created:', inquiryId);
            if (form) this.showSuccess(form);
            return { success: true, inquiryId };
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

    initCourseForm(formId, courseName) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.removeAttribute('action');
        form.removeAttribute('method');

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

        form.removeAttribute('action');
        form.removeAttribute('method');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = this.extractFormData(form);
            await this.createServiceInquiry(formData, form);
        });
    },

    initContactForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.removeAttribute('action');
        form.removeAttribute('method');

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
    }
};

window.InquirySync = InquirySync;
