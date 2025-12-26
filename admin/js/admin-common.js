/* ============================================
   Admin Common JS
   Shared logic for all admin pages:
   - Session protection (back/forward)
   - Mobile menu
   - Logout
   - Under Maintenance modal
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
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
    // CLEAR ACTIVITY BUTTON
    // ============================================

    const clearActivityBtn = document.getElementById('clearActivityBtn');
    const activityTimeline = document.getElementById('activityTimeline');

    if (clearActivityBtn && activityTimeline) {
        clearActivityBtn.addEventListener('click', () => {
            if (window.modal) {
                window.modal.confirm('Clear Activity', 'Are you sure you want to clear all recent activity?', () => {
                    activityTimeline.innerHTML = `
                        <div class="activity-empty">
                            <i class="fas fa-check-circle"></i>
                            <p>All caught up!</p>
                        </div>
                    `;
                    window.toast.success('Cleared', 'Activity log cleared');
                });
            } else {
                activityTimeline.innerHTML = '';
            }
        });
    }

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

    // ============================================
    // SESSION TOKEN ENFORCEMENT
    // ============================================

    async function validateSessionToken() {
        try {
            if (!window.supabaseClient) return;
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) return;

            const { data: admin, error } = await window.supabaseClient
                .from('admins')
                .select('session_token')
                .eq('id', session.user.id)
                .single();

            // Handle 400 error (usually missing column) or other issues gracefully
            if (error) {
                // 42703 = Undefined Column in Postgres
                if (error.code === '42703' || error.status === 400) {
                    return; // Silently skip
                }
                throw error;
            }

            const localToken = sessionStorage.getItem('craftsoft_session_token');

            // If DB token exists and mismatch with local tab token -> Session conflict
            if (admin && admin.session_token && localToken && admin.session_token !== localToken) {
                sessionStorage.removeItem('craftsoft_session_token');
                window.location.replace('signin.html?reason=session_conflict');
            }
        } catch (e) {
            console.error('Session validation error:', e);
        }
    }

    // Run on load and every 10 seconds
    setTimeout(() => {
        validateSessionToken();
        setInterval(validateSessionToken, 15000); // Increased interval to 15s to reduce XHR load
    }, 2000);

    // ============================================
    // GLOBAL HELPERS
    // ============================================

    window.updateSessionToken = async (userId) => {
        try {
            const newToken = (typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).substring(2);
            const { error } = await window.supabaseClient
                .from('admins')
                .update({ session_token: newToken })
                .eq('id', userId);

            if (error) throw error;

            sessionStorage.setItem('craftsoft_session_token', newToken);
            return newToken;
        } catch (e) {
            console.warn('Could not update session token (DB column might be missing):', e.message);
            return null;
        }
    };
});
