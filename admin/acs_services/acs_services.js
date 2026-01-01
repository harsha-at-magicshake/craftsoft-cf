// ACS Services Module - Website Sync Approach
const websiteServices = [
    { name: 'Graphic Design', category: 'Design' },
    { name: 'UI/UX Design', category: 'Design' },
    { name: 'Website Development', category: 'Tech' },
    { name: 'Cloud & DevOps', category: 'Cloud' },
    { name: 'Branding & Marketing', category: 'Branding' },
    { name: 'Career Services', category: 'Branding' }
];

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // Initialize sidebar and header
    if (window.AdminSidebar) {
        window.AdminSidebar.init('acs_services', '../');
    }

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = window.AdminHeader.render('ACS Services');

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

        allServices = data || [];
        renderServicesTable(allServices);

    } catch (err) {
        console.error('Error loading services:', err);
        container.innerHTML = '<div class="empty-state">Error loading services.</div>';
    }
}

function renderServicesTable(services) {
    const container = document.getElementById('services-content');

    if (services.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-briefcase"></i>
                <p>No services found in database.</p>
                <button class="btn btn-outline btn-sm" onclick="syncFromWebsite()">Sync Now</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Service Name</th>
                        <th>Category</th>
                    </tr>
                </thead>
                <tbody>
                    ${services.map(srv => `
                        <tr>
                            <td><span class="badge badge-outline">${srv.service_id}</span></td>
                            <td class="font-medium">${srv.name}</td>
                            <td><span class="badge badge-secondary">${srv.category}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function bindEvents() {
    document.getElementById('sync-services-btn')?.addEventListener('click', syncFromWebsite);
}

async function syncFromWebsite() {
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('sync-services-btn');

    if (!confirm('This will sync services from the official website list. Proceed?')) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';

    try {
        // 1. Get existing services to avoid duplicates
        const { data: existing } = await window.supabaseClient.from('services').select('name');
        const existingNames = new Set(existing?.map(s => s.name) || []);

        // 2. Get highest sequence for Sr-ACS-XXX
        const { data: maxInq } = await window.supabaseClient
            .from('services')
            .select('service_id')
            .order('service_id', { ascending: false })
            .limit(1);

        let nextNum = 1;
        if (maxInq?.length > 0) {
            const match = maxInq[0].service_id.match(/Sr-ACS-(\d+)/);
            if (match) nextNum = parseInt(match[1]) + 1;
        }

        let addedCount = 0;
        for (const s of websiteServices) {
            if (!existingNames.has(s.name)) {
                const newId = `Sr-ACS-${String(nextNum).padStart(3, '0')}`;
                const { error } = await window.supabaseClient.from('services').insert({
                    service_id: newId,
                    name: s.name,
                    category: s.category
                });
                if (error) throw error;
                nextNum++;
                addedCount++;
            }
        }

        Toast.success('Sync Success', `${addedCount} new services added from website list.`);
        await loadServices();

    } catch (err) {
        console.error(err);
        Toast.error('Sync error', err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync from Website';
    }
}
