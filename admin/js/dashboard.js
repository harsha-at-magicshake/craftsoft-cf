/* ============================================
   Dashboard Core Logic
   - Single Tab Session
   - Auth check
   - Session protection
   - Sidebar navigation
   - Logout
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
    // ============================================
    // SINGLE TAB SESSION (prevents multiple tabs)
    // ============================================

    const SESSION_KEY = 'craftsoft_admin_session';
    const SESSION_CHANNEL = 'craftsoft_admin_channel';

    // Generate unique tab ID
    const tabId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Check if another tab is already open
    function initSingleTabSession() {
        const existingSession = sessionStorage.getItem(SESSION_KEY);

        // Use BroadcastChannel API for cross-tab communication
        if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel(SESSION_CHANNEL);

            // Ask if any other tab is open
            channel.postMessage({ type: 'CHECK_SESSION', tabId: tabId });

            // Listen for responses
            channel.onmessage = (event) => {
                if (event.data.type === 'CHECK_SESSION' && event.data.tabId !== tabId) {
                    // Another tab is asking - respond that we exist
                    channel.postMessage({ type: 'SESSION_EXISTS', tabId: tabId });
                }

                if (event.data.type === 'SESSION_EXISTS' && event.data.tabId !== tabId) {
                    // Another tab exists - show error and redirect
                    showDuplicateTabError();
                }
            };

            // Mark this tab as the active session
            sessionStorage.setItem(SESSION_KEY, tabId);

            // Clear on unload
            window.addEventListener('beforeunload', () => {
                sessionStorage.removeItem(SESSION_KEY);
            });
        }
    }

    function showDuplicateTabError() {
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f1f5f9; padding: 20px;">
                <div style="background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; max-width: 400px;">
                    <div style="width: 80px; height: 80px; background: #fee2e2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2rem;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.5rem; color: #1e293b; margin-bottom: 10px;">Session Already Active</h2>
                    <p style="color: #64748b; margin-bottom: 20px;">Admin panel is already open in another tab. Please use that tab or close it first.</p>
                    <button onclick="window.close(); window.location.href='signin.html';" style="background: linear-gradient(135deg, #2896cd 0%, #6C5CE7 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">Close This Tab</button>
                </div>
            </div>
        `;
    }

    initSingleTabSession();

    // ============================================
    // SESSION PROTECTION (back/forward)
    // ============================================

    // Prevent caching
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
                // Not logged in - redirect to signin
                window.location.replace('signin.html');
                return null;
            }

            // Check if email is verified
            if (!session.user.email_confirmed_at) {
                await window.supabaseClient.auth.signOut();
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
    // LOGOUT
    // ============================================

    const logoutBtns = document.querySelectorAll('[data-logout]');

    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();

            window.modal.confirm(
                'Logout',
                'Are you sure you want to logout?',
                async () => {
                    try {
                        await window.supabaseClient.auth.signOut();

                        // Clear any cached data
                        sessionStorage.clear();
                        localStorage.removeItem('sb-pklhwfipldiswdboobua-auth-token');

                        // Redirect to signin
                        window.location.replace('signin.html');
                    } catch (error) {
                        console.error('Logout error:', error);
                        window.location.replace('signin.html');
                    }
                }
            );
        });
    });

    // ============================================
    // LISTEN FOR AUTH STATE CHANGES
    // ============================================

    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            window.location.replace('signin.html');
        }
    });
});
