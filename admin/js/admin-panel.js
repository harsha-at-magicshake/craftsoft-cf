/* =====================================================
   ADMIN PANEL - Core JavaScript
   Handles sidebar, auth, and common functionality
   ===================================================== */

document.addEventListener('DOMContentLoaded', async function () {
    'use strict';

    // =========================================
    // DOM Elements
    // =========================================
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileCloseBtn = document.getElementById('mobileCloseBtn');

    // =========================================
    // Sidebar Toggle (Mobile)
    // =========================================
    function openSidebar() {
        if (sidebar) {
            sidebar.classList.add('open');
        }
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('active');
        }
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (sidebar) {
            sidebar.classList.remove('open');
        }
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
        }
        document.body.style.overflow = '';
    }

    // Event Listeners for Sidebar
    if (mobileMenuBtn) {
        const toggleMenu = function (e) {
            e.preventDefault();
            e.stopPropagation();
            openSidebar();
        };

        mobileMenuBtn.addEventListener('click', toggleMenu);
        mobileMenuBtn.addEventListener('touchend', toggleMenu, { passive: false });
    }

    if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar();
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar on escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeSidebar();
        }
    });

    // Close sidebar when clicking a nav link (mobile)
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });

    // =========================================
    // Load Admin Info
    // =========================================
    async function loadAdminInfo() {
        try {
            if (!window.supabaseClient) return;

            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) return;

            const { data: admin } = await window.supabaseClient
                .from('admins')
                .select('full_name, admin_id')
                .eq('id', session.user.id)
                .single();

            if (admin) {
                const adminName = document.getElementById('adminName');
                const adminId = document.getElementById('adminId');
                const adminAvatar = document.getElementById('adminAvatar');

                if (adminName) adminName.textContent = admin.full_name;
                if (adminId) adminId.textContent = admin.admin_id;
                if (adminAvatar) adminAvatar.textContent = admin.full_name.charAt(0).toUpperCase();
            }
        } catch (error) {
            console.error('Error loading admin info:', error);
        }
    }

    // =========================================
    // Set Active Nav Item
    // =========================================
    function setActiveNav() {
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(function (item) {
            const href = item.getAttribute('href');
            if (href === currentPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // =========================================
    // Prevent Back Navigation After Logout
    // =========================================
    function preventBackNavigation() {
        history.pushState(null, null, location.href);
        window.addEventListener('popstate', function () {
            history.pushState(null, null, location.href);
        });
    }

    // =========================================
    // Auto-Lock (Session Timeout)
    // =========================================
    const TIMEOUT_DURATION = 10 * 60 * 1000; // 10 minutes
    let idleTimer;

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(lockSession, TIMEOUT_DURATION);
    }

    async function lockSession() {
        try {
            await window.supabaseClient.auth.signOut();
            window.location.replace('signin.html?reason=timeout');
        } catch (error) {
            window.location.replace('signin.html');
        }
    }

    ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();

    // =========================================
    // Initialize
    // =========================================
    setActiveNav();
    preventBackNavigation();
    await loadAdminInfo();
});
