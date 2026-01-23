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
        const isAcademicsChild = ['upload-materials', 'assignments', 'submissions'].includes(this.currentPage);

        // Desktop sidebar (always expanded)
        const sidebarHTML = `
            <aside class="admin-sidebar" id="admin-sidebar">
                <nav class="sidebar-nav">
                    <div class="sidebar-header">
                        <a href="/dashboard/" class="logo-component">
                            <div class="logo-text-wrapper desktop-logo">
                                <span class="logo-sig-cursive">Abhi's</span>
                                <span class="logo-accent-sans">Craftsoft</span>
                            </div>
                        </a>
                    </div>
                    <div class="sidebar-scroll-area">
                        ${this.sectionLabel('General')}
                        ${this.navItemAbsolute('dashboard', 'Dashboard', 'fa-chart-pie', '/dashboard/')}
                        ${this.navItemAbsolute('inquiries', 'Inquiries', 'fa-solid fa-circle-question', '/inquiries/')}
                        
                        ${this.sectionLabel('Academics')}
                        ${this.navItemAbsolute('upload-materials', 'Upload Materials', 'fa-solid fa-upload', '/upload-materials/')}
                        ${this.navItemAbsolute('assignments', 'Assignments', 'fa-solid fa-file-pen', '/assignments/')}
                        ${this.navItemAbsolute('submissions', 'Submissions', 'fa-solid fa-book-atlas', '/submissions/')}
                        
                        ${this.sectionLabel('Talent')}
                        ${this.navItemAbsolute('tutors', 'Tutors', 'fa-chalkboard-user', '/tutors/')}

                        ${this.sectionLabel('Operations')}
                        ${this.navItemAbsolute('students', 'Students', 'fa-user-graduate', '/students/')}
                        ${this.navItemAbsolute('clients', 'Clients', 'fa-user-tie', '/clients/')}
                        ${this.navItemAbsolute('courses', 'Courses', 'fa-book-bookmark', '/courses/')}
                        ${this.navItemAbsolute('services', 'Services', 'fa-wrench', '/services/')}

                        ${this.sectionLabel('Records')}
                        ${this.navItemAbsolute('archived', 'Archived Records', 'fa-solid fa-box', '/archived-records/')}
                        ${this.navItemAbsolute('recently-deleted', 'Recently Deleted', 'fa-solid fa-trash-can', '/recently-deleted/')}

                        ${this.sectionLabel('Finance')}
                        ${this.navItemAbsolute('all-payments', 'All Payments', 'fa-money-bill-trend-up', '/all-payments/')}
                        ${this.navItemAbsolute('record-payment', 'Record Payment', 'fa-indian-rupee-sign', '/record-payment/')}
                        ${this.navItemAbsolute('receipts', 'Payment Receipts', 'fa-file-invoice', '/payment-receipts/')}

                        ${this.sectionLabel('System')}
                        ${this.navItemAbsolute('version-history', 'v-History', 'fa-solid fa-clock-rotate-left', '/version-history/')}
                        ${this.navItemAbsolute('settings', 'Settings', 'fa-gear', '/settings/')}
                    </div>
                </nav>
            </aside>
        `;

        // Mobile nav bottom sheet (collapsible groups)
        const activeGroup = isOperationsChild ? 'operations' :
            isRecordsChild ? 'records' :
                isFinancialsChild ? 'financials' :
                    isAcademicsChild ? 'academics' : null;

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
                    ${this.mobileNavItemAbsolute('dashboard', 'Dashboard', 'fa-chart-pie', '/dashboard/')}
                    ${this.mobileNavItemAbsolute('inquiries', 'Inquiries', 'fa-solid fa-circle-question', '/inquiries/')}
                    
                    <!-- Academics Parent -->
                    <div class="mobile-nav-parent ${activeGroup === 'academics' ? 'expanded' : ''}" id="mobile-academics-parent">
                        <button class="mobile-nav-parent-btn" id="mobile-academics-toggle">
                            <i class="fa-solid fa-book-open"></i>
                            <span>Academics</span>
                            <i class="fa-solid fa-chevron-right mobile-nav-arrow"></i>
                        </button>
                        <div class="mobile-nav-children">
                            <div style="min-height: 0;">
                                 ${this.mobileNavItemAbsolute('upload-materials', 'Upload Materials', 'fa-solid fa-upload', '/upload-materials/')}
                                 ${this.mobileNavItemAbsolute('assignments', 'Assignments', 'fa-solid fa-file-pen', '/assignments/')}
                                 ${this.mobileNavItemAbsolute('submissions', 'Submissions', 'fa-solid fa-book-atlas', '/submissions/')}
                            </div>
                        </div>
                    </div>

                    ${this.mobileNavItemAbsolute('tutors', 'Tutors', 'fa-chalkboard-user', '/tutors/')}

                    <!-- Operations Parent -->
                    <div class="mobile-nav-parent ${activeGroup === 'operations' ? 'expanded' : ''}" id="mobile-operations-parent">
                        <button class="mobile-nav-parent-btn" id="mobile-operations-toggle">
                            <i class="fa-solid fa-layer-group"></i>
                            <span>Operations</span>
                            <i class="fa-solid fa-chevron-right mobile-nav-arrow"></i>
                        </button>
                        <div class="mobile-nav-children">
                            <div style="min-height: 0;">
                                ${this.mobileNavItemAbsolute('students', 'Students', 'fa-user-graduate', '/students/')}
                                ${this.mobileNavItemAbsolute('clients', 'Clients', 'fa-user-tie', '/clients/')}
                                ${this.mobileNavItemAbsolute('courses', 'Courses', 'fa-book-bookmark', '/courses/')}
                                ${this.mobileNavItemAbsolute('services', 'Services', 'fa-wrench', '/services/')}
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
                                ${this.mobileNavItemAbsolute('archived', 'Archived Records', 'fa-solid fa-box', '/archived-records/')}
                                ${this.mobileNavItemAbsolute('recently-deleted', 'Recently Deleted', 'fa-solid fa-trash-can', '/recently-deleted/')}
                            </div>
                        </div>
                    </div>

                    <!-- Financials Parent -->
                    <div class="mobile-nav-parent ${activeGroup === 'financials' ? 'expanded' : ''}" id="mobile-financials-parent">
                        <button class="mobile-nav-parent-btn" id="mobile-financials-toggle">
                            <i class="fa-solid fa-money-bill-wave"></i>
                            <span>Finance</span>
                            <i class="fa-solid fa-chevron-right mobile-nav-arrow"></i>
                        </button>
                        <div class="mobile-nav-children">
                            <div style="min-height: 0;">
                                ${this.mobileNavItemAbsolute('all-payments', 'All Payments', 'fa-money-bill-trend-up', '/all-payments/')}
                                ${this.mobileNavItemAbsolute('record-payment', 'Record Payment', 'fa-indian-rupee-sign', '/record-payment/')}
                                ${this.mobileNavItemAbsolute('receipts', 'Payment Receipts', 'fa-file-invoice', '/payment-receipts/')}
                            </div>
                        </div>
                    </div>
                    
                    ${this.mobileNavItemAbsolute('version-history', 'v-History', 'fa-solid fa-clock-rotate-left', '/version-history/')}
                    ${this.mobileNavItemAbsolute('settings', 'Settings', 'fa-gear', '/settings/')}
                </nav>
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
        return `<div class="sidebar-section-label desktop-only" style="margin-top: 5px; padding-top: 15px; pointer-events: none; opacity: 0.7; font-size: 0.7rem; letter-spacing: 0.05em;">${text}</div>`;
    },

    navItemAbsolute(page, label, icon, absolutePath) {
        const iconClass = icon.includes(' ') ? icon : `fa-solid ${icon}`;
        const isActive = this.currentPage === page;
        return `<a href="${absolutePath}" class="sidebar-item ${isActive ? 'active' : ''}" title="${label}"><i class="${iconClass}"></i><span>${label}</span></a>`;
    },

    mobileNavItemAbsolute(page, label, icon, absolutePath) {
        const iconClass = icon.includes(' ') ? icon : `fa-solid ${icon}`;
        const isActive = this.currentPage === page;
        return `<a href="${absolutePath}" class="mobile-nav-item ${isActive ? 'active' : ''}"><i class="${iconClass}"></i><span>${label}</span></a>`;
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

        // Mobile Academics expand/collapse
        document.getElementById('mobile-academics-toggle')?.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = document.getElementById('mobile-academics-parent');
            parent?.classList.toggle('expanded');
        });

        // Mobile Operations expand/collapse
        document.getElementById('mobile-operations-toggle')?.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = document.getElementById('mobile-operations-parent');
            parent?.classList.toggle('expanded');
        });

        // Mobile Records expand/collapse toggle
        document.getElementById('mobile-records-toggle')?.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = document.getElementById('mobile-records-parent');
            parent?.classList.toggle('expanded');
        });

        // Mobile Financials expand/collapse toggle
        document.getElementById('mobile-financials-toggle')?.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = document.getElementById('mobile-financials-parent');
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
                        <span class="version-badge">v7.0</span>
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
