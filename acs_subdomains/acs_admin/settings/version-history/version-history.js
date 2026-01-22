/* ============================================
   Version History - Data & Initialization
   ============================================ */

const versions = [
    {
        v: "v5.0",
        title: "CraftSoft OS Standardisation",
        date: "Jan 22, 2026",
        active: true,
        milestones: [
            "UI Standardisation across Admin and Student portals",
            "Modular Sidebar/Header JS engines implemented (Universal Shell)",
            "Relocated component assets (wa-modal) to root directory",
            "Sticky Profile cards in sidebars (Bottom anchor)",
            "System-wide 'Trash' rebranding (formerly Recently Deleted)"
        ]
    },
    {
        v: "v4.0",
        title: "Multi-Account & Modular Security",
        date: "Dec 15, 2025",
        milestones: [
            "Gmail-style Multi-Account Switcher (Switch without logout)",
            "Modular AdminUtils engine with Activity tracking",
            "Inactivity Auto-lock security layer (Session Timeout)",
            "Real-time Login state validation and remote logout detection"
        ]
    },
    {
        v: "v3.0",
        title: "Intelligent Interaction",
        date: "Oct 28, 2025",
        milestones: [
            "Spotlight Search (Ctrl + K) for rapid platform navigation",
            "Real-time In-App Notifications system (Toast + Center)",
            "Advanced Student Analytics and filter engines",
            "Bulk data recovery operations added to Settings"
        ]
    },
    {
        v: "v2.0",
        title: "The Student Ecosystem",
        date: "Aug 12, 2025",
        milestones: [
            "Full Student Portal launch for course access",
            "Payment Receipt generation (Automated PDFs)",
            "Course Assignment engine for Tutors",
            "WhatsApp API integration for lead follow-ups"
        ]
    },
    {
        v: "v1.0",
        title: "CRM Foundation",
        date: "May 05, 2025",
        milestones: [
            "Core Supabase Database integration",
            "Basic lead management (Inquiries) and Student CRM",
            "Account creation and standard Authentication",
            "Foundation of the Admin Dashboard"
        ]
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
        headerContainer.innerHTML = AdminHeader.render('Version History');
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
                <ul class="milestone-list">
                    ${ver.milestones.map(m => `
                        <li class="milestone-item">
                            <i class="fa-solid fa-circle-check"></i>
                            <span>${m}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `).join('');
}
