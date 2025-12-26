/* ============================================
   Dashboard Core Logic
   - Auth check (on page load only)
   - Session protection (back/forward)
   - Sidebar navigation
   - Logout (redirect only, preserves session)
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
    // ============================================
    // SESSION PROTECTION (back/forward)
    // ============================================

    if (window.history && window.history.pushState) {
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', () => {
            window.history.pushState(null, '', window.location.href);
        });
    }

    // ============================================
    // AUTH CHECK
    // ============================================

    async function checkAuth() {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();

            if (!session || !session.user) {
                window.location.replace('signin.html');
                return null;
            }

            if (!session.user.email_confirmed_at) {
                window.location.replace('signin.html');
                return null;
            }

            return session;
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.replace('signin.html');
            return null;
        }
    }

    const session = await checkAuth();
    if (!session) return;

    // ============================================
    // LOAD ADMIN DATA
    // ============================================

    async function loadAdminData() {
        try {
            const { data: admin, error } = await window.supabaseClient
                .from('admins')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error || !admin) {
                console.error('Failed to load admin data:', error);
                return null;
            }

            return admin;
        } catch (e) {
            console.error('Error loading admin:', e);
            return null;
        }
    }

    const admin = await loadAdminData();

    // Update UI with admin info
    if (admin) {
        const adminNameEl = document.getElementById('adminName');
        const adminIdEl = document.getElementById('adminId');
        const adminAvatarEl = document.getElementById('adminAvatar');
        const welcomeNameEl = document.getElementById('welcomeName');
        const welcomeIdEl = document.getElementById('welcomeAdminId');
        const welcomeEmailEl = document.getElementById('welcomeEmail');

        if (adminNameEl) adminNameEl.textContent = admin.full_name;
        if (adminIdEl) adminIdEl.textContent = admin.admin_id;
        if (adminAvatarEl) adminAvatarEl.textContent = admin.full_name.charAt(0).toUpperCase();
        if (welcomeNameEl) welcomeNameEl.textContent = admin.full_name.split(' ')[0];
        if (welcomeIdEl) welcomeIdEl.textContent = admin.admin_id;
        if (welcomeEmailEl) welcomeEmailEl.textContent = admin.email;
    }

    // ============================================
    // MOBILE MENU
    // ============================================

    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileCloseBtn = document.getElementById('mobileCloseBtn');

    function openSidebar() {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', openSidebar);
    }

    if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener('click', closeSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // ============================================
    // UNDER MAINTENANCE MODAL
    // ============================================

    const maintenanceLinks = document.querySelectorAll('[data-maintenance]');

    maintenanceLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            closeSidebar();

            const pageName = link.getAttribute('data-maintenance');
            showMaintenanceModal(pageName);
        });
    });

    function showMaintenanceModal(pageName) {
        window.modal.show({
            type: 'warning',
            title: 'Under Maintenance',
            message: `<strong>${pageName}</strong> is currently under development.<br><br>This feature will be available soon!`,
            buttons: [
                {
                    text: 'Got it',
                    type: 'primary'
                }
            ]
        });
    }

    // ============================================
    // LOGOUT (redirect only - preserves session for other tabs)
    // Like FB/Instagram behavior
    // ============================================

    const logoutBtns = document.querySelectorAll('[data-logout]');

    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            // Just redirect to signin - session stays valid for other tabs
            window.location.href = 'signin.html';
        });
    });
});
