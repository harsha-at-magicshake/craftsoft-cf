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

// Bulk Actions
const selectedItems = new Set();

function renderList(items) {
    const tbody = document.getElementById('archives-tbody');
    const loading = document.getElementById('archives-loading');
    const bulkBar = document.getElementById('archives-bulk-bar'); // Need to add this to HTML
    loading.style.display = 'none';

    // Reset selection on new render
    selectedItems.clear();
    updateBulkBar();

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fa-solid fa-box-open"></i>
                        <h3>No Archived Records</h3>
                        <p>No inactive ${currentTab} found.</p>
                    </div>
                </td>
            </tr>
        `;
        const cardsContainer = document.getElementById('archives-cards');
        if (cardsContainer) cardsContainer.innerHTML = '';
        document.getElementById('pagination-container').innerHTML = '';
        return;
    }

    // Pagination
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = items.slice(start, start + itemsPerPage);

    const cardsContainer = document.getElementById('archives-cards');

    // Table Rows
    tbody.innerHTML = paginated.map(item => {
        const id = item.student_id || item.client_id || 'N/A';
        const name = `${item.first_name} ${item.last_name || ''}`;

        let contextInfo = '';
        if (currentTab === 'students') {
            const courses = item.courses || [];
            if (courses.length > 0) {
                contextInfo = courses.map(c => `<span class="badge badge-gray">${c}</span>`).join(' ');
            } else {
                contextInfo = '<span class="text-muted text-xs">No Courses</span>';
            }
        } else {
            const services = item.services || [];
            if (services.length > 0) {
                contextInfo = services.map(s => `<span class="badge badge-gray">${s}</span>`).join(' ');
            } else {
                contextInfo = '<span class="text-muted text-xs">No Services</span>';
            }
        }

        return `
            <tr>
                <td><input type="checkbox" class="archive-checkbox" data-id="${item.id}" ${selectedItems.has(item.id) ? 'checked' : ''} onchange="toggleSelection('${item.id}')"></td>
                <td><span class="badge badge-secondary">${id}</span></td>
                <td>
                    <span class="table-user-name">${name}</span>
                </td>
                <td>
                    ${item.phone ? `<div class="text-sm"><i class="fa-solid fa-phone text-xs text-muted" style="margin-right:5px;"></i>${item.phone}</div>` : '<span class="text-muted">-</span>'}
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

    // Mobile Cards
    if (cardsContainer) {
        cardsContainer.innerHTML = paginated.map(item => {
            const id = item.student_id || item.client_id || 'N/A';
            const name = `${item.first_name} ${item.last_name || ''}`;

            let contextInfo = '';
            if (currentTab === 'students') {
                const courses = item.courses || [];
                contextInfo = courses.length > 0 ? courses.join(', ') : 'No Courses';
            } else {
                const services = item.services || [];
                contextInfo = services.length > 0 ? services.join(', ') : 'No Services';
            }

            return `
                <div class="premium-card">
                    <div class="card-header">
                         <div style="display:flex; align-items:center; gap:10px;">
                            <input type="checkbox" class="archive-checkbox" data-id="${item.id}" ${selectedItems.has(item.id) ? 'checked' : ''} onchange="toggleSelection('${item.id}')">
                            <span class="badge badge-secondary">${id}</span>
                        </div>
                    </div>
                    <div class="card-body">
                         <h4 class="card-name">${name}</h4>
                         <div class="card-info-item">
                            <i class="fa-solid fa-phone"></i> ${item.phone || '-'}
                         </div>
                         <div class="card-info-item">
                            <i class="fa-solid fa-list"></i> ${contextInfo}
                         </div>
                    </div>
                    <div class="card-actions">
                         <button class="btn btn-outline-success" onclick="restoreItem('${item.id}')">
                            <i class="fa-solid fa-rotate-left"></i> Restore
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

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

// Bulk Selection Logic
function toggleSelection(id) {
    if (selectedItems.has(id)) {
        selectedItems.delete(id);
    } else {
        selectedItems.add(id);
    }
    updateBulkBar();
}

function toggleSelectAll() {
    const mainCb = document.getElementById('archive-select-all');
    if (!mainCb) return;

    // We only toggle visible items on current page for simplicity, consistent with other pages
    // or we could track allItems. Let's stick to visible items to match UX of other grids usually

    // Actually, finding CURRENT visible items
    const visibleCheckboxes = document.querySelectorAll('.archive-checkbox');
    visibleCheckboxes.forEach(cb => {
        // Skip header checkbox if selected by query
        if (cb.id === 'archive-select-all') return;

        cb.checked = mainCb.checked;
        if (mainCb.checked) selectedItems.add(cb.dataset.id);
        else selectedItems.delete(cb.dataset.id);
    });

    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('archives-bulk-bar');
    const countSpan = document.getElementById('selected-count');

    if (!bar || !countSpan) return;

    if (selectedItems.size > 0) {
        bar.style.display = 'flex';
        countSpan.textContent = selectedItems.size;
    } else {
        bar.style.display = 'none';
    }

    // Also update Select All checkbox state
    const mainCb = document.getElementById('archive-select-all');
    if (mainCb) {
        const visibleCheckboxes = Array.from(document.querySelectorAll('#archives-tbody .archive-checkbox'));
        if (visibleCheckboxes.length > 0) {
            const allVisibleSelected = visibleCheckboxes.every(cb => selectedItems.has(cb.dataset.id));
            mainCb.checked = allVisibleSelected;
        } else {
            mainCb.checked = false;
        }
    }
}

async function bulkRestore() {
    if (selectedItems.size === 0) return;

    const count = selectedItems.size;
    const label = currentTab === 'students' ? 'Students' : 'Clients';

    window.AdminUtils.Modal.confirm(
        `Bulk Activate`,
        `Are you sure you want to restore ${count} ${label} to Active status?`,
        async () => {
            const loading = document.getElementById('archives-loading');
            loading.style.display = 'flex';

            try {
                const table = currentTab === 'students' ? 'students' : 'clients';
                const ids = Array.from(selectedItems);

                const { error } = await window.supabaseClient
                    .from(table)
                    .update({ status: 'ACTIVE' })
                    .in('id', ids);

                if (error) throw error;

                window.AdminUtils.Toast.success('Restored', `${count} records restored successfully`);
                selectedItems.clear();
                updateBulkBar();
                await loadItems();

            } catch (e) {
                console.error('Bulk restore error:', e);
                window.AdminUtils.Toast.error('Error', 'Failed to restore records');
                // Reload anyway to sync state
                await loadItems();
            }
        }
    );
}

// Expose globally

function cancelSelection() {
    selectedItems.clear();
    const mainCb = document.getElementById('archive-select-all');
    if (mainCb) mainCb.checked = false;
    document.querySelectorAll('.archive-checkbox').forEach(cb => cb.checked = false);
    updateBulkBar();
}

// Expose globally
window.restoreItem = restoreItem;
window.toggleSelection = toggleSelection;
window.toggleSelectAll = toggleSelectAll;
window.bulkRestore = bulkRestore;
window.cancelSelection = cancelSelection;
