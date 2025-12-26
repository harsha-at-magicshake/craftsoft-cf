/* ============================================
   Admin Common JS
   Shared logic for all admin pages:
   - Mobile menu
   - Logout
   - Under Maintenance modal
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // ============================================
    // MOBILE MENU
    // ============================================

    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileCloseBtn = document.getElementById('mobileCloseBtn');

    function openSidebar() {
        if (sidebar) sidebar.classList.add('active');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Expose closeSidebar globally for other scripts
    window.closeSidebar = closeSidebar;

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
            if (window.modal) {
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
        });
    });

    // ============================================
    // LOGOUT (with confirmation modal)
    // ============================================

    const logoutBtns = document.querySelectorAll('[data-logout]');

    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (window.modal) {
                window.modal.confirm(
                    'Logout',
                    'Are you sure you want to leave?',
                    () => {
                        window.location.href = 'signin.html?from=logout';
                    }
                );
            } else {
                window.location.href = 'signin.html?from=logout';
            }
        });
    });
});
