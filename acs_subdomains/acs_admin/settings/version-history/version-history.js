/* ============================================
   Version History - Data & Initialization
   ============================================ */

const versions = [
    {
        v: "v5.0",
        title: "CraftSoft OS",
        date: "Current",
        active: true,
        milestone: "Portal Standardisation, Sidebar Engine, CSS Unification."
    },
    {
        v: "v4.0",
        title: "Scale & Security",
        date: "Dec 2025",
        milestone: "Multi-Account Switcher, Session Timeout, security locking."
    },
    {
        v: "v3.0",
        title: "Intelligence & UX",
        date: "Oct 2025",
        milestone: "Spotlight Search, In-App Notifications, analytics."
    },
    {
        v: "v2.0",
        title: "Portal Launch",
        date: "Aug 2025",
        milestone: "Student Portal launch, Payment History, course access."
    },
    {
        v: "v1.0",
        title: "CRM Foundation",
        date: "May 2025",
        milestone: "Core Supabase integration, Basic lead management, Account creation."
    }
];

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../../login.html';
        return;
    }

    // Init Sidebar & Header
    AdminSidebar.init('version-history', '../../');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('vHistory');
    }

    const admin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, admin);

    renderTimeline();
});

function renderTimeline() {
    const container = document.getElementById('version-timeline');
    if (!container) return;

    container.innerHTML = versions.map(ver => `
        <div class="timeline-item ${ver.active ? 'active' : ''}">
            <div class="version-dot"></div>
            <div class="version-card-full">
                <div class="version-header-row">
                    <span class="version-tag">${ver.v}</span>
                    <span class="version-date">${ver.date}</span>
                </div>
                <h3 class="version-title">${ver.title}</h3>
                <div class="milestone-text">
                    <p style="font-size: 0.95rem; color: var(--admin-text-secondary); line-height: 1.6;">
                        ${ver.milestone}
                    </p>
                </div>
            </div>
        </div>
    `).join('');
}
