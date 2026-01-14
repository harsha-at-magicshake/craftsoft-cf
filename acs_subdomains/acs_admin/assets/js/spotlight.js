// ============================================
// Spotlight Search - Global Search Component
// ============================================

const Spotlight = {
    isOpen: false,
    results: [],
    focusedIndex: -1,
    searchTimeout: null,

    // Initialize
    init() {
        this.injectHTML();
        this.bindEvents();
    },

    // Inject the spotlight overlay HTML
    injectHTML() {
        if (document.getElementById('spotlight-overlay')) return;

        const html = `
            <div class="spotlight-overlay" id="spotlight-overlay">
                <div class="spotlight-container">
                    <div class="spotlight-input-wrapper">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input type="text" class="spotlight-input" id="spotlight-input" 
                               placeholder="Search students, clients, courses..." 
                               autocomplete="off" spellcheck="false">
                        <div class="spotlight-kbd">
                            <kbd>ESC</kbd> to close
                        </div>
                    </div>
                    <div class="spotlight-results" id="spotlight-results">
                        <div class="spotlight-empty">
                            <i class="fa-solid fa-sparkles"></i>
                            <p>Start typing to search across all modules</p>
                        </div>
                    </div>
                    <div class="spotlight-footer">
                        <span>Spotlight Search</span>
                        <div class="spotlight-footer-actions">
                            <div class="spotlight-footer-action">
                                <kbd>↑</kbd><kbd>↓</kbd> Navigate
                            </div>
                            <div class="spotlight-footer-action">
                                <kbd>↵</kbd> Open
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    },

    // Bind events
    bindEvents() {
        // Global keyboard shortcut (Ctrl+K or Cmd+K)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.open();
            }

            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Overlay click to close
        document.getElementById('spotlight-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'spotlight-overlay') {
                this.close();
            }
        });

        // Input handling
        const input = document.getElementById('spotlight-input');
        if (input) {
            input.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });

            input.addEventListener('keydown', (e) => {
                this.handleKeyNavigation(e);
            });
        }

        // Trigger button click
        document.addEventListener('click', (e) => {
            if (e.target.closest('.spotlight-trigger')) {
                this.open();
            }
        });
    },

    // Open spotlight
    open() {
        const overlay = document.getElementById('spotlight-overlay');
        const input = document.getElementById('spotlight-input');

        if (overlay) {
            overlay.classList.add('open');
            this.isOpen = true;
            document.body.style.overflow = 'hidden';

            setTimeout(() => {
                input?.focus();
            }, 100);
        }
    },

    // Close spotlight
    close() {
        const overlay = document.getElementById('spotlight-overlay');
        const input = document.getElementById('spotlight-input');

        if (overlay) {
            overlay.classList.remove('open');
            this.isOpen = false;
            document.body.style.overflow = '';

            // Reset state
            if (input) input.value = '';
            this.results = [];
            this.focusedIndex = -1;
            this.renderEmptyState();
        }
    },

    // Handle search
    async handleSearch(query) {
        clearTimeout(this.searchTimeout);

        if (!query || query.trim().length < 2) {
            this.renderEmptyState();
            return;
        }

        // Debounce search
        this.searchTimeout = setTimeout(async () => {
            this.renderLoading();

            try {
                const results = await this.searchAll(query.trim().toLowerCase());
                this.results = results;
                this.focusedIndex = -1;
                this.renderResults(results);
            } catch (error) {
                console.error('Spotlight search error:', error);
                this.renderError();
            }
        }, 250);
    },

    // Search across all modules
    async searchAll(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        // 1. Static Navigation / Quick Jumps
        const navigationResults = [
            { id: 'nav-dash', title: 'Dashboard', subtitle: 'Overview & Stats', icon: 'nav', link: '/dashboard/' },
            { id: 'nav-stu', title: 'Students List', subtitle: 'Manage academic records', icon: 'nav', link: '/students/' },
            { id: 'nav-cli', title: 'Clients List', subtitle: 'Service management', icon: 'nav', link: '/clients/' },
            { id: 'nav-pay', title: 'Record Payment', subtitle: 'Finance management', icon: 'nav', link: '/record-payment/' },
            { id: 'nav-rec', title: 'Payment Receipts', subtitle: 'Transaction history', icon: 'nav', link: '/receipts/' },
            { id: 'nav-all-pay', title: 'All Payments', subtitle: 'Financial overview', icon: 'nav', link: '/all-payments/' },
            { id: 'nav-set-sec', title: 'Security Settings', subtitle: 'Passwords & Sessions', icon: 'nav', link: '/settings/?tab=security' },
            { id: 'nav-set-ins', title: 'Institute Profile', subtitle: 'Company details', icon: 'nav', link: '/settings/?tab=institute' },
            { id: 'nav-set-bank', title: 'Bank Settings', subtitle: 'Payment accounts', icon: 'nav', link: '/settings/?tab=bank' }
        ].filter(item =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.subtitle.toLowerCase().includes(lowerQuery)
        );

        if (navigationResults.length) {
            results.push({
                type: 'nav',
                title: 'Quick Navigation',
                items: navigationResults
            });
        }

        // 2. Database Searches
        // Search Students
        const { data: students } = await window.supabaseClient
            .from('students')
            .select('id, student_id, first_name, last_name, phone')
            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,student_id.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(5);

        if (students?.length) {
            results.push({
                type: 'students',
                title: 'Students',
                items: students.map(s => ({
                    id: s.id,
                    title: `${s.first_name} ${s.last_name || ''}`,
                    subtitle: `${s.student_id} • ${s.phone || 'No phone'}`,
                    icon: 'student',
                    link: `/students/?id=${s.id}`
                }))
            });
        }

        // Search Clients
        const { data: clients } = await window.supabaseClient
            .from('clients')
            .select('id, client_id, first_name, last_name, phone')
            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,client_id.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(5);

        if (clients?.length) {
            results.push({
                type: 'clients',
                title: 'Clients',
                items: clients.map(c => ({
                    id: c.id,
                    title: `${c.first_name} ${c.last_name || ''}`,
                    subtitle: `${c.client_id} • ${c.phone || 'No phone'}`,
                    icon: 'client',
                    link: `/clients/?id=${c.id}`
                }))
            });
        }

        // Search Courses
        const { data: courses } = await window.supabaseClient
            .from('courses')
            .select('id, course_code, course_name')
            .or(`course_name.ilike.%${query}%,course_code.ilike.%${query}%`)
            .limit(5);

        if (courses?.length) {
            results.push({
                type: 'courses',
                title: 'Courses',
                items: courses.map(c => ({
                    id: c.id,
                    title: c.course_name,
                    subtitle: c.course_code,
                    icon: 'course',
                    link: `/courses/?id=${c.id}`
                }))
            });
        }

        // Search Services
        const { data: services } = await window.supabaseClient
            .from('services')
            .select('id, name, service_code')
            .ilike('name', `%${query}%`)
            .limit(5);

        if (services?.length) {
            results.push({
                type: 'services',
                title: 'Services',
                items: services.map(s => ({
                    id: s.id,
                    title: s.name,
                    subtitle: s.service_code || 'Service',
                    icon: 'service',
                    link: `/services/?id=${s.id}`
                }))
            });
        }

        // Search Tutors
        const { data: tutors } = await window.supabaseClient
            .from('tutors')
            .select('id, tutor_id, full_name, phone')
            .or(`full_name.ilike.%${query}%,tutor_id.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(5);

        if (tutors?.length) {
            results.push({
                type: 'tutors',
                title: 'Tutors',
                items: tutors.map(t => ({
                    id: t.id,
                    title: t.full_name,
                    subtitle: `${t.tutor_id} • ${t.phone || 'No phone'}`,
                    icon: 'tutor',
                    link: `/tutors/?id=${t.id}`
                }))
            });
        }

        return results;
    },

    // Get base path based on current location
    getBasePath() {
        const path = window.location.pathname;
        const hostname = window.location.hostname;

        // Check if we're on subdomain (admin.craftsoft.co.in or localhost with acs_admin)
        if (hostname.startsWith('admin.') || hostname === 'admin.local') {
            // Subdomain: root is /
            return '/';
        }

        // Check for acs_admin in path (subdomain folder structure)
        if (path.includes('/acs_admin/') || path.includes('/acs_subdomains/acs_admin/')) {
            // Find where acs_admin starts and build path from there
            const acsMatch = path.match(/.*?(\/(?:subdomains\/)?acs_admin\/)/);
            if (acsMatch) {
                return acsMatch[1];
            }
        }

        // Check for /admin/ path on main domain
        if (path.includes('/admin/')) {
            return '/admin/';
        }

        // Fallback: calculate relative path
        const parts = path.split('/').filter(Boolean);
        const adminIndex = parts.findIndex(p => p === 'acs_admin' || p === 'admin');
        if (adminIndex === -1) return '../';

        const depth = parts.length - adminIndex - 1;
        if (depth === 0) return './';
        if (depth === 1) return '../';
        return '../'.repeat(depth);
    },

    // Render results
    renderResults(sections) {
        const container = document.getElementById('spotlight-results');
        if (!container) return;

        if (!sections.length) {
            container.innerHTML = `
                <div class="spotlight-empty">
                    <i class="fa-solid fa-search"></i>
                    <p>No results found</p>
                </div>
            `;
            return;
        }

        let html = '';
        let itemIndex = 0;

        sections.forEach(section => {
            html += `<div class="spotlight-section">`;
            html += `<div class="spotlight-section-title">${section.title}</div>`;

            section.items.forEach(item => {
                html += `
                    <div class="spotlight-item" data-index="${itemIndex}" data-link="${item.link}">
                        <div class="spotlight-item-icon ${item.icon}">
                            <i class="fa-solid ${this.getIcon(item.icon)}"></i>
                        </div>
                        <div class="spotlight-item-content">
                            <div class="spotlight-item-title">${item.title}</div>
                            <div class="spotlight-item-subtitle">${item.subtitle}</div>
                        </div>
                    </div>
                `;
                itemIndex++;
            });

            html += `</div>`;
        });

        container.innerHTML = html;

        // Bind click events
        container.querySelectorAll('.spotlight-item').forEach(el => {
            el.addEventListener('click', () => {
                window.location.href = el.dataset.link;
            });
        });
    },

    // Get icon for type
    getIcon(type) {
        const icons = {
            nav: 'fa-compass',
            student: 'fa-user-graduate',
            client: 'fa-user-tie',
            course: 'fa-book',
            service: 'fa-wrench',
            tutor: 'fa-chalkboard-user',
            receipt: 'fa-file-invoice'
        };
        return icons[type] || 'fa-circle';
    },

    // Render empty state
    renderEmptyState() {
        const container = document.getElementById('spotlight-results');
        if (container) {
            container.innerHTML = `
                <div class="spotlight-empty">
                    <i class="fa-solid fa-sparkles"></i>
                    <p>Start typing to search across all modules</p>
                </div>
            `;
        }
    },

    // Render loading state
    renderLoading() {
        const container = document.getElementById('spotlight-results');
        if (container) {
            container.innerHTML = `
                <div class="spotlight-loading">
                    <i class="fa-solid fa-spinner"></i>
                </div>
            `;
        }
    },

    // Render error state
    renderError() {
        const container = document.getElementById('spotlight-results');
        if (container) {
            container.innerHTML = `
                <div class="spotlight-empty">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>Search failed. Please try again.</p>
                </div>
            `;
        }
    },

    // Handle keyboard navigation
    handleKeyNavigation(e) {
        const items = document.querySelectorAll('.spotlight-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.focusedIndex = Math.min(this.focusedIndex + 1, items.length - 1);
            this.updateFocus(items);
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
            this.updateFocus(items);
        }

        if (e.key === 'Enter' && this.focusedIndex >= 0) {
            e.preventDefault();
            const focused = items[this.focusedIndex];
            if (focused?.dataset.link) {
                window.location.href = focused.dataset.link;
            }
        }
    },

    // Update focus styling
    updateFocus(items) {
        items.forEach((item, index) => {
            item.classList.toggle('focused', index === this.focusedIndex);
        });

        // Scroll into view
        if (this.focusedIndex >= 0) {
            items[this.focusedIndex]?.scrollIntoView({ block: 'nearest' });
        }
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Spotlight.init();
});

// Export for global access
window.Spotlight = Spotlight;
