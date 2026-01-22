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

        // Ensure account panel and mobile menu are bound after a short delay
        setTimeout(() => {
            this.bindMobileMenu();
            // Fallback: If someone called renderAccountPanel before header was ready
            if (this.pendingStudentData) {
                this.renderAccountPanel(this.pendingStudentData);
            }
        }, 150);
    },

    determineRootPath() {
        const path = window.location.pathname;
        if (path.includes('/dashboard/')) return '../';
        if (path.includes('/payments/')) return '../';
        if (path.includes('/courses/')) return '../';
        if (path.includes('/materials/')) return '../';
        if (path.includes('/profile/')) return '../';
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
                        ${this.navItem('courses', 'Courses', 'fa-book-open', 'courses')}
                        ${this.navItem('materials', 'Materials', 'fa-book-skull', 'materials')}
                        ${this.navItem('profile', 'Profile', 'fa-id-badge', 'profile')}
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
                    <div class="mobile-nav-handle"></div>
                    <span class="mobile-nav-title">Navigation</span>
                </div>
                <nav class="mobile-nav-list">
                    ${this.mobileNavItem('dashboard', 'Dashboard', 'fa-chart-pie', 'dashboard')}
                    ${this.mobileNavItem('payments', 'Payments', 'fa-indian-rupee-sign', 'payments')}
                    ${this.mobileNavItem('courses', 'Courses', 'fa-book-open', 'courses')}
                    ${this.mobileNavItem('materials', 'Materials', 'fa-book-skull', 'materials')}
                    ${this.mobileNavItem('profile', 'Profile', 'fa-id-badge', 'profile')}
                </nav>
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
    },

    // Separate method for mobile menu - called after header is rendered
    bindMobileMenu() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const overlay = document.getElementById('mobile-nav-overlay');
        const sheet = document.getElementById('mobile-nav-sheet');

        if (menuBtn && overlay && sheet) {
            menuBtn.addEventListener('click', () => {
                overlay.classList.add('open');
                sheet.classList.add('open');
                document.body.style.overflow = 'hidden';
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
        if (!studentData) return;
        this.pendingStudentData = studentData;

        const container = document.getElementById('header-account-container');
        if (!container) return;

        const initials = studentData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        container.innerHTML = `
            <div class="account-header-wrapper">
                <button class="account-trigger" id="account-trigger">
                    <div class="account-avatar">${initials}</div>
                    <div class="account-info">
                        <span class="account-name-label">${studentData.name}</span>
                        <span class="account-id-label">${studentData.student_id}</span>
                    </div>
                    <i class="fa-solid fa-chevron-down account-arrow"></i>
                </button>
                
                <div class="account-dropdown" id="account-dropdown">
                    <div class="account-dropdown-footer">
                        <button class="account-logout-btn" id="header-logout-btn">
                            <i class="fa-solid fa-right-from-bracket"></i>
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </div>
            <div id="account-backdrop" class="account-backdrop"></div>
        `;

        // Bind events
        const trigger = document.getElementById('account-trigger');
        const dropdown = document.getElementById('account-dropdown');
        const backdrop = document.getElementById('account-backdrop');
        const logoutBtn = document.getElementById('header-logout-btn');

        if (trigger && dropdown) {
            trigger.addEventListener('click', () => {
                const isOpen = dropdown.classList.toggle('open');
                trigger.classList.toggle('active');
                if (backdrop) backdrop.classList.toggle('open', isOpen);
            });

            backdrop?.addEventListener('click', () => {
                dropdown.classList.remove('open');
                trigger.classList.remove('active');
                backdrop.classList.remove('open');
            });
        }

        logoutBtn?.addEventListener('click', () => {
            if (window.handleLogout) window.handleLogout();
        });
    }
};

const StudentHeader = {
    render(title) {
        return `
            <div class="header-left">
                <button id="mobile-menu-btn" class="mobile-menu-btn">
                    <i class="fa-solid fa-bars-staggered"></i>
                </button>
                <div class="page-title">
                    <h1>${title}</h1>
                </div>
            </div>
            
            <div class="header-right">
                <div class="header-student-badge desktop-only">
                    <i class="fa-solid fa-user-graduate"></i>
                    <span>Student Portal</span>
                </div>
                <div id="header-account-container" class="header-account-container"></div>
            </div>
        `;
    }
};

window.StudentSidebar = StudentSidebar;
window.StudentHeader = StudentHeader;
