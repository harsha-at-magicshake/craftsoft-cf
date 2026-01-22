/**
 * Student Sidebar & Header Component (v5.0)
 * Standardization for CraftSoft v5.0
 */

const StudentSidebar = {
    currentPage: '',
    rootPath: '',

    init(page = 'dashboard') {
        this.currentPage = page;
        this.rootPath = this.determineRootPath();
        this.render();
        this.injectFooter();
        this.injectLogoStyles();
    },

    determineRootPath() {
        const path = window.location.pathname;
        if (path.includes('/dashboard/')) return '../';
        if (path.includes('/payments/')) return '../';
        if (path.includes('/courses/')) return '../';
        return './';
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
        // Desktop Sidebar
        const sidebarHTML = `
            <aside class="sidebar" id="student-sidebar">
                <nav class="sidebar-nav">
                    <div class="sidebar-header">
                        <a href="${this.rootPath}dashboard/" class="logo-component">
                            <div class="logo-text-wrapper">
                                <span class="logo-sig">Abhi's</span>
                                <span class="logo-accent">Craftsoft</span>
                            </div>
                        </a>
                    </div>

                    <div class="sidebar-scroll-area">
                        ${this.navItem('dashboard', 'Dashboard', 'fa-chart-pie', 'dashboard')}
                        ${this.navItem('payments', 'Payments', 'fa-indian-rupee-sign', 'payments')}
                        ${this.navItem('courses', 'My Courses', 'fa-book-bookmark', 'courses')}
                    </div>

                    <div class="sidebar-spacer"></div>
                    <div class="sidebar-account-container" id="sidebar-account-container"></div>
                </nav>
            </aside>
        `;

        // Mobile Nav (Slide-up)
        const mobileNavHTML = `
            <div id="mobile-nav-overlay" class="mobile-nav-overlay"></div>
            <div id="mobile-nav-sheet" class="mobile-nav-sheet">
                <div class="mobile-nav-header">
                    <span class="mobile-nav-title">Navigation</span>
                    <button id="mobile-nav-close" class="mobile-nav-close" title="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <nav class="mobile-nav-list">
                    ${this.mobileNavItem('dashboard', 'Dashboard', 'fa-chart-pie', 'dashboard')}
                    ${this.mobileNavItem('payments', 'Payments', 'fa-indian-rupee-sign', 'payments')}
                    ${this.mobileNavItem('courses', 'My Courses', 'fa-book-bookmark', 'courses')}
                </nav>
                <div class="mobile-nav-footer">
                    <button id="btn-logout-mobile" class="logout-link">
                        <i class="fa-solid fa-right-from-bracket"></i>
                        <span>Logout Account</span>
                    </button>
                </div>
            </div>
        `;

        // Inject into body
        const container = document.querySelector('.app-container');
        if (container) {
            // Remove existing sidebar if any
            const existingSidebar = document.querySelector('.sidebar');
            if (existingSidebar) existingSidebar.remove();

            // Inject new sidebar at start of container
            container.insertAdjacentHTML('afterbegin', sidebarHTML);
        }

        // Inject mobile nav into body end
        if (!document.getElementById('mobile-nav-sheet')) {
            document.body.insertAdjacentHTML('beforeend', mobileNavHTML);
        }

        this.bindEvents();
    },

    navItem(page, label, icon, path) {
        const isActive = this.currentPage === page;
        const href = `${this.rootPath}${path}/`;
        return `
            <a href="${href}" class="nav-item ${isActive ? 'active' : ''}">
                <i class="fa-solid ${icon}"></i>
                <span>${label}</span>
            </a>
        `;
    },

    mobileNavItem(page, label, icon, path) {
        const isActive = this.currentPage === page;
        const href = `${this.rootPath}${path}/`;
        return `
            <a href="${href}" class="mobile-nav-item ${isActive ? 'active' : ''}">
                <i class="fa-solid ${icon}"></i>
                <span>${label}</span>
            </a>
        `;
    },

    bindEvents() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const overlay = document.getElementById('mobile-nav-overlay');
        const sheet = document.getElementById('mobile-nav-sheet');
        const closeBtn = document.getElementById('mobile-nav-close');

        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                overlay.classList.add('open');
                sheet.classList.add('open');
                document.body.style.overflow = 'hidden';
            });
        }

        const close = () => {
            overlay.classList.remove('open');
            sheet.classList.remove('open');
            document.body.style.overflow = '';
        };

        if (overlay) overlay.addEventListener('click', close);
        if (closeBtn) closeBtn.addEventListener('click', close);

        // Logout bindings
        const logoutMobile = document.getElementById('btn-logout-mobile');
        if (logoutMobile) {
            logoutMobile.addEventListener('click', () => {
                close();
                if (window.handleLogout) window.handleLogout();
            });
        }
    },

    injectFooter() {
        if (document.querySelector('.student-footer-strip')) return;
        const main = document.querySelector('.main-content');
        if (!main) return;

        const footerHTML = `
            <footer class="student-footer-strip">
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
        main.insertAdjacentHTML('beforeend', footerHTML);
    },

    renderAccountPanel(studentData) {
        const container = document.getElementById('sidebar-account-container');
        if (!container || !studentData) return;

        const initials = studentData.name.split(' ').map(n => n[0]).join('').toUpperCase();

        container.innerHTML = `
            <div class="account-card-mini">
                <div class="account-avatar">${initials}</div>
                <div class="account-details">
                    <span class="account-name">${studentData.name}</span>
                    <span class="account-id">ID: ${studentData.student_id}</span>
                </div>
                <button class="account-logout-trigger" id="sidebar-logout-btn" title="Logout">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            </div>
        `;

        document.getElementById('sidebar-logout-btn')?.addEventListener('click', () => {
            if (window.handleLogout) window.handleLogout();
        });
    }
};

const StudentHeader = {
    render(title) {
        return `
            <div style="display: flex; align-items: center; gap: 15px;">
                <button id="mobile-menu-btn" class="mobile-menu-btn">
                    <i class="fa-solid fa-bars-staggered"></i>
                </button>
                <div class="page-title">
                    <h1>${title}</h1>
                </div>
            </div>
            
            <div class="header-actions">
                <div class="header-student-badge">
                    <i class="fa-solid fa-user-graduate"></i>
                    <span>Student Portal</span>
                </div>
            </div>
        `;
    }
};

window.StudentSidebar = StudentSidebar;
window.StudentHeader = StudentHeader;
