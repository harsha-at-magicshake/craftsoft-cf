let allInquiries = [];
let allCoursesForInquiries = [];
let allServicesForInquiries = [];
let inquiryToDelete = null;

// Pagination State
let currentPage = 1;
const itemsPerPage = window.innerWidth <= 1250 ? 5 : 10;
let selectedInquiries = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inquiries: DOMContentLoaded started');
    try {
        // 1. Check Auth
        const session = await window.supabaseConfig.getSession();
        if (!session) {
            console.log('Inquiries: No session, redirecting to login');
            window.location.href = '/';
            return;
        }

        // 2. Initialize Sidebar & Header (CRITICAL for UI)
        if (window.AdminSidebar) {
            console.log('Inquiries: Initializing sidebar');
            window.AdminSidebar.init('inquiries', '/');
        }

        const headerCont = document.getElementById('header-container');
        if (headerCont && window.AdminHeader) {
            console.log('Inquiries: Rendering header');
            headerCont.innerHTML = window.AdminHeader.render('Inquiries');
        }

        const admin = await window.Auth.getCurrentAdmin();
        if (admin && window.AdminSidebar && window.AdminSidebar.renderAccountPanel) {
            console.log('Inquiries: Rendering account panel');
            await window.AdminSidebar.renderAccountPanel(session, admin);
        }

        // 3. Load Stats & Data
        console.log('Inquiries: Loading stats');
        initializeStats();

        console.log('Inquiries: Loading master data');
        await Promise.all([loadCourses(), loadServices()]);

        console.log('Inquiries: Loading inquiries');
        await loadInquiries();

        // 4. Bind UI Events
        console.log('Inquiries: Binding events');
        bindFormEvents();
        bindDeleteEvents();
        bindFilterEvents();

        console.log('Inquiries: Initialization complete');
    } catch (error) {
        console.error('CRITICAL: Inquiries initialization failed:', error);
        const content = document.getElementById('inquiries-content');
        if (content) {
            content.innerHTML = `<div class="p-4 text-center text-danger">
                <i class="fa-solid fa-circle-exclamation mb-2" style="font-size: 2rem;"></i>
                <p>Failed to initialize page. Error: ${error.message}</p>
                <button class="btn btn-primary mt-2" onclick="location.reload()">Retry</button>
            </div>`;
        }
    }
});

function handleFilter() {
    const q = document.getElementById('inquiry-search')?.value.toLowerCase() || '';
    const type = document.getElementById('filter-type')?.value || 'all';
    const sort = document.getElementById('sort-order')?.value || 'newest';

    let filtered = allInquiries.filter(inq => {
        const nameMatch = inq.name?.toLowerCase().includes(q) || (inq.inquiry_id || '').toLowerCase().includes(q);
        const phoneMatch = inq.phone?.toLowerCase().includes(q);
        const courseMatch = (inq.courses || []).some(c => c.toLowerCase().includes(q));
        const searchMatch = !q || nameMatch || phoneMatch || courseMatch;

        const isSrv = (inq.courses || []).some(c => c && c.startsWith('S-'));
        const typeMatch = type === 'all' || (type === 'service' && isSrv) || (type === 'course' && !isSrv);

        return searchMatch && typeMatch;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sort === 'name-asc') return (a.name || '').localeCompare(b.name || '');
        if (sort === 'name-desc') return (b.name || '').localeCompare(a.name || '');
        return 0;
    });

    currentPage = 1;
    renderInquiries(filtered);
}

function bindFilterEvents() {
    document.getElementById('inquiry-search')?.addEventListener('input', handleFilter);
    document.getElementById('filter-type')?.addEventListener('change', handleFilter);
    document.getElementById('sort-order')?.addEventListener('change', handleFilter);
    bindTypeToggle();
}

async function initializeStats() {
    window.AdminUtils.StatsHeader.render('stats-container', [
        { label: 'Total Inquiries', value: 0, icon: 'fa-solid fa-person-circle-question', color: 'var(--primary-500)' },
        { label: 'Today\'s Leads', value: 0, icon: 'fa-solid fa-rss', color: 'var(--error)' },
        { label: 'Recent (7 Days)', value: 0, icon: 'fa-solid fa-calendar-week', color: 'var(--info)' }
    ]);

    try {
        const today = new Date().toISOString().split('T')[0];
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const lastWeekISO = lastWeek.toISOString().split('T')[0];

        const [totalCount, todayCount, weekCount] = await Promise.all([
            window.supabaseClient.from('inquiries').select('id', { count: 'exact', head: true }),
            window.supabaseClient.from('inquiries').select('id', { count: 'exact', head: true }).gte('created_at', today),
            window.supabaseClient.from('inquiries').select('id', { count: 'exact', head: true }).gte('created_at', lastWeekISO)
        ]);

        window.AdminUtils.StatsHeader.render('stats-container', [
            { label: 'Total Inquiries', value: totalCount.count || 0, icon: 'fa-solid fa-person-circle-question', color: 'var(--primary-500)' },
            { label: 'Today\'s Leads', value: todayCount.count || 0, icon: 'fa-solid fa-rss', color: 'var(--error)' },
            { label: 'Recent (7 Days)', value: weekCount.count || 0, icon: 'fa-solid fa-calendar-week', color: 'var(--info)' }
        ]);
    } catch (err) {
        console.error('Stats load error:', err);
    }
}

async function loadCourses() {
    try {
        const { data, error } = await window.supabaseClient
            .from('courses')
            .select('course_code, course_name')
            .eq('status', 'ACTIVE')
            .order('course_code');
        if (error) throw error;
        allCoursesForInquiries = data || [];
    } catch (e) {
        console.error('Inquiries: Error loading courses:', e);
    }
}

async function loadServices() {
    try {
        const { data, error } = await window.supabaseClient
            .from('services')
            .select('service_code, name')
            .order('service_code');
        if (error) throw error;
        // Filter out legacy non-prefixed codes to avoid confusion with course codes
        allServicesForInquiries = (data || []).filter(s => s.service_code && s.service_code.startsWith('S-'));
    } catch (e) {
        console.error('Inquiries: Error loading services:', e);
    }
}

async function loadInquiries() {
    const content = document.getElementById('inquiries-content');
    if (window.AdminUtils?.Skeleton) {
        window.AdminUtils.Skeleton.show('inquiries-content', 'table', 5);
    }

    try {
        const { data, error } = await window.supabaseClient
            .from('inquiries')
            .select('*')
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;

        allInquiries = data || [];
        renderInquiries(allInquiries);
    } catch (e) {
        console.error('Inquiries: Error loading inquiries:', e);
        if (content) {
            content.innerHTML = '<div class="p-4 text-center text-muted">Error loading data.</div>';
        }
    }
}

function renderInquiries(items) {
    const content = document.getElementById('inquiries-content');
    if (!content) return;

    if (!items || items.length === 0) {
        content.innerHTML = `
            <div class="empty-state py-5 text-center">
                <i class="fa-solid fa-phone-volume fa-3x text-muted mb-3"></i>
                <h3>No inquiries found</h3>
                <p>All incoming inquiries will appear here.</p>
            </div>`;
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = items.slice(start, start + itemsPerPage);

    const tableHTML = `
        <div class="table-container">
            <table class="inquiries-table">
                <thead>
                    <tr>
                        <th style="width: 40px;">
                            <input type="checkbox" id="select-all-inquiries">
                        </th>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Interest</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedItems.map(inq => {
        // Services always start with 'S-' prefix (e.g., S-GD, S-WEB)
        const isSrv = (inq.courses || []).some(c => c && c.startsWith('S-'));
        const isSelected = selectedInquiries.has(inq.id);
        return `
                        <tr>
                            <td>
                                <input type="checkbox" class="inquiry-checkbox" data-id="${inq.id}" ${isSelected ? 'checked' : ''}>
                            </td>
                            <td><span class="inquiry-id">${inq.inquiry_id || '---'}</span></td>
                            <td><span class="inquiry-name">${inq.name}</span></td>
                            <td><span class="inquiry-phone">${inq.phone}</span></td>
                            <td>
                                <div class="inquiry-courses">
                                    ${(inq.courses || []).map(c => `<span class="course-tag">${c}</span>`).join('')}
                                </div>
                            </td>
                            <td>${getStatusBadge(inq.status || 'New')}</td>
                            <td>
                                <div class="action-btns">
                                    <button class="action-btn edit-btn" data-id="${inq.id}"><i class="fa-solid fa-pen"></i></button>
                                    <button class="action-btn whatsapp btn-wa-trigger" data-name="${inq.name}" data-phone="${inq.phone}"><i class="fa-brands fa-whatsapp"></i></button>
                                    <button class="action-btn convert" data-id="${inq.id}" title="${isSrv ? 'Convert to Client' : 'Convert to Student'}"><i class="fa-solid fa-${isSrv ? 'wrench' : 'user-graduate'}"></i></button>
                                    <button class="action-btn delete" data-id="${inq.id}" data-name="${inq.name}"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    const cardsHTML = `
        <div class="inquiry-cards">
            ${paginatedItems.map(inq => {
        // Services always start with 'S-' prefix
        const isSrv = (inq.courses || []).some(c => c && c.startsWith('S-'));
        const isSelected = selectedInquiries.has(inq.id);
        return `
                <div class="inquiry-card">
                    <div class="inquiry-card-header">
                        <div style="display: flex; gap: 0.75rem; align-items: center;">
                            <input type="checkbox" class="inquiry-checkbox" data-id="${inq.id}" ${isSelected ? 'checked' : ''}>
                            <span class="inquiry-card-id">${inq.inquiry_id || '---'}</span>
                        </div>
                        ${getStatusBadge(inq.status || 'New')}
                    </div>
                    <div class="inquiry-card-body">
                        <h4 class="inquiry-card-name">${inq.name}</h4>
                        <div class="inquiry-card-info">
                            <span><i class="fa-solid fa-phone"></i> ${inq.phone}</span>
                            <div class="inquiry-courses">
                                ${(inq.courses || []).map(c => `<span class="course-tag">${c}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="inquiry-card-actions">
                        <button class="action-btn edit-btn" data-id="${inq.id}"><i class="fa-solid fa-pen"></i></button>
                        <button class="action-btn whatsapp btn-wa-trigger" data-name="${inq.name}" data-phone="${inq.phone}"><i class="fa-brands fa-whatsapp"></i></button>
                        <button class="action-btn convert" data-id="${inq.id}" title="${isSrv ? 'Convert to Client' : 'Convert to Student'}"><i class="fa-solid fa-${isSrv ? 'wrench' : 'user-graduate'}"></i></button>
                        <button class="action-btn delete" data-id="${inq.id}" data-name="${inq.name}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
    }).join('')}
        </div>
    `;

    const footerHTML = `
        <div class="table-footer">
            <span>Total Inquiries: <strong>${items.length}</strong></span>
        </div>
    `;

    content.innerHTML = tableHTML + cardsHTML + footerHTML;

    // Render pagination
    window.AdminUtils.Pagination.render('pagination-container', items.length, currentPage, itemsPerPage, (page) => {
        currentPage = page;
        renderInquiries(allInquiries);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    bindTableActions();
    bindBulkActions();
}

function bindBulkActions() {
    const selectAll = document.getElementById('select-all-inquiries');
    const checkboxes = document.querySelectorAll('.inquiry-checkbox');
    const bulkBar = document.getElementById('bulk-actions-container');
    const selectedCount = document.getElementById('selected-count');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

    if (selectAll) {
        selectAll.onchange = (e) => {
            const start = (currentPage - 1) * itemsPerPage;
            const currentItems = allInquiries.slice(start, start + itemsPerPage);
            currentItems.forEach(inq => {
                if (e.target.checked) selectedInquiries.add(inq.id);
                else selectedInquiries.delete(inq.id);
            });
            renderInquiries(allInquiries);
            updateBulkBar();
        };

        // Update select all state
        const start = (currentPage - 1) * itemsPerPage;
        const currentItems = allInquiries.slice(start, start + itemsPerPage);
        const allSelected = currentItems.length > 0 && currentItems.every(inq => selectedInquiries.has(inq.id));
        selectAll.checked = allSelected;
    }

    checkboxes.forEach(cb => {
        cb.onchange = (e) => {
            const id = cb.dataset.id;
            if (e.target.checked) selectedInquiries.add(id);
            else selectedInquiries.delete(id);
            updateBulkBar();

            // Update select all state without full re-render
            if (selectAll) {
                const start = (currentPage - 1) * itemsPerPage;
                const currentItems = allInquiries.slice(start, start + itemsPerPage);
                selectAll.checked = currentItems.every(inq => selectedInquiries.has(inq.id));
            }
        };
    });

    if (bulkDeleteBtn) {
        bulkDeleteBtn.onclick = async () => {
            if (selectedInquiries.size === 0) return;

            window.AdminUtils.Modal.confirm(
                'Bulk Delete',
                `Are you sure you want to delete ${selectedInquiries.size} selected inquiries?`,
                async () => {
                    try {
                        const ids = Array.from(selectedInquiries);
                        await window.supabaseClient
                            .from('inquiries')
                            .update({ deleted_at: new Date().toISOString() })
                            .in('id', ids);

                        window.AdminUtils.Toast.success('Deleted', `${ids.length} inquiries removed`);
                        selectedInquiries.clear();
                        updateBulkBar();
                        await loadInquiries();
                    } catch (e) {
                        console.error(e);
                        window.AdminUtils.Toast.error('Error', 'Failed to delete inquiries');
                    }
                }
            );
        };
    }

    const bulkCancelBtn = document.getElementById('bulk-cancel-btn');
    if (bulkCancelBtn) {
        bulkCancelBtn.onclick = () => {
            selectedInquiries.clear();
            const selectAll = document.getElementById('select-all-inquiries');
            if (selectAll) selectAll.checked = false;
            checkboxes.forEach(cb => cb.checked = false);
            updateBulkBar();
        };
    }

    function updateBulkBar() {
        if (bulkBar && selectedCount) {
            if (selectedInquiries.size > 0) {
                bulkBar.style.display = 'block';
                selectedCount.textContent = selectedInquiries.size;
            } else {
                bulkBar.style.display = 'none';
            }
        }
    }

    updateBulkBar();
}

function getStatusBadge(status) {
    const s = status ? status.toLowerCase() : 'new';
    let cls = 'status-new';
    if (s.includes('contact')) cls = 'status-contacted';
    if (s.includes('demo')) cls = 'status-demo';
    if (s.includes('convert')) cls = 'status-converted';
    if (s.includes('close')) cls = 'status-closed';
    if (s.includes('gud')) cls = 'status-gud';

    return `<span class="status-badge ${cls}">${status || 'New'}</span>`;
}

function bindTableActions() {
    document.querySelectorAll('.edit-btn').forEach(b => b.onclick = () => openForm(true, b.dataset.id));

    // Send Message trigger
    document.querySelectorAll('.btn-wa-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.AdminWaModal) {
                window.AdminWaModal.show(btn.dataset.name, btn.dataset.phone);
            }
        });
    });

    document.querySelectorAll('.convert').forEach(b => b.onclick = () => convertToStudent(b.dataset.id));
    document.querySelectorAll('.delete').forEach(b => b.onclick = () => showDeleteConfirm(b.dataset.id, b.dataset.name));
}

function bindTypeToggle() {
    document.querySelectorAll('input[name="inquiry-type"]').forEach(radio => {
        radio.onchange = () => {
            const isService = radio.value === 'service';
            const label = document.getElementById('interest-label');
            const courseFields = document.getElementById('course-only-fields');

            if (label) label.innerHTML = isService ? 'Interested Services <span class="required">*</span>' : 'Interested Courses <span class="required">*</span>';
            if (courseFields) courseFields.style.display = isService ? 'none' : 'block';

            renderCheckboxes(isService ? allServicesForInquiries : allCoursesForInquiries, isService);
        };
    });
}

function renderCheckboxes(items, isService = false, selected = []) {
    const container = document.getElementById('inquiry-courses-list');
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `<p class="text-muted p-2">No data available.</p>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const code = isService ? item.service_code : item.course_code;
        const isChecked = selected.includes(code);
        return `
            <label class="checkbox-item ${isChecked ? 'checked' : ''}">
                <input type="checkbox" name="inquiry-interests" value="${code}" ${isChecked ? 'checked' : ''}>
                <i class="fa-solid fa-check"></i>
                <span>${code}</span>
            </label>
        `;
    }).join('');

    container.querySelectorAll('input').forEach(cb => {
        cb.onchange = () => cb.closest('.checkbox-item').classList.toggle('checked', cb.checked);
    });
}

function bindFormEvents() {
    document.getElementById('add-inquiry-btn')?.addEventListener('click', () => openForm(false));
    document.getElementById('close-form-btn')?.addEventListener('click', closeForm);
    document.getElementById('cancel-form-btn')?.addEventListener('click', closeForm);
    document.getElementById('save-inquiry-btn')?.addEventListener('click', saveInquiry);

    document.querySelectorAll('input[name="demo-required"]').forEach(r => {
        r.onchange = () => {
            const el = document.querySelector('.demo-fields');
            if (el) el.style.display = r.value === 'yes' ? 'block' : 'none';
        }
    });

    // Phone input with flag transformation
    initPhoneInputComponent('inquiry');
}

// Initialize phone input component with flag transformation
function initPhoneInputComponent(prefix) {
    const codeInput = document.getElementById(`${prefix}-country-code`);
    const flagBtn = document.getElementById(`${prefix}-flag-btn`);

    if (!codeInput || !flagBtn) return;

    const { Validators } = window.AdminUtils;

    // On blur: transform input to flag button
    codeInput.addEventListener('blur', () => {
        const code = codeInput.value.trim();
        if (!code) return;

        const countryInfo = Validators.getFlagForCode(code);
        const flag = countryInfo?.flag || '🌍';
        const displayCode = code.startsWith('+') ? code : `+${code}`;

        flagBtn.querySelector('.flag-emoji').textContent = flag;
        flagBtn.querySelector('.code-text').textContent = displayCode;

        codeInput.style.display = 'none';
        flagBtn.style.display = 'flex';
    });

    // On flag click: transform back to input
    flagBtn.addEventListener('click', () => {
        flagBtn.style.display = 'none';
        codeInput.style.display = 'block';
        codeInput.focus();
        codeInput.select();
    });
}


async function openForm(isEdit = false, id = null) {
    const { Validators } = window.AdminUtils;
    const container = document.getElementById('inquiry-form-container');
    if (!container) return;

    // Reset basics
    document.getElementById('edit-inquiry-id').value = '';
    document.getElementById('inquiry-name').value = '';
    document.getElementById('inquiry-phone').value = '';
    document.getElementById('inquiry-email').value = '';
    document.getElementById('inquiry-notes').value = '';

    // Reset course specific basics
    if (document.getElementById('inquiry-source')) document.getElementById('inquiry-source').value = 'Walk-in';
    if (document.getElementById('inquiry-status')) document.getElementById('inquiry-status').value = 'New';
    if (document.getElementById('inquiry-demo-date')) document.getElementById('inquiry-demo-date').value = '';
    if (document.getElementById('inquiry-demo-time')) document.getElementById('inquiry-demo-time').value = '';

    document.querySelector('input[name="inquiry-type"][value="course"]').checked = true;
    document.querySelector('input[name="demo-required"][value="no"]').checked = true;

    const demoFields = document.querySelector('.demo-fields');
    if (demoFields) demoFields.style.display = 'none';

    const courseOnly = document.getElementById('course-only-fields');
    if (courseOnly) courseOnly.style.display = 'block';

    let selected = [];

    // Enable/Disable type toggle based on mode
    document.querySelectorAll('input[name="inquiry-type"]').forEach(r => r.disabled = isEdit);

    if (isEdit && id) {
        document.getElementById('form-title').textContent = 'Edit Inquiry';
        const { data, error } = await window.supabaseClient.from('inquiries').select('*').eq('id', id).single();
        if (data) {
            document.getElementById('edit-inquiry-id').value = data.id;
            document.getElementById('inquiry-name').value = data.name;

            // Parse and populate phone fields
            const parsed = Validators.parseStoredPhone(data.phone);
            document.getElementById('inquiry-country-code').value = parsed.code;
            document.getElementById('inquiry-phone').value = parsed.number;

            // Show flag button for existing country code
            const flagBtn = document.getElementById('inquiry-flag-btn');
            const codeInput = document.getElementById('inquiry-country-code');
            const countryInfo = Validators.getFlagForCode(parsed.code);
            flagBtn.querySelector('.flag-emoji').textContent = countryInfo?.flag || '🌍';
            flagBtn.querySelector('.code-text').textContent = parsed.code;
            codeInput.style.display = 'none';
            flagBtn.style.display = 'flex';

            document.getElementById('inquiry-email').value = data.email || '';
            document.getElementById('inquiry-notes').value = data.notes || '';
            selected = data.courses || [];

            // Pre-fill course specific fields
            if (document.getElementById('inquiry-source')) document.getElementById('inquiry-source').value = data.source || 'Walk-in';
            if (document.getElementById('inquiry-status')) document.getElementById('inquiry-status').value = data.status || 'New';

            if (data.demo_required) {
                document.querySelector('input[name="demo-required"][value="yes"]').checked = true;
                if (demoFields) demoFields.style.display = 'block';
                if (document.getElementById('inquiry-demo-date')) document.getElementById('inquiry-demo-date').value = data.demo_date || '';
                if (document.getElementById('inquiry-demo-time')) document.getElementById('inquiry-demo-time').value = data.demo_time || '';
            }

            // Check if service - use the strict 'S-' prefix rule
            const isSrv = selected.some(c => c && c.startsWith('S-'));
            if (isSrv) {
                document.querySelector('input[name="inquiry-type"][value="service"]').checked = true;
                const label = document.getElementById('interest-label');
                if (label) label.innerHTML = 'Interested Services <span class="required">*</span>';
                if (courseOnly) courseOnly.style.display = 'none';
                renderCheckboxes(allServicesForInquiries, true, selected);
            } else {
                const label = document.getElementById('interest-label');
                if (label) label.innerHTML = 'Interested Courses <span class="required">*</span>';
                if (courseOnly) courseOnly.style.display = 'block';
                renderCheckboxes(allCoursesForInquiries, false, selected);
            }
        }
    } else {
        document.getElementById('form-title').textContent = 'Add Inquiry';
        // New inquiry: reset phone fields to default
        document.getElementById('inquiry-country-code').value = '+91';
        document.getElementById('inquiry-country-code').style.display = 'block';
        document.getElementById('inquiry-flag-btn').style.display = 'none';
        renderCheckboxes(allCoursesForInquiries, false);
    }

    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
}


function closeForm() {
    const el = document.getElementById('inquiry-form-container');
    if (el) el.style.display = 'none';
}

async function saveInquiry() {
    const { Toast, Validators } = window.AdminUtils || {};
    const btn = document.getElementById('save-inquiry-btn');
    const editId = document.getElementById('edit-inquiry-id').value;
    const type = document.querySelector('input[name="inquiry-type"]:checked')?.value || 'course';
    const isService = type === 'service';

    const name = document.getElementById('inquiry-name').value.trim();

    // Get phone from split fields
    const countryCode = document.getElementById('inquiry-country-code').value.trim();
    const phoneNumber = document.getElementById('inquiry-phone').value.trim();

    const interests = Array.from(document.querySelectorAll('input[name="inquiry-interests"]:checked')).map(c => c.value);

    if (!name || !phoneNumber || interests.length === 0) {
        if (Toast) Toast.error('Required Fields', 'Please fill name, phone and select one item.');
        return;
    }

    // Format phone for storage using country code from split input
    const formattedPhone = Validators ? Validators.formatPhoneForStorage(phoneNumber, countryCode) : `${countryCode} - ${phoneNumber}`;

    if (btn) btn.disabled = true;

    try {
        const payload = {
            name,
            phone: formattedPhone,
            email: document.getElementById('inquiry-email').value || null,
            courses: interests,
            notes: document.getElementById('inquiry-notes').value || null,
            source: isService ? 'Walk-in' : (document.getElementById('inquiry-source')?.value || 'Walk-in'),
            status: isService ? 'New' : (document.getElementById('inquiry-status')?.value || 'New'),
            demo_required: isService ? false : (document.querySelector('input[name="demo-required"]:checked')?.value === 'yes'),
            demo_date: isService ? null : (document.getElementById('inquiry-demo-date')?.value || null),
            demo_time: isService ? null : (document.getElementById('inquiry-demo-time')?.value || null)
        };


        if (editId) {
            await window.supabaseClient.from('inquiries').update(payload).eq('id', editId);
        } else {
            // New Sequence
            const { data: maxItems } = await window.supabaseClient.from('inquiries').select('inquiry_id').order('inquiry_id', { ascending: false }).limit(1);
            let nextNum = 1;
            if (maxItems?.[0]?.inquiry_id) {
                const m = maxItems[0].inquiry_id.match(/INQ-ACS-(\d+)/);
                if (m) nextNum = parseInt(m[1]) + 1;
            }
            payload.inquiry_id = `INQ-ACS-${String(nextNum).padStart(3, '0')}`;
            await window.supabaseClient.from('inquiries').insert(payload);
        }

        if (Toast) Toast.success('Success', 'Inquiry saved successfully.');
        closeForm();
        await loadInquiries();
    } catch (e) {
        console.error(e);
        if (Toast) Toast.error('Error', e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function convertToStudent(id) {
    try {
        const { data } = await window.supabaseClient.from('inquiries').select('*').eq('id', id).single();
        if (data) {
            // Check if this is a service inquiry (Services start with 'S-')
            const isServiceInquiry = (data.courses || []).some(code => code && code.startsWith('S-'));

            const p = new URLSearchParams({
                prefill: '1',
                name: data.name,
                phone: data.phone,
                email: data.email || '',
                inquiry_id: data.id,
                readable_id: data.inquiry_id || ''
            });

            if (isServiceInquiry) {
                // Redirect to Clients page (for service inquiries)
                p.set('services', (data.courses || []).join(','));
                window.location.href = `/clients/?${p.toString()}`;
            } else {
                // Redirect to Students page (for course inquiries)
                p.set('courses', (data.courses || []).join(','));
                window.location.href = `/students/?${p.toString()}`;
            }
        }
    } catch (e) { console.error(e); }
}

function showDeleteConfirm(id, name) {
    inquiryToDelete = id;
    const el = document.getElementById('delete-name');
    if (el) el.textContent = name;
    const over = document.getElementById('delete-overlay');
    if (over) over.style.display = 'flex';
}

function hideDeleteConfirm() {
    const over = document.getElementById('delete-overlay');
    if (over) over.style.display = 'none';
}

async function confirmDelete() {
    if (!inquiryToDelete) return;
    try {
        await window.supabaseClient
            .from('inquiries')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', inquiryToDelete);
        hideDeleteConfirm();
        await loadInquiries();
    } catch (e) { console.error(e); }
}

function bindDeleteEvents() {
    document.getElementById('cancel-delete-btn')?.addEventListener('click', hideDeleteConfirm);
    document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDelete);
}

