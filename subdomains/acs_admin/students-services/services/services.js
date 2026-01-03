// Services Module (Maintenance State)

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Session
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // 2. Initialize Sidebar (Flat item on desktop, child on mobile)
    AdminSidebar.init('services');

    // 3. Render Header
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Services');
    }

    // 4. Render Account Panel
    const admin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, admin);
});
