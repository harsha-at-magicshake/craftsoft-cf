// Shared Sidebar Component for Admin Pages

const AdminSidebar = {
    currentPage: '',
    rootPath: '../',

    init(pageName, rootPath = '../') {
        this.currentPage = pageName;
        this.rootPath = rootPath;
        this.render();
        this.bindEvents();
        this.initAccountManager();
        this.initSessionTimeout();
    },

    render() {
        const sidebarHTML = `
            <aside class="admin-sidebar" id="admin-sidebar">
                <div class="sidebar-header">
                    <img src="${this.rootPath}../assets/images/logo-main.webp" alt="CraftSoft" class="sidebar-logo">
                </div>
                <nav class="sidebar-nav">
                    <a href="${this.rootPath}dashboard/" class="sidebar-item ${this.currentPage === 'dashboard' ? 'active' : ''}" data-section="dashboard">
                        <i class="fa-solid fa-chart-pie"></i>
                        <span>Dashboard</span>
                    </a>
                    <a href="${this.rootPath}students/" class="sidebar-item ${this.currentPage === 'students' ? 'active' : ''}" data-section="students">
                        <i class="fa-solid fa-user-graduate"></i>
                        <span>Students</span>
                    </a>
                    <a href="${this.rootPath}tutors/" class="sidebar-item ${this.currentPage === 'tutors' ? 'active' : ''}" data-section="tutors">
                        <i class="fa-solid fa-chalkboard-user"></i>
                        <span>Tutors</span>
                    </a>
                    <a href="${this.rootPath}inquiries/" class="sidebar-item ${this.currentPage === 'inquiries' ? 'active' : ''}" data-section="inquiries">
                        <i class="fa-solid fa-envelope-open-text"></i>
                        <span>Inquiries</span>
                    </a>
                    <a href="${this.rootPath}courses/" class="sidebar-item ${this.currentPage === 'courses' ? 'active' : ''}" data-section="courses">
                        <i class="fa-solid fa-book-bookmark"></i>
                        <span>Courses</span>
                    </a>

                    <!-- Payments with Submenu -->
                    <div class="sidebar-group ${this.currentPage === 'payments' || this.currentPage === 'receipts' ? 'expanded' : ''}">
                        <a href="${this.rootPath}payments/" class="sidebar-item has-submenu ${this.currentPage === 'payments' ? 'active' : ''}" data-section="payments">
                            <i class="fa-solid fa-money-bill-transfer"></i>
                            <span>Payments</span>
                            <i class="fa-solid fa-chevron-down submenu-arrow"></i>
                        </a>
                        <div class="sidebar-submenu">
                            <a href="${this.rootPath}payments/receipts/" class="sidebar-subitem ${this.currentPage === 'receipts' ? 'active' : ''}" data-section="receipts">
                                <i class="fa-solid fa-file-invoice"></i>
                                <span>Receipts</span>
                            </a>
                        </div>
                    </div>

                    <a href="${this.rootPath}settings/" class="sidebar-item ${this.currentPage === 'settings' ? 'active' : ''}" data-section="settings">
                        <i class="fa-solid fa-gear"></i>
                        <span>Settings</span>
                    </a>
                </nav>
            </aside>
            <div class="sidebar-overlay" id="sidebar-overlay"></div>
        `;

        // Insert at beginning of admin-layout
        const layout = document.querySelector('.admin-layout');
        if (layout) {
            layout.insertAdjacentHTML('afterbegin', sidebarHTML);
        }
    },

    bindEvents() {
        // Mobile menu toggle
        const menuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('admin-sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                sidebar?.classList.toggle('open');
                overlay?.classList.toggle('active');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar?.classList.remove('open');
                overlay?.classList.remove('active');
            });
        }

        // Payments submenu toggle
        const paymentsItem = document.querySelector('.sidebar-item.has-submenu');
        if (paymentsItem) {
            paymentsItem.addEventListener('click', (e) => {
                // If clicking the link, allow nav if not on page?
                // For simplified behavior, if clicking parent and it has submenu, we just expand.
                // But the parent is a link: href=".../payments/".
                // If we want it to be navigable, we shouldn't preventDefault unless strictly toggle-only.
                // Let's assume user wants to go to Payments Overview when clicking "Payments".
                // So we do NOT preventDefault on the link click itself.
                // The submenu toggle is handled by arrow or if we are already on the page?

                // If we are merely toggling, we prevention default.
                // But here I'll let it navigate. The submenu state is persisted by `expanded` class based on currentPage.

                // However, the Arrow should toggle.
            });

            const arrow = paymentsItem.querySelector('.submenu-arrow');
            if (arrow) {
                arrow.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    paymentsItem.closest('.sidebar-group')?.classList.toggle('expanded');
                });
            }
        }
    },

    async initAccountManager() {
        const { AccountManager } = window.AdminUtils || {};
        if (AccountManager) {
            await AccountManager.init();
        }
    },

    initSessionTimeout() {
        const { SessionTimeout } = window.AdminUtils || {};
        if (SessionTimeout) {
            SessionTimeout.init();
        }
    }
};

// Header component helper
const AdminHeader = {
    render(title, showAddBtn = false, addBtnText = 'Add', addBtnId = 'add-btn') {
        return `
            <header class="admin-header">
                <div class="admin-header-left">
                    <button class="mobile-menu-btn" id="mobile-menu-btn">
                        <i class="fa-solid fa-bars"></i>
                    </button>
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
