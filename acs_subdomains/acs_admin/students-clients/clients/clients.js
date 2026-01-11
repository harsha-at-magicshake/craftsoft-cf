// Clients Module (Converted from Service Inquiries)
let allClients = [];
let allServicesForClients = [];
let serviceFees = {}; // Store per-service fees { serviceCode: fee }
let selectedClientIds = new Set();
let statusFilter = 'ACTIVE';
let deleteTargetId = null;

// Pagination State
let currentPage = 1;
const itemsPerPage = window.innerWidth <= 1250 ? 5 : 10;



document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../../login.html';
        return;
    }

    AdminSidebar.init('clients', '../../');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Clients');
    }

    const admin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, admin);

    // Initial stats with count-up
    initializeStats();

    await loadServicesForClients();
    await loadClients();

    bindFormEvents();
    bindDeleteEvents();

    document.getElementById('add-client-btn')?.addEventListener('click', () => openForm());
    document.getElementById('client-search')?.addEventListener('input', (e) => filterClients(e.target.value));
    document.getElementById('status-filter')?.addEventListener('change', (e) => {
        statusFilter = e.target.value;
        currentPage = 1;
        loadClients();
    });
    document.getElementById('bulk-delete-btn')?.addEventListener('click', bulkDeleteClients);


    // Check for prefill from inquiry conversion
    checkPrefill();
});

async function initializeStats() {
    window.AdminUtils.StatsHeader.render('stats-container', [
        { label: 'Total Clients', value: 0, icon: 'fa-solid fa-user-tie', color: 'var(--primary-500)' },
        { label: 'Active Projects', value: 0, icon: 'fa-solid fa-hand-holding-hand', color: 'var(--info)' },
        { label: 'Total Value', value: 0, icon: 'fa-solid fa-box-archive', color: 'var(--success)' }
    ]);

    try {
        const [totalCount, activeProjects, totalRev] = await Promise.all([
            window.supabaseClient.from('clients').select('id', { count: 'exact', head: true }),
            window.supabaseClient.from('clients').select('id', { count: 'exact', head: true }), // Placeholder for active
            window.supabaseClient.from('payments').select('amount_paid').not('service_id', 'is', null).eq('status', 'SUCCESS')
        ]);

        const totalValue = (totalRev.data || []).reduce((sum, p) => sum + (p.amount_paid || 0), 0);

        window.AdminUtils.StatsHeader.render('stats-container', [
            { label: 'Total Clients', value: totalCount.count || 0, icon: 'fa-solid fa-user-tie', color: 'var(--primary-500)' },
            { label: 'Projects', value: totalCount.count || 0, icon: 'fa-solid fa-hand-holding-hand', color: 'var(--info)' },
            { label: 'Service Revenue', value: totalValue, icon: 'fa-solid fa-box-archive', color: 'var(--success)', prefix: '₹' }
        ]);
    } catch (err) {
        console.error('Stats load error:', err);
    }
}

// =====================
// Load Services Master Data
// =====================
async function loadServicesForClients() {
    try {
        const { data, error } = await window.supabaseClient
            .from('services')
            .select('*')
            .order('service_code');

        if (error) throw error;
        allServicesForClients = data || [];
    } catch (e) {
        console.error('Error loading services:', e);
        allServicesForClients = [];
    }
}

// =====================
// Load Clients
// =====================
async function loadClients() {
    showSkeletons();

    try {
        let query = window.supabaseClient
            .from('clients')
            .select('*');

        if (statusFilter !== 'ALL') {
            query = query.eq('status', statusFilter);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        allClients = data || [];
        renderClients(allClients);
    } catch (e) {
        console.error('Error loading clients:', e);
        const tableContainer = document.getElementById('clients-table-container');
        if (tableContainer) tableContainer.innerHTML = `<p class="text-error">Failed to load clients.</p>`;
    }
}

function showSkeletons() {
    const tableContainer = document.getElementById('clients-table-container');
    const cardsContainer = document.getElementById('clients-cards');

    if (tableContainer) {
        let tableRows = '';
        for (let i = 0; i < 5; i++) {
            tableRows += `
                <tr>
                    <td><div class="skeleton" style="height: 16px; width: 16px;"></div></td>
                    <td><div class="skeleton" style="height: 24px; width: 80px;"></div></td>
                    <td><div class="skeleton" style="height: 16px; width: 120px;"></div></td>
                    <td><div class="skeleton" style="height: 16px; width: 100px;"></div></td>
                    <td><div class="skeleton" style="height: 16px; width: 150px;"></div></td>
                    <td class="text-right"><div class="skeleton" style="height: 16px; width: 60px; margin-left: auto;"></div></td>
                    <td class="text-right"><div class="skeleton" style="height: 16px; width: 60px; margin-left: auto;"></div></td>
                    <td class="text-right"><div class="skeleton" style="height: 32px; width: 100px; margin-left: auto;"></div></td>
                </tr>
            `;
        }
        tableContainer.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th width="40"><div class="skeleton" style="height: 16px; width: 16px;"></div></th>
                            <th>Client ID</th>
                            <th>Name</th>
                            <th class="text-left">Phone</th>
                            <th class="text-left">Services</th>
                            <th class="text-right">Quotation Breakdown</th>
                            <th class="text-right">Total Quotation</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        `;
    }

    if (cardsContainer) {
        let cards = '';
        for (let i = 0; i < 3; i++) {
            cards += `
                <div class="premium-card" style="margin-bottom: 1rem; padding: 1.5rem; border-radius: 16px; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <div class="card-header" style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                        <div class="skeleton" style="height: 16px; width: 16px; border-radius: 4px;"></div>
                        <div class="skeleton" style="height: 24px; width: 80px; border-radius: 20px;"></div>
                    </div>
                    <div class="card-body">
                        <div class="skeleton" style="height: 20px; width: 60%; margin-bottom: 1rem;"></div>
                        <div class="skeleton" style="height: 14px; width: 40%; margin-bottom: 0.5rem;"></div>
                        <div class="skeleton" style="height: 14px; width: 50%;"></div>
                        <div style="margin: 1.25rem 0; border-top: 1px dashed #eee;"></div>
                        <div style="display: flex; justify-content: space-between;">
                            <div class="skeleton" style="height: 14px; width: 30%;"></div>
                            <div class="skeleton" style="height: 14px; width: 20%;"></div>
                        </div>
                    </div>
                    <div class="card-actions" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-top: 1.25rem;">
                        <div class="skeleton" style="height: 36px; border-radius: 12px;"></div>
                        <div class="skeleton" style="height: 36px; border-radius: 12px;"></div>
                        <div class="skeleton" style="height: 36px; border-radius: 12px;"></div>
                    </div>
                </div>
            `;
        }
        cardsContainer.innerHTML = cards;
    }
}

function filterClients(query) {
    const q = query.toLowerCase();
    const filtered = allClients.filter(c =>
        (c.first_name + ' ' + (c.last_name || '')).toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.client_id?.toLowerCase().includes(q) ||
        (c.services || []).some(s => s.toLowerCase().includes(q))
    );
    renderClients(filtered);
}

function renderClients(clients) {
    const tableContainer = document.getElementById('clients-table-container');
    const cardsContainer = document.getElementById('clients-cards');

    if (!clients || clients.length === 0) {
        const emptyHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-person-digging"></i>
                <p>No clients found</p>
                <span>Convert service inquiries or add clients manually</span>
            </div>
        `;
        if (tableContainer) tableContainer.innerHTML = emptyHTML;
        if (cardsContainer) cardsContainer.innerHTML = emptyHTML;
        updateBulkActionsBar();
        return;
    }

    const totalPages = Math.ceil(clients.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const pageClients = clients.slice(startIdx, startIdx + itemsPerPage);

    // Render Table
    let tableHtml = `<div class="table-wrapper"><table class="data-table">
        <thead>
            <tr>
                <th width="40">
                    <input type="checkbox" id="select-all-clients" ${isAllSelected(pageClients) ? 'checked' : ''}>
                </th>
                <th>Client ID</th>
                <th>Name</th>
                <th class="text-left">Phone</th>
                <th class="text-left">Services</th>
                <th class="text-right">Quotation Breakdown</th>
                <th class="text-right">Total Quotation</th>
                <th class="text-right">Actions</th>
            </tr>
        </thead>
        <tbody>`;

    pageClients.forEach(c => {
        const fullName = `${c.first_name} ${c.last_name || ''}`.trim();
        const servicesList = (c.services || []).join(', ') || '-';
        const statusClass = c.status === 'ACTIVE' ? 'status-converted' : 'status-demo';

        tableHtml += `
            <tr>
                <td><input type="checkbox" class="client-checkbox" data-id="${c.id}" ${selectedClientIds.has(c.id) ? 'checked' : ''}></td>
                <td><span class="badge badge-primary">${c.client_id || '-'}</span></td>
                <td>${fullName}</td>
                <td class="text-left">${c.phone || '-'}</td>
                <td class="text-left"><span class="services-tags">${servicesList}</span></td>
                <td class="text-right">
                    ${(c.services || []).map(code => {
            const fee = c.service_fees?.[code] || 0;
            return `<div style="font-size: 0.8rem; color: var(--admin-text-muted);">${code}: ₹${formatNumber(fee)}</div>`;
        }).join('')}
                </td>
                <td class="text-right" style="font-weight: 700; color: var(--primary-color);">₹${formatNumber(c.total_fee || 0)}</td>
                <td class="actions-cell text-right">
                    <div class="cell-actions" style="justify-content: flex-end;">
                        <button class="action-btn edit-btn" data-id="${c.id}" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <a href="https://wa.me/91${c.phone.replace(/\D/g, '')}" target="_blank" class="action-btn whatsapp" title="WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i>
                        </a>
                        ${c.status === 'INACTIVE' ? `
                            <button class="action-btn success reactivate-btn" data-id="${c.id}" data-name="${fullName}" title="Reactivate">
                                <i class="fa-solid fa-rotate-left"></i>
                            </button>
                            <button class="action-btn delete perm-delete-btn" data-id="${c.id}" data-name="${fullName}" title="Permanent Delete">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        ` : `
                            <button class="action-btn delete deactivate-btn" data-id="${c.id}" data-name="${fullName}" title="Deactivate">
                                <i class="fa-solid fa-user-slash"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table></div>`;
    if (tableContainer) tableContainer.innerHTML = tableHtml;

    // Render Cards
    let cardsHtml = pageClients.map(c => {
        const fullName = `${c.first_name} ${c.last_name || ''}`.trim();
        const servicesList = (c.services || []).join(', ') || '-';
        const statusClass = c.status === 'ACTIVE' ? 'status-converted' : 'status-demo';

        return `
            <div class="premium-card" data-id="${c.id}">
                <div class="card-header">
                    <div class="card-header-left">
                        <input type="checkbox" class="client-checkbox" data-id="${c.id}" ${selectedClientIds.has(c.id) ? 'checked' : ''}>
                        <span class="card-id-badge">${c.client_id || 'CL-ACS-XXX'}</span>
                    </div>
                </div>
                <div class="card-body" style="text-align: left;">
                    <h4 class="card-name" style="margin-bottom: 0.75rem;">${fullName}</h4>
                    <div class="card-info-row">
                        <div class="card-info-item" style="color: var(--admin-text-muted);"><i class="fa-solid fa-phone" style="color: #10b981;"></i> ${c.phone || '-'}</div>
                        <div class="card-info-item" style="color: var(--admin-text-muted); margin-top: 4px;"><i class="fa-solid fa-wrench" style="color: #6366f1;"></i> ${servicesList}</div>
                    </div>

                    <div style="margin: 1rem 0; border-top: 1px dashed var(--admin-input-border); opacity: 0.5;"></div>

                    <div class="card-breakdown">
                        ${(c.services || []).map(code => {
            const fee = c.service_fees?.[code] || 0;
            return `
                                <div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.25rem;">
                                    <span style="color: var(--admin-text-muted);">${code}</span>
                                    <span style="font-weight: 500;">₹${formatNumber(fee)}</span>
                                </div>
                            `;
        }).join('')}
                        <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-weight: 700; color: var(--primary-color); font-size: 1rem;">
                            <span>Total Quotation</span>
                            <span>₹${formatNumber(c.total_fee || 0)}</span>
                        </div>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn edit edit-btn" data-id="${c.id}">
                        <i class="fa-solid fa-pen"></i> <span>Edit</span>
                    </button>
                    <a href="https://wa.me/91${c.phone.replace(/\D/g, '')}" target="_blank" class="card-action-btn whatsapp">
                        <i class="fa-brands fa-whatsapp"></i> <span>Chat</span>
                    </a>
                    ${c.status === 'INACTIVE' ? `
                        <button class="card-action-btn success reactivate-btn" data-id="${c.id}" data-name="${fullName}">
                            <i class="fa-solid fa-rotate-left"></i> <span>Restore</span>
                        </button>
                        <button class="card-action-btn delete perm-delete-btn" data-id="${c.id}" data-name="${fullName}">
                            <i class="fa-solid fa-trash-can"></i> <span>Forever</span>
                        </button>
                    ` : `
                        <button class="card-action-btn delete deactivate-btn" data-id="${c.id}" data-name="${fullName}">
                            <i class="fa-solid fa-user-slash"></i> <span>Deactivate</span>
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
    if (cardsContainer) cardsContainer.innerHTML = cardsHtml;

    // Common Footer (shows on both mobile & desktop)
    const footerContainer = document.querySelector('.pagination-container');
    const existingFooter = document.getElementById('clients-footer');
    if (existingFooter) existingFooter.remove();

    const footer = document.createElement('div');
    footer.id = 'clients-footer';
    footer.className = 'table-footer';
    footer.style.marginTop = '1rem';
    footer.innerHTML = `<span>Total Clients: <strong>${clients.length}</strong></span>`;

    // Insert before pagination
    footerContainer.parentNode.insertBefore(footer, footerContainer);

    renderPagination(totalPages);
    bindTableActions();
    updateBulkActionsBar();
}

function updateBulkActionsBar() {
    const bar = document.getElementById('bulk-actions-container');
    const countEl = document.getElementById('selected-count');
    if (!bar || !countEl) return;

    if (selectedClientIds.size > 0) {
        bar.style.display = 'block';
        countEl.textContent = selectedClientIds.size;
    } else {
        bar.style.display = 'none';
    }
}

function isAllSelected(pageClients) {
    if (pageClients.length === 0) return false;
    return pageClients.every(c => selectedClientIds.has(c.id));
}

function renderPagination(totalPages) {
    const container = document.getElementById('pagination-container');
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '<div class="pagination">';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.onclick = () => {
            currentPage = parseInt(btn.dataset.page);
            renderClients(allClients);
        };
    });
}

function bindTableActions() {
    document.querySelectorAll('.edit-btn').forEach(b => b.onclick = () => openForm(b.dataset.id));
    document.querySelectorAll('.reactivate-btn').forEach(b => b.onclick = () => reactivateClient(b.dataset.id, b.dataset.name));
    document.querySelectorAll('.deactivate-btn').forEach(b => b.onclick = () => showDeleteConfirm(b.dataset.id, b.dataset.name));
    document.querySelectorAll('.perm-delete-btn').forEach(b => b.onclick = () => showPermDeleteConfirm(b.dataset.id, b.dataset.name));

    // Checkbox logic
    document.getElementById('select-all-clients')?.addEventListener('change', (e) => {
        const pageCheckboxes = document.querySelectorAll('.client-checkbox');
        pageCheckboxes.forEach(cb => {
            cb.checked = e.target.checked;
            if (e.target.checked) selectedClientIds.add(cb.dataset.id);
            else selectedClientIds.delete(cb.dataset.id);
        });
        updateBulkActionsBar();
    });

    document.querySelectorAll('.client-checkbox').forEach(cb => {
        cb.onchange = (e) => {
            if (e.target.checked) selectedClientIds.add(cb.dataset.id);
            else {
                selectedClientIds.delete(cb.dataset.id);
                const selectAll = document.getElementById('select-all-clients');
                if (selectAll) selectAll.checked = false;
            }
            updateBulkActionsBar();
        };
    });
}

// =====================
// Form Logic
// =====================
function bindFormEvents() {
    document.getElementById('close-form-btn')?.addEventListener('click', closeForm);
    document.getElementById('cancel-form-btn')?.addEventListener('click', closeForm);
    document.getElementById('save-client-btn')?.addEventListener('click', saveClient);
}

async function openForm(clientId = null) {
    const { Toast } = window.AdminUtils;
    const container = document.getElementById('client-form-container');
    const formTitle = document.getElementById('form-title');
    const saveBtn = document.getElementById('save-client-btn');
    const isEdit = !!clientId;

    // Refresh services
    await loadServicesForClients();

    if (allServicesForClients.length === 0) {
        Toast.error('No Services', 'Please add services in the master table first');
        return;
    }

    // Reset form
    document.getElementById('edit-client-id').value = '';
    document.getElementById('converting-inquiry-id').value = '';
    document.getElementById('client-fname').value = '';
    document.getElementById('client-lname').value = '';
    document.getElementById('client-phone').value = '';
    document.getElementById('client-email').value = '';
    document.getElementById('client-notes').value = '';
    serviceFees = {};

    let client = null;
    if (isEdit) {
        const { data, error } = await window.supabaseClient.from('clients').select('*').eq('id', clientId).single();
        if (error || !data) {
            Toast.error('Error', 'Could not load client data');
            return;
        }
        client = data;

        document.getElementById('edit-client-id').value = client.id;
        document.getElementById('client-fname').value = client.first_name || '';
        document.getElementById('client-lname').value = client.last_name || '';
        document.getElementById('client-phone').value = client.phone || '';
        document.getElementById('client-email').value = client.email || '';
        document.getElementById('client-notes').value = client.notes || '';
        serviceFees = client.service_fees || {};
    }

    // Render services checkboxes
    renderServicesCheckboxes(client?.services || [], serviceFees);
    updateFeeBreakdown();

    formTitle.textContent = isEdit ? 'Edit Client' : 'Add Client';
    saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Update' : 'Save'} Client`;
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
}

function closeForm() {
    document.getElementById('client-form-container').style.display = 'none';
}

function renderServicesCheckboxes(selected = [], fees = {}) {
    const container = document.getElementById('client-services-list');

    if (!allServicesForClients || allServicesForClients.length === 0) {
        container.innerHTML = `<p class="text-muted p-2">No services available.</p>`;
        return;
    }

    container.innerHTML = allServicesForClients.map(svc => {
        const code = svc.service_code;
        const isChecked = selected.includes(code);
        return `
            <label class="checkbox-item ${isChecked ? 'checked' : ''}">
                <input type="checkbox" name="client-services" value="${code}" ${isChecked ? 'checked' : ''}>
                <i class="fa-solid fa-check"></i>
                <span>${code} - ${svc.name || svc.service_name || code}</span>
            </label>
        `;
    }).join('');

    container.querySelectorAll('input').forEach(cb => {
        cb.onchange = () => {
            cb.closest('.checkbox-item').classList.toggle('checked', cb.checked);
            updateFeeBreakdown();
        };
    });
}

function updateFeeBreakdown() {
    const breakdown = document.getElementById('fee-breakdown');
    const totalRow = document.getElementById('fee-total-row');
    const totalEl = document.getElementById('fee-total');
    const selectedServices = Array.from(document.querySelectorAll('input[name="client-services"]:checked'));

    if (selectedServices.length === 0) {
        breakdown.innerHTML = `<p class="text-muted">Select services to see fee breakdown</p>`;
        totalRow.style.display = 'none';
        return;
    }

    let html = '';
    let total = 0;

    selectedServices.forEach(cb => {
        const code = cb.value;
        const service = allServicesForClients.find(s => s.service_code === code);
        const baseFee = service?.base_price || service?.fee || 0;
        const customFee = serviceFees[code] ?? baseFee;

        html += `
            <div class="fee-item">
                <div class="fee-item-name">${code}</div>
                <div class="fee-item-input">
                    <input type="number" class="fee-input" data-code="${code}" value="${customFee}" min="0">
                </div>
            </div>
        `;
        total += customFee;
    });

    breakdown.innerHTML = html;
    totalRow.style.display = 'flex';
    totalEl.innerHTML = `<i class="fa-solid fa-indian-rupee-sign"></i>${formatNumber(total)}`;

    // Bind fee input changes
    breakdown.querySelectorAll('.fee-input').forEach(input => {
        input.addEventListener('input', () => {
            const code = input.dataset.code;
            serviceFees[code] = parseInt(input.value) || 0;
            recalculateTotal();
        });
    });
}

function recalculateTotal() {
    const totalEl = document.getElementById('fee-total');
    const selectedServices = Array.from(document.querySelectorAll('input[name="client-services"]:checked'));

    let total = 0;
    selectedServices.forEach(cb => {
        const code = cb.value;
        const service = allServicesForClients.find(s => s.service_code === code);
        const baseFee = service?.base_price || service?.fee || 0;
        total += serviceFees[code] ?? baseFee;
    });

    totalEl.innerHTML = `<i class="fa-solid fa-indian-rupee-sign"></i>${formatNumber(total)}`;
}

async function saveClient() {
    const { Toast } = window.AdminUtils;
    const saveBtn = document.getElementById('save-client-btn');
    const editId = document.getElementById('edit-client-id').value;
    const convertingInquiryId = document.getElementById('converting-inquiry-id').value;
    const isEdit = !!editId;

    const fname = document.getElementById('client-fname').value.trim();
    const lname = document.getElementById('client-lname').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const email = document.getElementById('client-email').value.trim();
    const notes = document.getElementById('client-notes').value.trim();

    const services = Array.from(document.querySelectorAll('input[name="client-services"]:checked')).map(cb => cb.value);

    // Calculate total
    let totalFee = 0;
    services.forEach(code => {
        const service = allServicesForClients.find(s => s.service_code === code);
        const baseFee = service?.base_price || service?.fee || 0;
        totalFee += serviceFees[code] ?? baseFee;
    });

    // Validation
    if (!fname) { Toast.error('Required', 'First name required'); return; }
    if (!phone || phone.length !== 10) { Toast.error('Required', 'Valid 10-digit phone required'); return; }
    if (services.length === 0) { Toast.error('Required', 'Select at least one service'); return; }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        const clientData = {
            first_name: fname,
            last_name: lname || null,
            phone,
            email: email || null,
            services,
            service_fees: serviceFees,
            total_fee: totalFee,
            notes: notes || null
        };

        if (isEdit) {
            const { error } = await window.supabaseClient.from('clients').update(clientData).eq('id', editId);
            if (error) throw error;
            Toast.success('Updated', 'Client updated successfully');
        } else {
            // Generate new client ID - Find first available gap in sequence
            const { data: allClients } = await window.supabaseClient
                .from('clients')
                .select('client_id')
                .order('client_id', { ascending: true });

            // Extract all existing numbers
            const usedNumbers = new Set();
            if (allClients?.length > 0) {
                allClients.forEach(c => {
                    const m = c.client_id?.match(/CL-ACS-(\d+)/);
                    if (m) usedNumbers.add(parseInt(m[1]));
                });
            }

            // Find first available number (gap or next)
            let nextNum = 1;
            while (usedNumbers.has(nextNum)) {
                nextNum++;
            }
            const newId = `CL-ACS-${String(nextNum).padStart(3, '0')}`;


            const { error } = await window.supabaseClient.from('clients').insert({
                ...clientData,
                client_id: newId,
                status: 'ACTIVE',
                converted_from: convertingInquiryId || null
            });
            if (error) throw error;
            Toast.success('Added', 'Client added successfully');

            // Update inquiry status if converting
            if (convertingInquiryId) {
                await window.supabaseClient
                    .from('inquiries')
                    .update({ status: 'Converted' })
                    .eq('id', convertingInquiryId);
            }
        }

        closeForm();
        await loadClients();
    } catch (err) {
        console.error(err);
        Toast.error('Error', err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Update' : 'Save'} Client`;
    }
}

// =====================
// Prefill from Inquiry Conversion
// =====================
function checkPrefill() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('prefill') === '1') {
        const name = params.get('name') || '';
        const phone = params.get('phone') || '';
        const email = params.get('email') || '';
        const services = params.get('services')?.split(',').filter(s => s) || [];
        const inquiryId = params.get('inquiry_id') || '';
        const readableId = params.get('readable_id') || '';

        // Open form and prefill
        openForm().then(() => {
            // Split name into first/last
            const nameParts = name.trim().split(' ');
            document.getElementById('client-fname').value = nameParts[0] || '';
            document.getElementById('client-lname').value = nameParts.slice(1).join(' ') || '';
            document.getElementById('client-phone').value = phone;
            document.getElementById('client-email').value = email;
            document.getElementById('converting-inquiry-id').value = inquiryId;

            if (readableId) {
                const notesEl = document.getElementById('client-notes');
                if (notesEl) notesEl.value = `Inquiry ID: ${readableId}`;
            }

            // Check the services
            services.forEach(code => {
                const cb = document.querySelector(`input[name="client-services"][value="${code}"]`);
                if (cb) {
                    cb.checked = true;
                    cb.closest('.checkbox-item')?.classList.add('checked');
                }
            });

            updateFeeBreakdown();
        });

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// =====================
// Soft Delete & Recovery Logic
// =====================
function bindDeleteEvents() {
    document.getElementById('close-delete-modal')?.addEventListener('click', hideDeleteConfirm);
    document.getElementById('cancel-delete-btn')?.addEventListener('click', hideDeleteConfirm);
    document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDelete);

    // Permanent Delete events
    document.getElementById('close-perm-delete-modal')?.addEventListener('click', hidePermDeleteConfirm);
    document.getElementById('cancel-perm-delete-btn')?.addEventListener('click', hidePermDeleteConfirm);
    document.getElementById('confirm-perm-delete-btn')?.addEventListener('click', confirmPermDelete);
    document.getElementById('perm-delete-confirm-input')?.addEventListener('input', (e) => {
        const btn = document.getElementById('confirm-perm-delete-btn');
        btn.disabled = e.target.value !== 'CONFIRM';
    });

    // Restore events
    document.getElementById('close-restore-modal')?.addEventListener('click', hideRestoreConfirm);
    document.getElementById('cancel-restore-btn')?.addEventListener('click', hideRestoreConfirm);
    document.getElementById('confirm-restore-btn')?.addEventListener('click', confirmRestore);
}

function showDeleteConfirm(id, name) {
    deleteTargetId = id;
    document.getElementById('delete-client-name').textContent = name;
    document.getElementById('delete-modal').classList.add('active');
}

function hideDeleteConfirm() {
    document.getElementById('delete-modal').classList.remove('active');
    deleteTargetId = null;
}

async function confirmDelete() {
    if (!deleteTargetId) return;
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('confirm-delete-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    try {
        const { error } = await window.supabaseClient
            .from('clients')
            .update({
                status: 'INACTIVE'
            })
            .eq('id', deleteTargetId);

        if (error) throw error;

        Toast.success('Deactivated', 'Client moved to inactive list');
        hideDeleteConfirm();
        await loadClients();
    } catch (e) {
        console.error('Deactivation failed:', e);
        Toast.error('Error', 'Failed to deactivate client');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Deactivate';
    }
}

function showPermDeleteConfirm(id, name) {
    deleteTargetId = id;
    document.getElementById('perm-delete-name').textContent = name;
    document.getElementById('perm-delete-confirm-input').value = '';
    document.getElementById('confirm-perm-delete-btn').disabled = true;
    document.getElementById('perm-delete-modal').classList.add('active');
}

function hidePermDeleteConfirm() {
    document.getElementById('perm-delete-modal').classList.remove('active');
    deleteTargetId = null;
}

async function confirmPermDelete() {
    if (!deleteTargetId) return;
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('confirm-perm-delete-btn');
    const name = document.getElementById('perm-delete-name').textContent;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cleaning Up...';

    try {
        // Cascade delete child records manually
        await window.supabaseClient.from('receipts').delete().eq('client_id', deleteTargetId);
        await window.supabaseClient.from('payments').delete().eq('client_id', deleteTargetId);

        const { error } = await window.supabaseClient.from('clients').delete().eq('id', deleteTargetId);
        if (error) throw error;

        Toast.success('Forever Deleted', `${name} and all associated records removed.`);
        hidePermDeleteConfirm();
        await loadClients();
    } catch (e) {
        console.error('Permanent delete failed:', e);
        Toast.error('Error', 'Failed to permanently delete client');
        btn.disabled = false;
        btn.innerHTML = 'Delete Forever';
    }
}

function showRestoreConfirm(id, name) {
    deleteTargetId = id;
    document.getElementById('restore-client-name').textContent = name;
    document.getElementById('restore-modal').classList.add('active');
}

function hideRestoreConfirm() {
    document.getElementById('restore-modal').classList.remove('active');
    deleteTargetId = null;
}

async function confirmRestore() {
    if (!deleteTargetId) return;
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('confirm-restore-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Restoring...';

    try {
        const { error } = await window.supabaseClient
            .from('clients')
            .update({
                status: 'ACTIVE'
            })
            .eq('id', deleteTargetId);

        if (error) throw error;

        Toast.success('Restored', 'Client is now active again.');
        hideRestoreConfirm();
        await loadClients();
    } catch (e) {
        console.error('Reactivation failed:', e);
        Toast.error('Error', 'Failed to reactivate client');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Restore Client';
    }
}

async function reactivateClient(id, name) {
    showRestoreConfirm(id, name);
}

async function bulkDeleteClients() {
    if (selectedClientIds.size === 0) return;

    const { Modal, Toast } = window.AdminUtils;
    const count = selectedClientIds.size;

    Modal.confirm(
        'Deactivate Clients',
        `Are you sure you want to deactivate ${count} selected clients? They will be moved to the inactive list.`,
        async () => {
            try {
                const ids = Array.from(selectedClientIds);
                const { error } = await window.supabaseClient
                    .from('clients')
                    .update({ status: 'INACTIVE' })
                    .in('id', ids);

                if (error) throw error;

                selectedClientIds.clear();
                Toast.success('Deactivated', `${count} clients moved to inactive list.`);
                await loadClients();
            } catch (e) {
                console.error(e);
                Toast.error('Error', 'Bulk deactivation failed');
            }
        }
    );
}

// =====================
// Helpers
// =====================
function formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(num);
}

