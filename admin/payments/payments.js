// Payments Module - Placeholder
document.addEventListener('DOMContentLoaded', async () => {
    const { NavigationSecurity } = window.AdminUtils || {};
    NavigationSecurity?.initProtectedPage();

    const session = await window.supabaseConfig?.getSession();
    if (!session) {
        NavigationSecurity?.secureRedirect('../login.html');
        return;
    }

    AdminSidebar.init('payments');
    document.getElementById('header-container').innerHTML = AdminHeader.render('Payments');
});
