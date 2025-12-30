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
        // Desktop sidebar
        const sidebarHTML = `
            <aside class="admin-sidebar" id="admin-sidebar">
                <nav class="sidebar-nav">
                    ${this.navItem('dashboard', 'Dashboard', 'fa-chart-pie')}
                    ${this.navItem('students', 'Students', 'fa-user-graduate')}
                    ${this.navItem('tutors', 'Tutors', 'fa-chalkboard-user')}
                    ${this.navItem('inquiries', 'Inquiries', 'fa-phone-volume')}
                    ${this.navItem('courses', 'Courses', 'fa-book-bookmark')}
                    ${this.navItem('receipts', 'Receipts', 'fa-file-invoice', 'payments/receipts')}
                    ${this.navItem('settings', 'Settings', 'fa-gear')}
                </nav>
            </aside>
        `;

        // Mobile nav bottom sheet
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
                    ${this.mobileNavItem('students', 'Students', 'fa-user-graduate')}
                    ${this.mobileNavItem('tutors', 'Tutors', 'fa-chalkboard-user')}
                    ${this.mobileNavItem('inquiries', 'Inquiries', 'fa-phone-volume')}
                    ${this.mobileNavItem('courses', 'Courses', 'fa-book-bookmark')}
                    ${this.mobileNavItem('receipts', 'Receipts', 'fa-file-invoice', 'payments/receipts')}
                    ${this.mobileNavItem('settings', 'Settings', 'fa-gear')}
                </nav>
            </div>
        `;

        const layout = document.querySelector('.admin-layout');
        if (layout && !document.getElementById('admin-sidebar')) {
            layout.insertAdjacentHTML('afterbegin', sidebarHTML);
            document.body.insertAdjacentHTML('beforeend', mobileNavHTML);
        }
    },

    navItem(page, label, icon, path = null) {
        const href = path ? `${this.rootPath}${path}/` : `${this.rootPath}${page}/`;
        return `
            <a href="${href}"
               class="sidebar-item ${this.currentPage === page ? 'active' : ''}"
               title="${label}">
                <i class="fa-solid ${icon}"></i>
                <span>${label}</span>
            </a>
        `;
    },

    mobileNavItem(page, label, icon, path = null) {
        const href = path ? `${this.rootPath}${path}/` : `${this.rootPath}${page}/`;
        return `
            <a href="${href}" class="mobile-nav-item ${this.currentPage === page ? 'active' : ''}">
                <i class="fa-solid ${icon}"></i>
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

        // Payments submenu toggle (desktop)
        const paymentsItem = document.querySelector('.sidebar-item.has-submenu');
        paymentsItem?.addEventListener('click', (e) => {
            e.preventDefault();
            paymentsItem.closest('.sidebar-group')?.classList.toggle('expanded');
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
                    <span class="header-divider"></span>
                    <h1 class="page-title">${title}</h1>
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
