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

    // Initialize custom dropdown
    if (window.AdminUtils.SearchableSelect) {
        new window.AdminUtils.SearchableSelect('sort-order', { placeholder: 'Sort By' });
    }
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

    // Sort
    document.getElementById('sort-order')?.addEventListener('change', () => {
        filterAndRender();
    });
}

async function loadItems() {
    const tbody = document.getElementById('archives-tbody');
    const loading = document.getElementById('archives-loading');

    tbody.innerHTML = '';
    loading.style.display = 'flex';

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
        loading.style.display = 'none';
        tbody.innerHTML = '<tr><td colspan="5"><div class="error-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load data</p></div></td></tr>';
    }
}

function filterAndRender(searchQ = '') {
    const q = searchQ || document.getElementById('archive-search')?.value.toLowerCase() || '';
    const sortOrder = document.getElementById('sort-order')?.value || 'newest';

    // 1. Filter
    let filtered = allItems.filter(item => {
        const name = `${item.first_name} ${item.last_name || ''}`.toLowerCase();
        const id = (item.student_id || item.client_id || '').toLowerCase();
        const phone = (item.phone || '').toLowerCase();

        return !q || name.includes(q) || id.includes(q) || phone.includes(q);
    });

    // 2. Sort
    filtered.sort((a, b) => {
        if (sortOrder === 'newest') {
            return new Date(b.updated_at) - new Date(a.updated_at);
        } else if (sortOrder === 'oldest') {
            return new Date(a.updated_at) - new Date(b.updated_at);
        } else if (sortOrder === 'name-asc') {
            const nameA = a.first_name + (a.last_name || '');
            const nameB = b.first_name + (b.last_name || '');
            return nameA.localeCompare(nameB);
        } else if (sortOrder === 'name-desc') {
            const nameA = a.first_name + (a.last_name || '');
            const nameB = b.first_name + (b.last_name || '');
            return nameB.localeCompare(nameA);
        }
        return 0;
    });

    renderList(filtered);
}

function renderList(items) {
    const tbody = document.getElementById('archives-tbody');
    const loading = document.getElementById('archives-loading');
    loading.style.display = 'none';

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <i class="fa-solid fa-box-open"></i>
                        <h3>No Archived Records</h3>
                        <p>No inactive ${currentTab} found.</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('pagination-container').innerHTML = '';
        return;
    }

    // Pagination
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = items.slice(start, start + itemsPerPage);

    tbody.innerHTML = paginated.map(item => {
        const id = item.student_id || item.client_id || 'N/A';
        const name = `${item.first_name} ${item.last_name || ''}`;

        // Context info
        let contextInfo = '';
        if (currentTab === 'students') {
            const courseCount = (item.courses || []).length;
            contextInfo = `<span class="badge ${courseCount > 0 ? 'badge-blue' : 'badge-gray'}">${courseCount} Course${courseCount !== 1 ? 's' : ''}</span>`;
        } else {
            const serviceCount = (item.services || []).length;
            contextInfo = `<span class="badge ${serviceCount > 0 ? 'badge-blue' : 'badge-gray'}">${serviceCount} Service${serviceCount !== 1 ? 's' : ''}</span>`;
        }

        return `
            <tr>
                <td><span class="badge badge-secondary">${id}</span></td>
                <td>
                    <div class="table-user-info">
                        <div class="table-user-avatar">${window.AdminUtils.AccountManager.getInitials(name)}</div>
                        <span class="table-user-name">${name}</span>
                    </div>
                </td>
                <td>
                    ${item.phone ? `<div class="text-sm"><i class="fa-solid fa-phone text-xs text-muted" style="margin-right:5px;"></i>${item.phone}</div>` : '<span class="text-muted">-</span>'}
                    ${item.email ? `<div class="text-sm text-muted" style="margin-top:2px;">${item.email}</div>` : ''}
                </td>
                 <td>${contextInfo}</td>
                <td class="text-right">
                    <button class="btn btn-sm btn-outline-success" onclick="restoreItem('${item.id}')" title="Restore to Active">
                        <i class="fa-solid fa-rotate-left"></i> Activate
                    </button>
                </td>
            </tr>
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
