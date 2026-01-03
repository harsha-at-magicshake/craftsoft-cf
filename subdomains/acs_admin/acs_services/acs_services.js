// ACS Services Module - Website Sync Approach
const websiteServices = [
    { code: 'S-GD', name: 'Graphic Design', category: 'Design' },
    { code: 'S-UX', name: 'UI/UX Design', category: 'Design' },
    { code: 'S-WEB', name: 'Website Development', category: 'Tech' },
    { code: 'S-CLOUD', name: 'Cloud & DevOps', category: 'Cloud' },
    { code: 'S-BM', name: 'Branding & Marketing', category: 'Branding' },
    { code: 'S-CAREER', name: 'Career Services', category: 'Branding' }
];

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // Initialize sidebar
    if (window.AdminSidebar) {
        window.AdminSidebar.init('acs_services', '../');
    }

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = window.AdminHeader.render('Services');

        // Load admin profile to render account panel
        const { data: admin } = await window.supabaseClient
            .from('admins')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (admin) {
            window.AdminSidebar.renderAccountPanel(session, admin);
        }
    }

    await initServices();
});

let allServices = [];
let currentPage = 1;
const itemsPerPage = 10;

async function initServices() {
    await loadServices();
    bindEvents();
}

async function loadServices() {
    const { Toast } = window.AdminUtils;
    const container = document.getElementById('services-content');

    try {
        const { data, error } = await window.supabaseClient
            .from('services')
            .select('*')
            .order('service_id', { ascending: true });

        if (error) throw error;

        // Filter out legacy non-prefixed codes if they exist
        allServices = (data || []).filter(s => s.service_code && s.service_code.startsWith('S-'));
        renderServicesLayout(allServices);

    } catch (err) {
        console.error('Error loading services:', err);
        container.innerHTML = '<div class="empty-state"><p>Error loading services. Make sure the table exists.</p></div>';
    }
}

function renderServicesLayout(services) {
    const container = document.getElementById('services-content');

    if (services.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-briefcase"></i></div>
                <h3>No services yet</h3>
                <p>Click "Sync from Website" to populate services</p>
                <button class="btn btn-outline btn-sm" style="margin-top: 15px;" onclick="syncFromWebsite()">Sync Now</button>
            </div>
        `;
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedServices = services.slice(start, start + itemsPerPage);

    // Desktop Table View
    const tableView = `
        <div class="data-table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Code</th>
                        <th>Service Name</th>
                        <th>Category</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedServices.map(srv => `
                        <tr>
                            <td><span class="badge badge-primary">${srv.service_id}</span></td>
                            <td><span class="badge badge-outline">${srv.service_code || '-'}</span></td>
                            <td class="font-medium">${srv.name}</td>
                            <td><span class="badge badge-secondary">${srv.category}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Mobile Card View
    const cardView = `
        <div class="data-cards">
            ${paginatedServices.map(srv => `
                <div class="data-card">
                    <div class="data-card-header">
                        <span class="badge badge-primary">${srv.service_id}</span>
                        <span class="badge badge-outline">${srv.service_code || '-'}</span>
                    </div>
                    <div class="data-card-body">
                        <h4 class="data-card-title">${srv.name}</h4>
                        <span class="badge badge-secondary">${srv.category}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Footer with count
    const footerView = `
        <div class="table-footer">
            <span>Total Services: <strong>${services.length}</strong></span>
        </div>
    `;

    container.innerHTML = tableView + cardView + footerView;

    // Render pagination
    window.AdminUtils.Pagination.render('pagination-container', services.length, currentPage, itemsPerPage, (page) => {
        currentPage = page;
        renderServicesLayout(allServices);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function bindEvents() {
    document.getElementById('sync-services-btn')?.addEventListener('click', syncFromWebsite);
}

async function syncFromWebsite() {
    const { Toast, Modal } = window.AdminUtils;
    const btn = document.getElementById('sync-services-btn');

    Modal.confirm(
        'Regenerate Services',
        'This will DELETE all current service records and rebuild them with standardized S- prefixes (e.g., S-GD) and Serv-XXX IDs. Proceed?',
        async () => {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Regenerating...</span>';

            try {
                // 1. Delete all existing services for a fresh start
                // Using filter that hits all possible IDs to ensure a total wipe
                const { error: deleteError } = await window.supabaseClient
                    .from('services')
                    .delete()
                    .gte('id', 0);

                if (deleteError) throw deleteError;

                // 2. Insert standardized services from scratch
                let addedCount = 0;
                for (let i = 0; i < websiteServices.length; i++) {
                    const s = websiteServices[i];
                    const nextNum = i + 1;
                    const newId = `Serv-${String(nextNum).padStart(3, '0')}`;

                    // Force the prefix if it's missing in the source array
                    let cleanCode = s.code;
                    if (!cleanCode.startsWith('S-')) {
                        cleanCode = 'S-' + cleanCode;
                    }

                    const { error } = await window.supabaseClient.from('services').insert({
                        service_id: newId,
                        service_code: cleanCode,
                        name: s.name,
                        category: s.category
                    });

                    if (error) throw error;
                    addedCount++;
                }

                Toast.success('Regeneration Success', `${addedCount} services standardized and rebuilt.`);
                await loadServices();

            } catch (err) {
                console.error(err);
                Toast.error('Regeneration error', err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-rotate"></i> <span>Sync from Website</span>';
            }
        }
    );
}
