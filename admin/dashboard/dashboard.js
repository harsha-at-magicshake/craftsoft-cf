// Dashboard Module
document.addEventListener('DOMContentLoaded', async () => {
    const { NavigationSecurity, Toast } = window.AdminUtils || {};

    // Check auth
    NavigationSecurity?.initProtectedPage();
    const session = await window.supabaseConfig?.getSession();
    if (!session) {
        NavigationSecurity?.secureRedirect('../login.html');
        return;
    }

    // Init sidebar
    AdminSidebar.init('dashboard');

    // Render header
    document.getElementById('header-container').innerHTML = AdminHeader.render('Dashboard');

    // Load dashboard data
    await loadDashboardData();
});

async function loadDashboardData() {
    const contentArea = document.getElementById('content-area');
    const { Toast } = window.AdminUtils;

    try {
        // Fetch counts in parallel
        const [studentsRes, tutorsRes, inquiriesRes] = await Promise.all([
            window.supabaseClient.from('students').select('id', { count: 'exact', head: true }),
            window.supabaseClient.from('tutors').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
            window.supabaseClient.from('contact_form').select('id', { count: 'exact', head: true }).eq('status', 'NEW')
        ]);

        const studentCount = studentsRes.count || 0;
        const tutorCount = tutorsRes.count || 0;
        const inquiryCount = inquiriesRes.count || 0;

        contentArea.innerHTML = `
            <div class="section-header">
                <div class="section-icon">
                    <i class="fa-solid fa-chart-pie"></i>
                </div>
                <h1 class="section-title">Dashboard</h1>
            </div>
            
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon students">
                            <i class="fa-solid fa-user-graduate"></i>
                        </div>
                    </div>
                    <div class="stat-card-value">${studentCount}</div>
                    <div class="stat-card-label">Total Students</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon tutors">
                            <i class="fa-solid fa-chalkboard-user"></i>
                        </div>
                    </div>
                    <div class="stat-card-value">${tutorCount}</div>
                    <div class="stat-card-label">Active Tutors</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon inquiries">
                            <i class="fa-solid fa-envelope-open-text"></i>
                        </div>
                    </div>
                    <div class="stat-card-value">${inquiryCount}</div>
                    <div class="stat-card-label">New Inquiries</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon revenue">
                            <i class="fa-solid fa-indian-rupee-sign"></i>
                        </div>
                    </div>
                    <div class="stat-card-value">₹0</div>
                    <div class="stat-card-label">This Month Revenue</div>
                </div>
            </div>
            
            <div class="quick-actions">
                <h3 class="quick-actions-title">Quick Actions</h3>
                <div class="quick-actions-grid">
                    <a href="../students/" class="quick-action-btn">
                        <i class="fa-solid fa-user-plus"></i>
                        <span>Add Student</span>
                    </a>
                    <a href="../tutors/" class="quick-action-btn">
                        <i class="fa-solid fa-user-tie"></i>
                        <span>Add Tutor</span>
                    </a>
                    <a href="../inquiries/" class="quick-action-btn">
                        <i class="fa-solid fa-envelope"></i>
                        <span>View Inquiries</span>
                    </a>
                    <a href="../courses/" class="quick-action-btn">
                        <i class="fa-solid fa-book"></i>
                        <span>Manage Courses</span>
                    </a>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Dashboard load error:', error);
        contentArea.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-exclamation-triangle"></i>
                <p>Failed to load dashboard. Please try again.</p>
            </div>
        `;
    }
}
