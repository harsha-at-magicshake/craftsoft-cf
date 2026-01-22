/* ============================================
   Version History - Data & Initialization
   ============================================ */

const versions = [
    {
        v: "v1.0",
        focus: "The Foundation",
        milestones: "Initial CRM launch. Basic management of Students, Clients, and Payments. Core Supabase integration."
    },
    {
        v: "v2.0",
        focus: "Portal Launch",
        milestones: "Introduction of the Student Portal. First iteration of Payment History and mobile-responsive dashboards."
    },
    {
        v: "v3.0",
        focus: "Intelligence & UX",
        milestones: "Introduction of Spotlight Search (Ctrl+K), real-time Desktop Notifications, and advanced analytics on the Admin dashboard."
    },
    {
        v: "v4.0",
        focus: "Scale & Security",
        milestones: "Launch of the Gmail-style Account Manager (multi-login) and the Session Timeout / Inactivity Lock security system."
    },
    {
        v: "v5.0",
        focus: "\"CraftSoft OS\"",
        milestones: "UI Standardisation. Modular Sidebar/Header JS engines across portals, relocation of Assets, and premium Logo Signature branding."
    }
];

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // Init Sidebar & Header
    AdminSidebar.init('v-history', '../');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('v-History');
    }

    // Render Account Panel (same pattern as dashboard.js)
    const admin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, admin);

    renderTable();
});

function renderTable() {
    const container = document.getElementById('v-history-body');
    if (!container) return;

    container.innerHTML = versions.map(ver => `
        <tr>
            <td><span class="v-badge">${ver.v}</span></td>
            <td><span class="milestone-focus">${ver.focus}</span></td>
            <td><div class="milestone-desc">${ver.milestones}</div></td>
        </tr>
    `).join('');
}
