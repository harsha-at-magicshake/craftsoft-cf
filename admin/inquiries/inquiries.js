document.addEventListener('DOMContentLoaded', async () => {
    // Auth
    const session = await window.supabaseConfig.getSession();
    if (!session) { window.location.href = '../login.html'; return; }

    AdminSidebar.init('inquiries');
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) headerContainer.innerHTML = AdminHeader.render('Inquiries');
});
