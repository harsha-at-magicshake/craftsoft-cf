/* ============================================
   Materials Page Logic
   Craft Soft - Student Module
   ============================================ */

(function () {
    'use strict';

    // Initialize sidebar and header
    if (window.StudentSidebar) {
        window.StudentSidebar.init('materials');
    }

    const header = document.getElementById('header-container');
    if (header && window.StudentHeader) {
        header.innerHTML = window.StudentHeader.render('Materials');
    }

    // Logout handler
    window.handleLogout = function () {
        if (window.StudentSidebar && window.StudentSidebar.closeMobileNav) {
            window.StudentSidebar.closeMobileNav();
        }

        // Sign out from Supabase
        window.supabaseClient.auth.signOut().then(() => {
            window.location.replace('../');
        });
    };

})();
