// Shared Sidebar Component for Admin Pages

const AdminSidebar = {
    currentPage: '',
    rootPath: '../',

    init(pageName, rootPath = '../') {
        this.currentPage = pageName;
        this.rootPath = rootPath;

        // Render sidebar and mobile nav
        this.render();
        this.bindEvents();
        this.initSessionTimeout();

        // Inject main footer strip
        AdminFooter.inject();

        // Start remote logout detection
        if (window.Auth && typeof window.Auth.startSessionValidityCheck === 'function') {
            window.Auth.startSessionValidityCheck();
        }

        // Inject logo styles
        this.injectLogoStyles();
    },

    injectLogoStyles() {
        if (!document.getElementById('logo-signature-css')) {
            const link = document.createElement('link');
            link.id = 'logo-signature-css';
            link.rel = 'stylesheet';
            link.href = '/assets/components/logo-signature/logo-signature.css';
            document.head.appendChild(link);
        }
    },

    render() {
        // Check if current page is in various groups
        const isFinancialsChild = ['record-payment', 'all-payments', 'receipts'].includes(this.currentPage);
        const isOperationsChild = ['students', 'clients', 'courses', 'services'].includes(this.currentPage);
        const isRecordsChild = ['archived', 'recently-deleted'].includes(this.currentPage);

        // Desktop sidebar (always expanded)
        const sidebarHTML = `
            <aside class="admin-sidebar" id="admin-sidebar">
                <nav class="sidebar-nav">
                    <div class="sidebar-header">
                        <a href="${this.rootPath}dashboard/" class="logo-component">
                            <div class="logo-text-wrapper desktop-logo">
                                <span class="logo-sig-cursive">Abhi's</span>
                                <span class="logo-accent-sans">Craftsoft</span>
                            </div>
                        </a>
                    </div>
                    <div class="sidebar-scroll-area">
                        ${this.sectionLabel('General')}
                        ${this.navItem('dashboard', 'Dashboard', 'fa-chart-pie')}
                        ${this.navItem('inquiries', 'Inquiries', 'fa-solid fa-circle-question')}
                        
                        ${this.sectionLabel('Academics')}
                        ${this.navItem('upload-materials', 'Upload Materials', 'fa-solid fa-upload', 'academics/upload-materials')}
                        ${this.navItem('assignments', 'Assignments', 'fa-solid fa-book-open', 'academics/assignments')}
                        
                        ${this.sectionLabel('Talent')}
                        ${this.navItem('tutors', 'Tutors', 'fa-chalkboard-user', 'tutors')}

                        ${this.sectionLabel('Operations')}
                        ${this.navItem('students', 'Students', 'fa-user-graduate', 'students-clients/students')}
                        ${this.navItem('clients', 'Clients', 'fa-user-tie', 'students-clients/clients')}
                        ${this.navItem('courses', 'Courses', 'fa-book-bookmark', 'courses-services/courses')}
                        ${this.navItem('services', 'Services', 'fa-wrench', 'courses-services/services')}

                        ${this.sectionLabel('Records')}
                        ${this.navItem('archived', 'Archived Records', 'fa-solid fa-box', 'records/archived')}
                        ${this.navItem('recently-deleted', 'Recently Deleted', 'fa-solid fa-trash-can', 'records/recently-deleted')}

                        ${this.sectionLabel('Financials')}
                        ${this.navItem('all-payments', 'All Payments', 'fa-money-bill-trend-up', 'payments/all-payments')}
                        ${this.navItem('record-payment', 'Record Payment', 'fa-indian-rupee-sign', 'payments/record-payment')}
                        ${this.navItem('receipts', 'Receipts', 'fa-file-invoice', 'payments/receipts')}

                        ${this.sectionLabel('System')}
                        ${this.navItem('v-history', 'v-History', 'fa-solid fa-clock-rotate-left', 'v-history')}
                        ${this.navItem('settings', 'Settings', 'fa-gear', 'settings')}
                    </div>
                </nav>
            </aside>
        `;

        // Mobile nav bottom sheet (collapsible groups)
        const activeGroup = isOperationsChild ? 'operations' :
            isFinancialsChild ? 'financials' :
                isRecordsChild ? 'records' : null;

        const mobileNavHTML = `
            <div class="mobile-nav-overlay" id="mobile-nav-overlay"></div>
            <div class="mobile-nav-sheet" id="mobile-nav-sheet">
                <div class="mobile-nav-header">
                    <span class="mobile-nav-title">Navigation</span>
                    <button class="mobile-nav-close" id="mobile-nav-close">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <nav class="mobile-nav-list">
                    ${this.mobileNavItem('dashboard', 'Dashboard', 'fa-chart-pie')}
                    ${this.mobileNavItem('inquiries', 'Inquiries', 'fa-solid fa-circle-question')}
                    ${this.mobileNavItem('tutors', 'Tutors', 'fa-chalkboard-user', 'tutors')}
                    
                    <!-- Academics (Mobile) -->
                    <div class="mobile-nav-children-standalone">
                         ${this.mobileNavItem('upload-materials', 'Upload Materials', 'fa-solid fa-upload', 'academics/upload-materials')}
                         ${this.mobileNavItem('assignments', 'Assignments', 'fa-solid fa-book-open', 'academics/assignments')}
                    </div>

                    <!-- Operations Parent -->
                    <div class="mobile-nav-parent ${activeGroup === 'operations' ? 'expanded' : ''}" id="mobile-operations-parent">
                        <button class="mobile-nav-parent-btn" id="mobile-operations-toggle">
                            <i class="fa-solid fa-layer-group"></i>
                            <span>Operations</span>
                            <i class="fa-solid fa-chevron-right mobile-nav-arrow"></i>
                        </button>
                        <div class="mobile-nav-children">
                            <div style="min-height: 0;">
                                ${this.mobileNavItemChild('students', 'Students', 'fa-user-graduate', 'students-clients/students')}
                                ${this.mobileNavItemChild('clients', 'Clients', 'fa-user-tie', 'students-clients/clients')}
                                ${this.mobileNavItemChild('courses', 'Courses', 'fa-book-bookmark', 'courses-services/courses')}
                                ${this.mobileNavItemChild('services', 'Services', 'fa-wrench', 'courses-services/services')}
                            </div>
                        </div>
                    </div>

                    <!-- Records Parent -->
                    <div class="mobile-nav-parent ${activeGroup === 'records' ? 'expanded' : ''}" id="mobile-records-parent">
                        <button class="mobile-nav-parent-btn" id="mobile-records-toggle">
                            <i class="fa-solid fa-file-shield"></i>
                            <span>Records</span>
                            <i class="fa-solid fa-chevron-right mobile-nav-arrow"></i>
                        </button>
                        <div class="mobile-nav-children">
                            <div style="min-height: 0;">
                                ${this.mobileNavItemChild('archived', 'Archived Records', 'fa-solid fa-box', 'records/archived')}
                                ${this.mobileNavItemChild('recently-deleted', 'Recently Deleted', 'fa-solid fa-trash-can', 'records/recently-deleted')}
                            </div>
                        </div>
                    </div>

                    <!-- Financials Parent -->
                    <div class="mobile-nav-parent ${activeGroup === 'financials' ? 'expanded' : ''}" id="mobile-financials-parent">
                        <button class="mobile-nav-parent-btn" id="mobile-financials-toggle">
                            <i class="fa-solid fa-money-bill-wave"></i>
                            <span>Financials</span>
                            <i class="fa-solid fa-chevron-right mobile-nav-arrow"></i>
                        </button>
                        <div class="mobile-nav-children">
                            <div style="min-height: 0;">
                                ${this.mobileNavItemChild('all-payments', 'All Payments', 'fa-money-bill-trend-up', 'payments/all-payments')}
                                ${this.mobileNavItemChild('record-payment', 'Record Payment', 'fa-indian-rupee-sign', 'payments/record-payment')}
                                ${this.mobileNavItemChild('receipts', 'Receipts', 'fa-file-invoice', 'payments/receipts')}
                            </div>
                        </div>
                    </div>
                    
                    ${this.mobileNavItem('v-history', 'v-History', 'fa-solid fa-clock-rotate-left', 'v-history')}
                    ${this.mobileNavItem('settings', 'Settings', 'fa-gear', 'settings')}
                </nav>
                
                </div>
            </div>
        `;

        const layout = document.querySelector('.admin-layout');
        if (layout && !document.getElementById('admin-sidebar')) {
            layout.insertAdjacentHTML('afterbegin', sidebarHTML);
            document.body.insertAdjacentHTML('beforeend', mobileNavHTML);
        }
    },

    // Section label for desktop
    sectionLabel(text) {
        return `<div class="sidebar-section-label desktop-only" style="margin-top: 5px; padding-top: 15px;">${text}</div>`;
    },

    // Child nav item for desktop (indented)
    navItemChild(page, label, icon, path) {
        const href = `${this.rootPath}${path}/`;
        return `<a href="${href}" class="sidebar-item sidebar-child ${this.currentPage === page ? 'active' : ''}" title="${label}"><i class="fa-solid ${icon}"></i><span>${label}</span></a>`;
    },

    // Child nav item for mobile (indented)
    mobileNavItemChild(page, label, icon, path) {
        const href = `${this.rootPath}${path}/`;
        return `<a href="${href}" class="mobile-nav-item mobile-nav-child ${this.currentPage === page ? 'active' : ''}"><i class="fa-solid ${icon}"></i><span>${label}</span></a>`;
    },

    navItem(page, label, icon, path = null) {
        const href = path ? `${this.rootPath}${path}/` : `${this.rootPath}${page}/`;
        const iconClass = icon.includes(' ') ? icon : `fa-solid ${icon}`;
        return `<a href="${href}" class="sidebar-item ${this.currentPage === page ? 'active' : ''}" title="${label}"><i class="${iconClass}"></i><span>${label}</span></a>`;
    },

    mobileNavItem(page, label, icon, path = null) {
        const href = path ? `${this.rootPath}${path}/` : `${this.rootPath}${page}/`;
        const iconClass = icon.includes(' ') ? icon : `fa-solid ${icon}`;
        return `<a href="${href}" class="mobile-nav-item ${this.currentPage === page ? 'active' : ''}"><i class="${iconClass}"></i><span>${label}</span></a>`;
    },

    openMobileNav() {
        document.getElementById('mobile-nav-sheet')?.classList.add('open');
        document.getElementById('mobile-nav-overlay')?.classList.add('open');
    },

    closeMobileNav() {
        document.getElementById('mobile-nav-sheet')?.classList.remove('open');
        document.getElementById('mobile-nav-overlay')?.classList.remove('open');
    },

    closeAccountDropdowns() {
        document.querySelectorAll('.account-dropdown.open, .logout-dropdown.open').forEach(el => {
            el.classList.remove('open');
        });
    },

    bindEvents() {
        // Mobile hamburger menu button (in header)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.mobile-menu-btn')) {
                e.stopPropagation();
                this.closeAccountDropdowns();
                this.openMobileNav();
            }
        });

        // Close mobile nav on overlay click
        document.getElementById('mobile-nav-overlay')?.addEventListener('click', () => {
            this.closeMobileNav();
        });

        // Close mobile nav on X click
        document.getElementById('mobile-nav-close')?.addEventListener('click', () => {
            this.closeMobileNav();
        });

        // Mobile Courses & Services expand/collapse
        document.getElementById('mobile-courses-services-toggle')?.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = document.getElementById('mobile-courses-services-parent');
            parent?.classList.toggle('expanded');
        });

        // Mobile Students & Clients expand/collapse
        document.getElementById('mobile-students-clients-toggle')?.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = document.getElementById('mobile-students-clients-parent');
            parent?.classList.toggle('expanded');
        });

        // Mobile Payments expand/collapse toggle
        document.getElementById('mobile-payments-toggle')?.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = document.getElementById('mobile-payments-parent');
            parent?.classList.toggle('expanded');
        });

        // Mobile Records expand/collapse toggle
        document.getElementById('mobile-records-toggle')?.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = document.getElementById('mobile-records-parent');
            parent?.classList.toggle('expanded');
        });
    },

    initSessionTimeout() {
        const utils = window.AdminUtils;
        if (!utils || !utils.SessionTimeout) return;

        if (typeof utils.SessionTimeout.init === 'function') {
            utils.SessionTimeout.init();
        }
    },

    async renderAccountPanel(session, admin) {
        const { AccountManager } = window.AdminUtils || {};
        if (!AccountManager || !session || !admin) return;

        if (typeof AccountManager.addAccount !== 'function') return;

        AccountManager.addAccount({
            id: session.user.id,
            admin_id: admin.admin_id,
            email: admin.email,
            full_name: admin.full_name,
            initials: AccountManager.getInitials?.(admin.full_name) || ''
        }, true);

        AccountManager.storeSession?.(session.user.id, session);

        // Render to header if exists
        AccountManager.renderAccountPanel?.('account-panel-container');
    }
};

// Header helper
const AdminHeader = {
    render(title, showAddBtn = false, addBtnText = 'Add', addBtnId = 'add-btn') {
        return `
            <header class="admin-header">
                <div class="admin-header-left">
                    <button class="mobile-menu-btn" id="mobile-menu-btn" title="Open Menu">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    
                    <a href="/" class="header-logo">
                        <img src="/assets/admin/CS.png" alt="CS Logo" style="height: 32px; width: auto; display: block;">
                    </a>

                    <div class="header-titles">
                        <h1 class="page-title" style="font-family: 'Outfit', sans-serif; margin-left: 15px; padding-left: 15px; border-left: 1px solid var(--header-border);">
                            ${title}
                        </h1>
                    </div>
                </div>
                <div class="header-actions">
                    ${showAddBtn ? `<button class="btn btn-primary" id="${addBtnId}"><i class="fa-solid fa-plus"></i><span>${addBtnText}</span></button>` : ''}
                    <button class="spotlight-trigger" id="global-search-btn" aria-label="Search" title="Search (Ctrl + K)">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </button>
                    <div class="header-right-actions" id="account-panel-container"></div>
                </div>
            </header>
        `;
    }
};

// Footer helper
const AdminFooter = {
    render() {
        return `
            <footer class="admin-footer-strip">
                <div class="footer-container">
                    <div class="footer-left">
                        Abhi's CraftSoft &copy; ${new Date().getFullYear()}
                    </div>
                    <div class="footer-right">
                        <span class="version-badge">v5.0</span>
                    </div>
                </div>
            </footer>
        `;
    },

    inject() {
        // Find main content area
        const main = document.querySelector('.admin-main');
        if (main && !document.querySelector('.admin-footer-strip')) {
            main.insertAdjacentHTML('beforeend', this.render());
        }
    }
};

window.AdminSidebar = AdminSidebar;
window.AdminHeader = AdminHeader;
window.AdminFooter = AdminFooter;
