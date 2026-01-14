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

    // Initialize custom dropdown without search
    if (window.AdminUtils.SearchableSelect) {
        new window.AdminUtils.SearchableSelect('sort-order', { placeholder: 'Sort By', searchable: false });
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

        // Fetch retention setting
        try {
            const { data: set, error: setErr } = await window.supabaseClient
                .from('settings')
                .select('setting_value')
                .eq('setting_key', 'retention_period')
                .single();

            if (set && set.setting_value) {
                // Check for 'never'
                if (set.setting_value === 'never') {
                    window.RETENTION_DAYS = 'never';
                } else {
                    window.RETENTION_DAYS = parseInt(set.setting_value) || 30;
                }
            } else {
                window.RETENTION_DAYS = 30;
            }
        } catch (e) {
            console.warn('Failed to load retention setting', e);
            window.RETENTION_DAYS = 30;
        }

        // Update Info Banner text
        const bannerSpan = document.querySelector('.info-banner span');
        if (bannerSpan) {
            if (window.RETENTION_DAYS === 'never') {
                bannerSpan.textContent = 'Items in the Recovery Center are stored indefinitely until you empty trash manually.';
            } else {
                bannerSpan.textContent = `Items in the Recovery Center are automatically deleted after ${window.RETENTION_DAYS} days.`;
            }
        }

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
    // Mobile Cards Container
    const cardsContainer = document.getElementById('trash-cards');

    // Reset selection on new render
    selectedItems.clear();
    updateBulkBar();

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fa-regular fa-trash-can"></i>
                        <h3>Trash is Empty</h3>
                        <p>No deleted ${currentTab} found.</p>
                    </div>
                </td>
            </tr>
        `;
        if (cardsContainer) cardsContainer.innerHTML = `<div class="empty-state"><p>Trash is Empty</p></div>`;
        document.getElementById('pagination-container').innerHTML = '';
        return;
    }

    // Pagination
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = items.slice(start, start + itemsPerPage);

    // Table Render
    tbody.innerHTML = paginated.map(item => {
        const id = item.student_id || item.client_id || item.inquiry_id || 'ID-UNKNOWN';
        const name = `${item.first_name || item.name || ''} ${item.last_name || ''}`;

        // Calculate Days Left
        const deletedAt = new Date(item.deleted_at);

        let purgeTag = '';

        if (window.RETENTION_DAYS === 'never') {
            purgeTag = `<span class="badge badge-gray">Manual Purge</span>`;
        } else {
            const purgeDate = new Date(deletedAt);
            purgeDate.setDate(deletedAt.getDate() + (parseInt(window.RETENTION_DAYS) || 30));

            const now = new Date();
            const diffTime = purgeDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 3) {
                purgeTag = `<span class="badge badge-error">Purge in ${diffDays}d</span>`;
            } else if (diffDays < 0) {
                purgeTag = `<span class="badge badge-gray">Pending Purge</span>`;
            } else {
                purgeTag = `<span class="badge badge-info-soft">Purge in ${diffDays}d</span>`;
            }
        }

        return `
            <tr>
                <td><input type="checkbox" class="trash-checkbox" data-id="${item.id}" onchange="toggleSelection('${item.id}')"></td>
                <td><span class="badge badge-secondary">${id}</span></td>
                <td>
                    <span class="table-user-name">${name}</span>
                </td>
                <td>
                    ${item.phone ? `<span class="cell-phone"><i class="fa-solid fa-phone" style="margin-right:6px; color: #10b981;"></i>${item.phone}</span>` : '<span class="text-muted">-</span>'}
                </td>
                <td>
                    <span><i class="fa-regular fa-calendar" style="margin-right:6px; color: #ec4899;"></i>${deletedAt.toLocaleDateString()}</span>
                </td>
                <td>
                    <div class="action-buttons">
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

    // Mobile Cards Render
    if (cardsContainer) {
        cardsContainer.innerHTML = paginated.map(item => {
            const id = item.student_id || item.client_id || item.inquiry_id || 'ID-UNKNOWN';
            const name = `${item.first_name || item.name || ''} ${item.last_name || ''}`;
            const deletedAt = new Date(item.deleted_at);

            return `
                 <div class="premium-card">
                    <div class="card-header">
                         <div style="display:flex; align-items:center; gap:10px;">
                            <input type="checkbox" class="trash-checkbox" data-id="${item.id}" ${selectedItems.has(item.id) ? 'checked' : ''} onchange="toggleSelection('${item.id}')">
                            <span class="badge badge-secondary">${id}</span>
                        </div>
                    </div>
                    <div class="card-body">
                         <h4 class="card-name">${name}</h4>
                         <div class="card-info-item">
                            <i class="fa-solid fa-phone"></i> ${item.phone || '-'}
                         </div>
                         <div class="card-info-item">
                            <i class="fa-regular fa-calendar"></i> Deleted: ${deletedAt.toLocaleDateString()}
                         </div>
                    </div>
                    <div class="card-actions">
                         <button class="btn btn-outline-success" onclick="restoreFromTrash('${item.id}')">
                            <i class="fa-solid fa-trash-arrow-up"></i> Restore
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteForever('${item.id}', '${name.replace(/'/g, "\\'")}')">
                            <i class="fa-regular fa-trash-can"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Total Strip
    const totalStrip = document.getElementById('total-strip');
    if (totalStrip) {
        const label = currentTab.charAt(0).toUpperCase() + currentTab.slice(1);
        totalStrip.innerHTML = `<span>Total ${label}: <strong>${items.length}</strong></span>`;
        totalStrip.style.display = 'block';
    }

    window.AdminUtils.Pagination.render('pagination-container', items.length, currentPage, itemsPerPage, (p) => {
        currentPage = p;
        filterAndRender();
        window.scrollTo(0, 0);
    });
}

// Bulk Actions
const selectedItems = new Set();

function toggleSelection(id) {
    if (selectedItems.has(id)) selectedItems.delete(id);
    else selectedItems.add(id);
    updateBulkBar();
}

function toggleSelectAllTrash() {
    const mainCb = document.getElementById('trash-select-all');
    if (!mainCb) return;

    const visibleCheckboxes = document.querySelectorAll('.trash-checkbox');
    visibleCheckboxes.forEach(cb => {
        if (cb.id === 'trash-select-all') return;
        cb.checked = mainCb.checked;
        if (mainCb.checked) selectedItems.add(cb.dataset.id);
        else selectedItems.delete(cb.dataset.id);
    });
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('trash-bulk-bar');
    const countEl = document.getElementById('selected-count');
    if (selectedItems.size > 0) {
        if (bar) bar.style.display = 'flex';
        if (countEl) countEl.textContent = selectedItems.size;
    } else {
        if (bar) bar.style.display = 'none';
    }
}

async function bulkRestoreFromTrash() {
    if (selectedItems.size === 0) return;
    window.AdminUtils.Modal.confirm(
        'Bulk Restore',
        `Restore ${selectedItems.size} items to active list?`,
        async () => {
            try {
                const table = currentTab;
                const { error } = await window.supabaseClient.from(table).update({ deleted_at: null }).in('id', Array.from(selectedItems));
                if (error) throw error;
                window.AdminUtils.Toast.success('Restored', 'Items restored successfully');
                loadItems();
            } catch (e) {
                console.error(e);
                window.AdminUtils.Toast.error('Error', 'Failed to restore items');
            }
        }
    );
}

async function bulkDeleteForever() {
    if (selectedItems.size === 0) return;
    window.AdminUtils.Modal.confirm(
        'Bulk Delete Forever',
        `Permanently delete ${selectedItems.size} items? This cannot be undone.`,
        async () => {
            try {
                const table = currentTab;
                const { error } = await window.supabaseClient.from(table).delete().in('id', Array.from(selectedItems));
                if (error) throw error;
                window.AdminUtils.Toast.success('Deleted', 'Items permanently deleted');
                loadItems();
            } catch (e) {
                console.error(e);
                window.AdminUtils.Toast.error('Error', 'Failed to delete items');
            }
        }
    );
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


function cancelSelection() {
    selectedItems.clear();
    const mainCb = document.getElementById('trash-select-all');
    if (mainCb) mainCb.checked = false;
    document.querySelectorAll('.trash-checkbox').forEach(cb => cb.checked = false);
    updateBulkBar();
}

// Expose globally
window.restoreFromTrash = restoreFromTrash;
window.deleteForever = deleteForever;
window.bulkRestoreFromTrash = bulkRestoreFromTrash;
window.bulkDeleteForever = bulkDeleteForever;
window.toggleSelection = toggleSelection;
window.toggleSelectAllTrash = toggleSelectAllTrash;
window.cancelSelection = cancelSelection;
