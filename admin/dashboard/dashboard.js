document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth
    const { NavigationSecurity } = window.AdminUtils || {};
    // Optional: NavigationSecurity.initProtectedPage(); (if implemented)

    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // 2. Init Sidebar (Highlight 'dashboard')
    AdminSidebar.init('dashboard');

    // 3. Render Header
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Dashboard');
    }

    // 4. Render Dashboard Content
    renderDashboard();
});

async function renderDashboard() {
    const content = document.getElementById('dashboard-content');
    const admin = await window.Auth.getCurrentAdmin();

    content.innerHTML = `
        <div class="welcome-card">
            <div class="welcome-icon">
                <i class="fa-solid fa-chart-pie"></i>
            </div>
            <h2 class="welcome-title">Welcome back, ${admin?.full_name || 'Admin'}!</h2>
            <p class="welcome-text">Select a module from the sidebar to manage students, tutors, courses, and more.</p>
        </div>
    `;
}
