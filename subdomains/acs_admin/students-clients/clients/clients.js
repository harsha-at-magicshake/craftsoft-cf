// Clients Module (Converted from Service Inquiries)
let allClients = [];
let allServicesForClients = [];
let deleteTargetId = null;
let serviceFees = {}; // Store per-service fees { serviceCode: fee }
let selectedClientIds = new Set();

// Pagination State
let currentPage = 1;
const itemsPerPage = 10;



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

    await loadServicesForClients();
    await loadClients();

    bindFormEvents();
    bindDeleteEvents();

    document.getElementById('add-client-btn')?.addEventListener('click', () => openForm());
    document.getElementById('client-search')?.addEventListener('input', (e) => filterClients(e.target.value));
    document.getElementById('bulk-delete-btn')?.addEventListener('click', bulkDeleteClients);


    // Check for prefill from inquiry conversion
    checkPrefill();
});

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
    const tableContainer = document.getElementById('clients-table-container');
    const cardsContainer = document.getElementById('clients-cards');

    // Show spinners if containers exist
    if (tableContainer) tableContainer.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading clients...</div>';

    try {
        const { data, error } = await window.supabaseClient
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allClients = data || [];
        renderClients(allClients);
    } catch (e) {
        console.error('Error loading clients:', e);
        if (tableContainer) tableContainer.innerHTML = `<p class="text-error">Failed to load clients.</p>`;
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
                <th>Phone</th>
                <th>Services</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>`;

    pageClients.forEach(c => {
        const fullName = `${c.first_name} ${c.last_name || ''}`.trim();
        const servicesList = (c.services || []).join(', ') || '-';
        const statusClass = c.status === 'COMPLETED' ? 'status-converted' :
            c.status === 'ON-HOLD' ? 'status-demo' : 'status-new';

        tableHtml += `
            <tr>
                <td><input type="checkbox" class="client-checkbox" data-id="${c.id}" ${selectedClientIds.has(c.id) ? 'checked' : ''}></td>
                <td><span class="badge badge-primary">${c.client_id || '-'}</span></td>
                <td>${fullName}</td>
                <td>${c.phone || '-'}</td>
                <td><span class="services-tags">${servicesList}</span></td>
                <td>₹${formatNumber(c.total_fee || 0)}</td>
                <td><span class="status-badge ${statusClass}">${c.status || 'ACTIVE'}</span></td>
                <td class="actions-cell">
                    <button class="btn-icon edit-btn" data-id="${c.id}" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon whatsapp" data-phone="${c.phone}" title="WhatsApp">
                        <i class="fa-brands fa-whatsapp"></i>
                    </button>
                    <button class="btn-icon delete" data-id="${c.id}" data-name="${fullName}" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
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
        const statusClass = c.status === 'COMPLETED' ? 'status-converted' :
            c.status === 'ON-HOLD' ? 'status-demo' : 'status-new';

        return `
            <div class="premium-card" data-id="${c.id}">
                <div class="card-header">
                    <div class="card-header-left">
                        <input type="checkbox" class="client-checkbox" data-id="${c.id}" ${selectedClientIds.has(c.id) ? 'checked' : ''}>
                        <span class="card-id-badge">${c.client_id || 'CL-ACS-XXX'}</span>
                    </div>
                    <span class="status-badge ${statusClass}">${c.status || 'ACTIVE'}</span>
                </div>
                <div class="card-body">
                    <h4 class="card-name">${fullName}</h4>
                    <div class="card-info-row">
                        <span class="card-info-item"><i class="fa-solid fa-phone"></i> ${c.phone || '-'}</span>
                    </div>
                    <div class="card-info-row">
                        <span class="card-info-item"><i class="fa-solid fa-wrench"></i> ${servicesList}</span>
                    </div>
                    <div class="card-info-row fee-row">
                        <span class="card-info-item"><i class="fa-solid fa-indian-rupee-sign"></i> ₹${formatNumber(c.total_fee || 0)}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-outline btn-sm edit-btn" data-id="${c.id}"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="btn btn-outline btn-sm whatsapp" data-phone="${c.phone}"><i class="fa-brands fa-whatsapp"></i> Chat</button>
                    <button class="btn btn-danger-outline btn-sm delete" data-id="${c.id}" data-name="${fullName}"><i class="fa-solid fa-trash"></i>Delete</button>
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
    document.querySelectorAll('.whatsapp').forEach(b => b.onclick = () => {
        const p = b.dataset.phone.replace(/\D/g, '');
        window.open(`https://wa.me/91${p}`, '_blank');
    });
    document.querySelectorAll('.delete').forEach(b => b.onclick = () => showDeleteConfirm(b.dataset.id, b.dataset.name));

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
    totalEl.textContent = `₹${formatNumber(total)}`;

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

    totalEl.textContent = `₹${formatNumber(total)}`;
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
            // Generate new client ID
            const { data: maxData } = await window.supabaseClient
                .from('clients')
                .select('client_id')
                .order('client_id', { ascending: false })
                .limit(1);

            let nextNum = 1;
            if (maxData?.length > 0 && maxData[0].client_id) {
                const m = maxData[0].client_id.match(/CL-ACS-(\d+)/);
                if (m) nextNum = parseInt(m[1]) + 1;
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

        // Open form and prefill
        openForm().then(() => {
            // Split name into first/last
            const nameParts = name.trim().split(' ');
            document.getElementById('client-fname').value = nameParts[0] || '';
            document.getElementById('client-lname').value = nameParts.slice(1).join(' ') || '';
            document.getElementById('client-phone').value = phone;
            document.getElementById('client-email').value = email;
            document.getElementById('converting-inquiry-id').value = inquiryId;

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
// Delete Logic
// =====================
function bindDeleteEvents() {
    document.getElementById('cancel-delete-btn')?.addEventListener('click', hideDeleteConfirm);
    document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDelete);
}

function showDeleteConfirm(id, name) {
    deleteTargetId = id;
    document.getElementById('delete-name').textContent = name;
    document.getElementById('delete-overlay').style.display = 'flex';
}

function hideDeleteConfirm() {
    document.getElementById('delete-overlay').style.display = 'none';
}

async function confirmDelete() {
    if (!deleteTargetId) return;
    const { Toast } = window.AdminUtils;
    try {
        const { error } = await window.supabaseClient.from('clients').delete().eq('id', deleteTargetId);
        if (error) throw error;

        selectedClientIds.delete(deleteTargetId);
        hideDeleteConfirm();
        await loadClients();
        Toast.success('Deleted', 'Client removed');
    } catch (e) {
        console.error(e);
        Toast.error('Error', 'Failed to delete');
    }
}

async function bulkDeleteClients() {
    if (selectedClientIds.size === 0) return;
    const { Toast } = window.AdminUtils;

    if (!confirm(`Are you sure you want to delete ${selectedClientIds.size} clients?`)) return;

    const btn = document.getElementById('bulk-delete-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

    try {
        const ids = Array.from(selectedClientIds);
        const { error } = await window.supabaseClient.from('clients').delete().in('id', ids);
        if (error) throw error;

        selectedClientIds.clear();
        Toast.success('Deleted', 'Selected clients removed');
        await loadClients();
    } catch (e) {
        console.error(e);
        Toast.error('Error', 'Bulk delete failed');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Selected';
    }
}

// =====================
// Helpers
// =====================
function formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(num);
}
