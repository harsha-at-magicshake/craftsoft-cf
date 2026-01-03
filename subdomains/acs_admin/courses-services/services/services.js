// Services Master Table Module
const websiteServices = [
    { code: 'S-WDEV', name: 'Website Development' },
    { code: 'S-UIUX', name: 'UI/UX Design Services' },
    { code: 'S-GD', name: 'Graphic Design Services' },
    { code: 'S-BRND', name: 'Branding & Marketing' },
    { code: 'S-CLOUD', name: 'Cloud & DevOps Solutions' },
    { code: 'S-CAREER', name: 'Career & Placement Services' }
];

let allServices = [];
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../../login.html';
        return;
    }

    AdminSidebar.init('services', '../../');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) headerContainer.innerHTML = AdminHeader.render('Services');

    const admin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, admin);

    await loadServices();

    document.getElementById('sync-services-btn')?.addEventListener('click', syncServices);
});

// =====================
// Data Loading
// =====================
async function loadServices() {
    const { Toast } = window.AdminUtils;
    const content = document.getElementById('services-content');

    try {
        const { data: services, error } = await window.supabaseClient
            .from('services')
            .select('*')
            .order('service_code', { ascending: true });

        if (error) throw error;
        allServices = services || [];
        renderServicesList(allServices);
    } catch (error) {
        console.error(error);
        content.innerHTML = '<div class="error-state"><i class="fa-solid fa-exclamation-triangle"></i><p>Failed to load services.</p></div>';
    }
}

function renderServicesList(services) {
    const content = document.getElementById('services-content');

    if (!services || services.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-briefcase"></i></div>
                <h3>No services yet</h3>
                <p>Click "Sync from Website" to populate services</p>
            </div>`;
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedServices = services.slice(start, start + itemsPerPage);

    content.innerHTML = `
        <div class="data-table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Code</th><th>Name</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedServices.map(s => `
                        <tr>
                            <td><span class="badge badge-primary">${s.service_code}</span></td>
                            <td>${s.name || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="table-footer"><span>${services.length} service${services.length !== 1 ? 's' : ''} synced</span></div>
    `;

    // Render pagination
    window.AdminUtils.Pagination.render('pagination-container', services.length, currentPage, itemsPerPage, (page) => {
        currentPage = page;
        renderServicesList(allServices);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// =====================
// Sync Services
// =====================
async function syncServices() {
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('sync-services-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';

    try {
        const { data: existing, error: fetchError } = await window.supabaseClient
            .from('services')
            .select('*');
        if (fetchError) throw fetchError;

        // Create Maps for easy lookup
        const existingByCode = new Map(existing?.map(s => [s.service_code, s]) || []);
        const existingByName = new Map(existing?.map(s => [s.name?.toLowerCase(), s]) || []);

        for (const svc of websiteServices) {
            // Find ALL matches by code or name
            const matches = existing.filter(ex =>
                ex.service_code === svc.code ||
                ex.name?.toLowerCase() === svc.name.toLowerCase()
            );

            if (matches.length > 0) {
                // Keep the first one and update it
                const primary = matches[0];
                await window.supabaseClient.from('services')
                    .update({
                        service_code: svc.code,
                        name: svc.name
                    })
                    .eq('id', primary.id);
                updated++;

                // Delete all other matches (duplicates)
                if (matches.length > 1) {
                    const extraIds = matches.slice(1).map(m => m.id);
                    await window.supabaseClient.from('services')
                        .delete()
                        .in('id', extraIds);
                }
            } else {
                // Insert new
                await window.supabaseClient.from('services').insert({
                    service_code: svc.code,
                    name: svc.name
                });
                synced++;
            }
        }

        // Optional: Remove duplicates that might still exist if multiple entries matched the same name/code logic
        // (Just a simple message for now)
        Toast.success('Synced', `${synced} new services, ${updated} updated`);
        await loadServices();
    } catch (e) {
        console.error('Sync error:', e);
        Toast.error('Error', e.message || 'Failed to sync services');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync from Website';
    }
}
