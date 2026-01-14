// Archived Records Module
let currentTab = 'students';
let allItems = [];
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', async () => {
    // Session Check
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '/';
        return;
    }

    // Initialize Sidebar
    AdminSidebar.init('archived', '/');

    // Header
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Archived Records');
    }

    // Account Panel
    const currentAdmin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, currentAdmin);

    // Bind Events
    bindEvents();

    // Initial Load
    await loadItems();
});

function bindEvents() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = e.target.dataset.tab;
            currentPage = 1;
            loadItems();
        });
    });

    // Search
    document.getElementById('archive-search')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        filterAndRender(q);
    });
}

async function loadItems() {
    const container = document.getElementById('archives-container');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading archives...</p></div>';

    try {
        let query;
        if (currentTab === 'students') {
            query = window.supabaseClient
                .from('students')
                .select('*')
                .eq('status', 'INACTIVE')
                .order('updated_at', { ascending: false });
        } else if (currentTab === 'clients') {
            query = window.supabaseClient
                .from('clients')
                .select('*')
                .eq('status', 'INACTIVE')
                .order('updated_at', { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;

        allItems = data || [];
        filterAndRender();

    } catch (e) {
        console.error('Error loading archives:', e);
        container.innerHTML = '<div class="error-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load data</p></div>';
    }
}

function filterAndRender(searchQ = '') {
    const q = searchQ || document.getElementById('archive-search')?.value.toLowerCase() || '';

    const filtered = allItems.filter(item => {
        const name = `${item.first_name} ${item.last_name || ''}`.toLowerCase();
        const id = (item.student_id || item.client_id || '').toLowerCase();
        const phone = (item.phone || '').toLowerCase();

        return !q || name.includes(q) || id.includes(q) || phone.includes(q);
    });

    renderList(filtered);
}

function renderList(items) {
    const container = document.getElementById('archives-container');

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-box-open"></i>
                <h3>No Archived Records</h3>
                <p>No inactive ${currentTab} found.</p>
            </div>
        `;
        document.getElementById('pagination-container').innerHTML = '';
        return;
    }

    // Pagination
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = items.slice(start, start + itemsPerPage);

    container.innerHTML = paginated.map(item => {
        const id = item.student_id || item.client_id;
        const name = `${item.first_name} ${item.last_name || ''}`;
        const typeLabel = currentTab === 'students' ? 'Student' : 'Client';

        // Context info
        let contextInfo = '';
        if (currentTab === 'students') {
            const courseCount = (item.courses || []).length;
            contextInfo = `${courseCount} Course${courseCount !== 1 ? 's' : ''}`;
        } else {
            const serviceCount = (item.services || []).length;
            contextInfo = `${serviceCount} Service${serviceCount !== 1 ? 's' : ''}`;
        }

        return `
            <div class="archive-card">
                <div class="archive-info">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span class="badge badge-secondary">${id}</span>
                        <h4>${name}</h4>
                    </div>
                    <p>${contextInfo} • ${item.phone || 'No Phone'}</p>
                </div>
                <button class="restore-btn" onclick="restoreItem('${item.id}')">
                    <i class="fa-solid fa-rotate-left"></i> Activate
                </button>
            </div>
        `;
    }).join('');

    window.AdminUtils.Pagination.render('pagination-container', items.length, currentPage, itemsPerPage, (p) => {
        currentPage = p;
        filterAndRender();
        window.scrollTo(0, 0);
    });
}

async function restoreItem(id) {
    const label = currentTab === 'students' ? 'Student' : 'Client';

    window.AdminUtils.Modal.confirm(
        `Activate ${label}`,
        `Are you sure you want to move this ${label.toLowerCase()} back to the Active list?`,
        async () => {
            try {
                const table = currentTab === 'students' ? 'students' : 'clients';

                const { error } = await window.supabaseClient
                    .from(table)
                    .update({ status: 'ACTIVE' })
                    .eq('id', id);

                if (error) throw error;

                window.AdminUtils.Toast.success('Restored', `${label} marked as active`);
                loadItems();

            } catch (e) {
                console.error('Error restoring:', e);
                window.AdminUtils.Toast.error('Error', 'Failed to activate record');
            }
        }
    );
}

// Expose globally
window.restoreItem = restoreItem;
