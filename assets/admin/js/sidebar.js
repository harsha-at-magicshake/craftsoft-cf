// Shared Sidebar Component for Admin Pages

const AdminSidebar = {
    currentPage: '',
    rootPath: '../',

    init(pageName, rootPath = '../') {
        this.currentPage = pageName;
        this.rootPath = rootPath;

        this.render();
        this.bindEvents();
        this.initSessionTimeout();

        // Start remote logout detection
        if (window.Auth && typeof window.Auth.startSessionValidityCheck === 'function') {
            window.Auth.startSessionValidityCheck();
        }
    },

    render() {
        // Check if current page is in various groups
        const isPaymentsChild = ['record-payment', 'all-payments', 'receipts'].includes(this.currentPage);
        const isCoursesServicesChild = ['courses', 'services'].includes(this.currentPage);
        const isStudentsClientsChild = ['students', 'clients'].includes(this.currentPage);

        // Desktop sidebar (always expanded)
        const sidebarHTML = `
            <aside class="admin-sidebar" id="admin-sidebar">
                <nav class="sidebar-nav">
                    ${this.navItem('dashboard', 'Dashboard', 'fa-chart-pie')}
                    ${this.navItem('inquiries', 'Inquiries', 'fa-solid fa-circle-question')}
                    ${this.navItem('tutors', 'Tutors', 'fa-chalkboard-user')}
                    
                    <!-- Courses & Services (flat on desktop) -->
                    ${this.navItem('courses', 'Courses', 'fa-book-bookmark', 'courses-services/courses')}
                    ${this.navItem('services', 'Services', 'fa-wrench', 'courses-services/services')}
                    
                    <!-- Students & Clients (flat on desktop) -->
                    ${this.navItem('students', 'Students', 'fa-user-graduate', 'students-clients/students')}
                    ${this.navItem('clients', 'Clients', 'fa-user-tie', 'students-clients/clients')}
                    
                    <!-- Payments Section (No parent label on desktop/tablet) -->
                    ${this.navItem('record-payment', 'Record Payment', 'fa-indian-rupee-sign', 'payments/record-payment')}
                    ${this.navItem('all-payments', 'All Payments', 'fa-money-bill-trend-up', 'payments/all-payments')}
                    ${this.navItem('receipts', 'Receipts', 'fa-file-invoice', 'payments/receipts')}
                    
                    ${this.navItem('settings', 'Settings', 'fa-gear')}
                </nav>
            <!-- Sidebar Footer -->
            <div class="sidebar-footer">
                <div class="copyright-text">
                    CraftSoft &copy; ${new Date().getFullYear()} <span class="version-badge">v2.0</span>
                </div>
            </div>
            </aside>
        `;

        // Mobile nav bottom sheet (collapsible groups)
        const activeGroup = isCoursesServicesChild ? 'courses_services' :
            isStudentsClientsChild ? 'students_clients' :
                isPaymentsChild ? 'payments' : null;

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
                    ${this.mobileNavItem('tutors', 'Tutors', 'fa-chalkboard-user')}

                    <!-- Courses & Services Parent (Mobile Only) -->
                    <div class="mobile-nav-parent ${activeGroup === 'courses_services' ? 'expanded' : ''}" id="mobile-courses-services-parent">
                        <button class="mobile-nav-parent-btn" id="mobile-courses-services-toggle">
                            <i class="fa-solid fa-layer-group"></i>
                            <span>Courses & Services</span>
                            <i class="fa-solid fa-chevron-right mobile-nav-arrow"></i>
                        </button>
                        <div class="mobile-nav-children">
                            <div style="min-height: 0;">
                                ${this.mobileNavItemChild('courses', 'Courses', 'fa-book-bookmark', 'courses-services/courses')}
                                ${this.mobileNavItemChild('services', 'Services', 'fa-wrench', 'courses-services/services')}
                            </div>
                        </div>
                    </div>

                    <!-- Students & Clients Parent (Mobile Only) -->
                    <div class="mobile-nav-parent ${activeGroup === 'students_clients' ? 'expanded' : ''}" id="mobile-students-clients-parent">
                        <button class="mobile-nav-parent-btn" id="mobile-students-clients-toggle">
                            <i class="fa-solid fa-users"></i>
                            <span>Students & Clients</span>
                            <i class="fa-solid fa-chevron-right mobile-nav-arrow"></i>
                        </button>
                        <div class="mobile-nav-children">
                            <div style="min-height: 0;">
                                ${this.mobileNavItemChild('students', 'Students', 'fa-user-graduate', 'students-clients/students')}
                                ${this.mobileNavItemChild('clients', 'Clients', 'fa-user-tie', 'students-clients/clients')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Payments Parent (collapsible on mobile) -->
                    <div class="mobile-nav-parent ${activeGroup === 'payments' ? 'expanded' : ''}" id="mobile-payments-parent">
                        <button class="mobile-nav-parent-btn" id="mobile-payments-toggle">
                            <i class="fa-solid fa-money-bill-wave"></i>
                            <span>Payments</span>
                            <i class="fa-solid fa-chevron-right mobile-nav-arrow"></i>
                        </button>
                        <div class="mobile-nav-children">
                            <div style="min-height: 0;">
                                ${this.mobileNavItemChild('record-payment', 'Record Payment', 'fa-indian-rupee-sign', 'payments/record-payment')}
                                ${this.mobileNavItemChild('all-payments', 'All Payments', 'fa-money-bill-trend-up', 'payments/all-payments')}
                                ${this.mobileNavItemChild('receipts', 'Receipts', 'fa-file-invoice', 'payments/receipts')}
                            </div>
                        </div>
                    </div>
                    
                    ${this.mobileNavItem('settings', 'Settings', 'fa-gear')}
                </nav>
                
                <!-- Mobile Nav Footer -->
                <div class="mobile-nav-footer">
                     <div class="copyright-text">
                        CraftSoft &copy; ${new Date().getFullYear()} <span class="version-badge">v2.0</span>
                    </div>
                </div>
            </div>
        `;

        const layout = document.querySelector('.admin-layout');
        if (layout && !document.getElementById('admin-sidebar')) {
            layout.insertAdjacentHTML('afterbegin', sidebarHTML);
            document.body.insertAdjacentHTML('beforeend', mobileNavHTML);
        }
    },

    // Child nav item for desktop (indented)
    navItemChild(page, label, icon, path) {
        const href = `${this.rootPath}${path}/`;
        return `
            <a href="${href}"
               class="sidebar-item sidebar-child ${this.currentPage === page ? 'active' : ''}"
               title="${label}">
                <i class="fa-solid ${icon}"></i>
                <span>${label}</span>
            </a>
        `;
    },

    // Child nav item for mobile (indented)
    mobileNavItemChild(page, label, icon, path) {
        const href = `${this.rootPath}${path}/`;
        return `
            <a href="${href}" class="mobile-nav-item mobile-nav-child ${this.currentPage === page ? 'active' : ''}">
                <i class="fa-solid ${icon}"></i>
                <span>${label}</span>
            </a>
        `;
    },

    navItem(page, label, icon, path = null) {
        const href = path ? `${this.rootPath}${path}/` : `${this.rootPath}${page}/`;
        const iconClass = icon.includes(' ') ? icon : `fa-solid ${icon}`;
        return `
            <a href="${href}"
               class="sidebar-item ${this.currentPage === page ? 'active' : ''}"
               title="${label}">
                <i class="${iconClass}"></i>
                <span>${label}</span>
            </a>
        `;
    },

    mobileNavItem(page, label, icon, path = null) {
        const href = path ? `${this.rootPath}${path}/` : `${this.rootPath}${page}/`;
        const iconClass = icon.includes(' ') ? icon : `fa-solid ${icon}`;
        return `
            <a href="${href}" class="mobile-nav-item ${this.currentPage === page ? 'active' : ''}">
                <i class="${iconClass}"></i>
                <span>${label}</span>
            </a>
        `;
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
        AccountManager.renderAccountPanel?.('account-panel-container');
    }
};

// Header helper
const AdminHeader = {
    render(title, showAddBtn = false, addBtnText = 'Add', addBtnId = 'add-btn') {
        return `
            <header class="admin-header">
                <div class="admin-header-left">
                    <button class="mobile-menu-btn" aria-label="Menu">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <span class="header-logo">CraftSoft</span>
                </div>
                <div class="header-actions">
                    ${showAddBtn ? `
                        <button class="btn btn-primary" id="${addBtnId}">
                            <i class="fa-solid fa-plus"></i>
                            <span>${addBtnText}</span>
                        </button>
                    ` : ''}
                    <div id="account-panel-container"></div>
                </div>
            </header>
        `;
    }
};

window.AdminSidebar = AdminSidebar;
window.AdminHeader = AdminHeader;
