// Recently Deleted Module
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
    AdminSidebar.init('recently-deleted', '/');

    // Header
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Recovery Center');
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
    document.getElementById('trash-search')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        filterAndRender(q);
    });

    // Sort
    document.getElementById('sort-order')?.addEventListener('change', () => {
        filterAndRender();
    });

    // Empty Trash
    document.getElementById('empty-trash-btn')?.addEventListener('click', emptyTrash);
}

async function loadItems() {
    const tbody = document.getElementById('trash-tbody');
    const loading = document.getElementById('trash-loading');

    tbody.innerHTML = '';
    loading.style.display = 'flex';

    try {
        let table = currentTab;
        if (currentTab === 'inquiries') table = 'inquiries'; // Same name
        // Receipts not implemented yet

        const { data, error } = await window.supabaseClient
            .from(table)
            .select('*')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false });

        if (error) {
            // Check if error is related to missing column
            if (error.message && error.message.includes('deleted_at')) {
                throw new Error('Database schema missing "deleted_at" column. Please contact support.');
            }
            throw error;
        }

        allItems = data || [];
        filterAndRender();

    } catch (e) {
        console.error('Error loading trash:', e);
        loading.style.display = 'none';
        if (e.message.includes('missing')) {
            tbody.innerHTML = `<tr><td colspan="5"><div class="error-state"><i class="fa-solid fa-database"></i><p>${e.message}</p></div></td></tr>`;
        } else {
            tbody.innerHTML = '<tr><td colspan="5"><div class="error-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load deleted records</p></div></td></tr>';
        }
    }
}

function filterAndRender(searchQ = '') {
    const q = searchQ || document.getElementById('trash-search')?.value.toLowerCase() || '';
    const sortOrder = document.getElementById('sort-order')?.value || 'newest';

    // 1. Filter
    let filtered = allItems.filter(item => {
        const name = `${item.first_name || item.name || ''} ${item.last_name || ''}`.toLowerCase();
        const id = (item.student_id || item.client_id || item.inquiry_id || '').toLowerCase();
        const phone = (item.phone || '').toLowerCase();

        return !q || name.includes(q) || id.includes(q) || phone.includes(q);
    });

    // 2. Sort
    filtered.sort((a, b) => {
        if (sortOrder === 'newest') { // Deleted Recently
            return new Date(b.deleted_at) - new Date(a.deleted_at);
        } else if (sortOrder === 'oldest') { // Deleted Long Ago
            return new Date(a.deleted_at) - new Date(b.deleted_at);
        } else if (sortOrder === 'name-asc') {
            const nameA = (a.first_name || a.name || '') + (a.last_name || '');
            const nameB = (b.first_name || b.name || '') + (b.last_name || '');
            return nameA.localeCompare(nameB);
        }
        return 0;
    });

    renderList(filtered);
}

function renderList(items) {
    const tbody = document.getElementById('trash-tbody');
    const loading = document.getElementById('trash-loading');
    loading.style.display = 'none';

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <i class="fa-regular fa-trash-can"></i>
                        <h3>Trash is Empty</h3>
                        <p>No deleted ${currentTab} found.</p>
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
        const id = item.student_id || item.client_id || item.inquiry_id || 'ID-UNKNOWN';
        const name = `${item.first_name || item.name || ''} ${item.last_name || ''}`;

        // Calculate Days Left
        const deletedAt = new Date(item.deleted_at);
        const purgeDate = new Date(deletedAt);
        purgeDate.setDate(deletedAt.getDate() + 30);

        const now = new Date();
        const diffTime = purgeDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let purgeTag = '';
        if (diffDays <= 3) {
            purgeTag = `<span class="badge badge-error">Purge in ${diffDays}d</span>`;
        } else if (diffDays < 0) {
            purgeTag = `<span class="badge badge-gray">Pending Purge</span>`;
        } else {
            purgeTag = `<span class="badge badge-info-soft">Purge in ${diffDays}d</span>`;
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
                    <div class="text-sm text-muted">
                        <i class="fa-regular fa-calendar" style="margin-right:5px;"></i>${deletedAt.toLocaleDateString()}
                    </div>
                </td>
                <td>${purgeTag}</td>
                <td class="text-right">
                    <div class="action-buttons" style="justify-content: flex-end;">
                        <button class="btn-icon" style="color:var(--success)" onclick="restoreFromTrash('${item.id}')" title="Restore">
                            <i class="fa-solid fa-trash-arrow-up"></i>
                        </button>
                        <button class="btn-icon" style="color:var(--danger)" onclick="deleteForever('${item.id}', '${name.replace(/'/g, "\\'")}')" title="Delete Forever">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
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

async function restoreFromTrash(id) {
    const table = currentTab; // students, clients, inquiries

    window.AdminUtils.Modal.confirm(
        'Restore Record',
        'This will move the record back to your active lists. Continue?',
        async () => {
            try {
                const { error } = await window.supabaseClient
                    .from(table)
                    .update({ deleted_at: null })
                    .eq('id', id);

                if (error) throw error;

                window.AdminUtils.Toast.success('Restored', 'Record moved directly to active list');
                loadItems();
            } catch (e) {
                console.error('Error restoring:', e);
                window.AdminUtils.Toast.error('Error', 'Failed to restore record');
            }
        }
    );
}

async function deleteForever(id, name) {
    window.AdminUtils.Modal.confirm(
        'Delete Forever',
        `Are you sure you want to permanently delete <b>${name}</b>? This cannot be undone.`,
        async () => {
            try {
                const table = currentTab;
                const { error } = await window.supabaseClient
                    .from(table)
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                window.AdminUtils.Toast.success('Deleted', 'Record permanently removed');
                loadItems();
            } catch (e) {
                console.error('Error deleting:', e);
                window.AdminUtils.Toast.error('Error', 'Failed to delete record');
            }
        }
    );
}

async function emptyTrash() {
    if (allItems.length === 0) return;

    window.AdminUtils.Modal.confirm(
        'Empty Trash',
        `Are you sure you want to permanently delete all ${allItems.length} items in this tab?`,
        async () => {
            try {
                const table = currentTab;
                // Since we can't easily do delete where deleted_at is not null without safety check,
                // we'll loop IDs or use an IN query if possible.
                const ids = allItems.map(i => i.id);

                const { error } = await window.supabaseClient
                    .from(table)
                    .delete()
                    .in('id', ids);

                if (error) throw error;

                window.AdminUtils.Toast.success('Trash Emptied', 'All items permanently removed');
                loadItems();
            } catch (e) {
                console.error('Error emptying trash:', e);
                window.AdminUtils.Toast.error('Error', 'Failed to empty trash');
            }
        }
    );
}

window.restoreFromTrash = restoreFromTrash;
window.deleteForever = deleteForever;
