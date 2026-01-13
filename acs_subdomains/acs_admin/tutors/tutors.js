let allTutors = [];
let allCoursesForTutors = [];
let deleteTargetId = null;

// Pagination State
let currentPage = 1;
const itemsPerPage = window.innerWidth <= 1250 ? 5 : 10;
let selectedTutors = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '/';
        return;
    }

    AdminSidebar.init('tutors', '/');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Tutors');
    }

    const admin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, admin);

    await loadCoursesForTutors();
    await loadTutors();

    bindFormEvents();
    bindDeleteEvents();

    document.getElementById('add-tutor-btn')?.addEventListener('click', () => openForm());
    document.getElementById('tutor-search')?.addEventListener('input', (e) => filterTutors(e.target.value));

    // Check for deep links (Spotlight Search)
    const params = new URLSearchParams(window.location.search);
    const deepLinkId = params.get('id');
    if (deepLinkId) {
        // Clear param so refresh doesn't keep opening it
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);

        await openForm(deepLinkId);
    }
});

// =====================
// Data Loading
// =====================
async function loadCoursesForTutors() {
    const { data, error } = await window.supabaseClient
        .from('courses')
        .select('course_code, course_name')
        .eq('status', 'ACTIVE')
        .order('course_code');
    if (!error && data) allCoursesForTutors = data;
}

async function loadTutors() {
    const { Toast, Skeleton } = window.AdminUtils;
    const content = document.getElementById('tutors-content');

    // Show skeleton loading
    if (Skeleton) {
        Skeleton.show('tutors-content', 'table', 5);
    }

    try {
        const { data: tutors, error } = await window.supabaseClient
            .from('tutors')
            .select('*')
            .eq('status', 'ACTIVE')
            .order('tutor_id', { ascending: true });

        if (error) throw error;
        allTutors = tutors || [];
        renderTutorsList(allTutors);
    } catch (error) {
        console.error('Load tutors error:', error);
        content.innerHTML = '<div class="error-state"><i class="fa-solid fa-exclamation-triangle"></i><p>Failed to load tutors.</p></div>';
    }
}

// =====================
// Rendering
// =====================
function renderTutorsList(tutors) {
    const content = document.getElementById('tutors-content');

    if (!tutors || tutors.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-chalkboard-user"></i></div>
                <h3>No tutors yet</h3>
                <p>Click "Add Tutor" to register your first tutor</p>
            </div>`;
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedTutors = tutors.slice(start, start + itemsPerPage);

    content.innerHTML = `
        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th width="40px">
                            <input type="checkbox" id="select-all-tutors">
                        </th>
                        <th width="12%">TUTOR ID</th>
                        <th width="20%">NAME</th>
                        <th width="18%">PHONE</th>
                        <th width="35%">COURSES</th>
                        <th width="15%" class="text-right">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedTutors.map(t => `
                        <tr>
                            <td>
                                <input type="checkbox" class="tutor-checkbox" data-id="${t.id}" ${selectedTutors.has(t.id) ? 'checked' : ''}>
                            </td>
                            <td><span class="cell-badge">${t.tutor_id}</span></td>
                            <td><span class="cell-title">${t.full_name}</span></td>
                            <td><span class="cell-phone">${t.phone}</span></td>
                            <td>
                                <div class="cell-tags">
                                    ${(t.courses || []).map(c => `<span class="glass-tag">${c}</span>`).join('')}
                                </div>
                            </td>
                            <td class="text-right">
                                <div class="cell-actions">
                                    <button class="action-btn edit btn-edit-tutor" data-id="${t.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                                    <a href="https://wa.me/91${t.phone.replace(/\D/g, '')}" target="_blank" class="action-btn whatsapp" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
                                    <button class="action-btn delete btn-delete-tutor" data-id="${t.id}" data-name="${t.full_name}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="data-cards">
            ${paginatedTutors.map(t => `
                <div class="premium-card">
                    <div class="card-header">
                        <div style="display: flex; gap: 0.75rem; align-items: center;">
                            <input type="checkbox" class="tutor-checkbox" data-id="${t.id}" ${selectedTutors.has(t.id) ? 'checked' : ''}>
                            <span class="card-id-badge">${t.tutor_id}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <h4 class="card-name">${t.full_name}</h4>
                        <div class="card-info-row">
                            <span class="card-info-item"><i class="fa-solid fa-phone"></i> ${t.phone}</span>
                            <span class="card-info-item"><i class="fa-solid fa-book-open-reader"></i> ${(t.courses || []).join(', ') || 'No courses'}</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="card-action-btn edit btn-edit-tutor" data-id="${t.id}">
                            <i class="fa-solid fa-pen"></i> <span>Edit</span>
                        </button>
                        <a href="https://wa.me/91${t.phone.replace(/\D/g, '')}" target="_blank" class="card-action-btn whatsapp">
                            <i class="fa-brands fa-whatsapp"></i> <span>WhatsApp</span>
                        </a>
                        <button class="card-action-btn delete btn-delete-tutor" data-id="${t.id}" data-name="${t.full_name}">
                            <i class="fa-solid fa-trash"></i> <span>Delete</span>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="table-footer">
            <span>Total Tutors: <strong>${tutors.length}</strong></span>
        </div>`;

    // Render pagination
    window.AdminUtils.Pagination.render('pagination-container', tutors.length, currentPage, itemsPerPage, (page) => {
        currentPage = page;
        renderTutorsList(allTutors);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.querySelectorAll('.btn-edit-tutor').forEach(btn =>
        btn.addEventListener('click', () => openForm(btn.dataset.id)));
    document.querySelectorAll('.btn-delete-tutor').forEach(btn =>
        btn.addEventListener('click', () => showDeleteConfirm(btn.dataset.id, btn.dataset.name)));

    bindBulkActions();
}

function bindBulkActions() {
    const selectAll = document.getElementById('select-all-tutors');
    const checkboxes = document.querySelectorAll('.tutor-checkbox');
    const bulkBar = document.getElementById('bulk-actions-container');
    const selectedCountText = document.getElementById('selected-count');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

    if (selectAll) {
        selectAll.onchange = (e) => {
            const start = (currentPage - 1) * itemsPerPage;
            const currentItems = allTutors.slice(start, start + itemsPerPage);
            currentItems.forEach(t => {
                if (e.target.checked) selectedTutors.add(t.id);
                else selectedTutors.delete(t.id);
            });
            renderTutorsList(allTutors);
            updateBulkBar();
        };

        const start = (currentPage - 1) * itemsPerPage;
        const currentItems = allTutors.slice(start, start + itemsPerPage);
        const allSelected = currentItems.length > 0 && currentItems.every(t => selectedTutors.has(t.id));
        selectAll.checked = allSelected;
    }

    checkboxes.forEach(cb => {
        cb.onchange = (e) => {
            const id = cb.dataset.id;
            if (e.target.checked) selectedTutors.add(id);
            else selectedTutors.delete(id);
            updateBulkBar();

            if (selectAll) {
                const start = (currentPage - 1) * itemsPerPage;
                const currentItems = allTutors.slice(start, start + itemsPerPage);
                selectAll.checked = currentItems.every(t => selectedTutors.has(t.id));
            }
        };
    });

    if (bulkDeleteBtn) {
        bulkDeleteBtn.onclick = async () => {
            if (selectedTutors.size === 0) return;

            window.AdminUtils.Modal.confirm(
                'Bulk Delete',
                `Are you sure you want to delete ${selectedTutors.size} selected tutors?`,
                async () => {
                    try {
                        const ids = Array.from(selectedTutors);
                        await window.supabaseClient.from('tutors').delete().in('id', ids);

                        window.AdminUtils.Toast.success('Deleted', `${ids.length} tutors removed`);
                        selectedTutors.clear();
                        updateBulkBar();
                        await loadTutors();
                    } catch (e) {
                        console.error(e);
                        window.AdminUtils.Toast.error('Error', 'Failed to delete tutors');
                    }
                }
            );
        };
    }

    function updateBulkBar() {
        if (bulkBar && selectedCountText) {
            if (selectedTutors.size > 0) {
                bulkBar.style.display = 'block';
                selectedCountText.textContent = selectedTutors.size;
            } else {
                bulkBar.style.display = 'none';
            }
        }
    }

    updateBulkBar();
}

function filterTutors(query) {
    const q = query.toLowerCase();
    const qDigits = query.replace(/[^\d]/g, ''); // Extract digits for phone search

    const filtered = allTutors.filter(t => {
        const nameMatch = t.full_name.toLowerCase().includes(q);
        const idMatch = t.tutor_id.toLowerCase().includes(q);
        // Phone search: compare raw digits so "9492020292" matches "+91 - 9492020292"
        const phoneDigits = (t.phone || '').replace(/[^\d]/g, '');
        const phoneMatch = qDigits.length >= 3 && phoneDigits.includes(qDigits);

        return nameMatch || idMatch || phoneMatch;
    });
    renderTutorsList(filtered);
}


// =====================
// Inline Form
// =====================
function bindFormEvents() {
    const closeBtn = document.getElementById('close-form-btn');
    const cancelBtn = document.getElementById('cancel-form-btn');
    const saveBtn = document.getElementById('save-tutor-btn');

    closeBtn?.addEventListener('click', closeForm);
    cancelBtn?.addEventListener('click', closeForm);
    saveBtn?.addEventListener('click', saveTutor);
}

function renderCoursesCheckboxes(selectedCourses = []) {
    const list = document.getElementById('tutor-courses-list');
    list.innerHTML = allCoursesForTutors.map(c => `
        <label class="checkbox-item">
            <input type="checkbox" name="tutor-courses" value="${c.course_code}" ${selectedCourses.includes(c.course_code) ? 'checked' : ''}>
            <span>${c.course_code} - ${c.course_name}</span>
        </label>
    `).join('');
}

async function openForm(tutorId = null) {
    const { Toast } = window.AdminUtils;
    const container = document.getElementById('tutor-form-container');
    const formTitle = document.getElementById('form-title');
    const saveBtn = document.getElementById('save-tutor-btn');
    const isEdit = !!tutorId;

    await loadCoursesForTutors();

    if (allCoursesForTutors.length === 0) {
        Toast.error('No Courses', 'Please sync courses first');
        return;
    }

    // Reset form
    document.getElementById('edit-tutor-id').value = '';
    document.getElementById('tutor-name').value = '';
    document.getElementById('tutor-phone').value = '';
    document.getElementById('tutor-email').value = '';
    document.getElementById('tutor-linkedin').value = '';
    document.getElementById('tutor-notes').value = '';

    let tutor = null;
    if (isEdit) {
        const { data, error } = await window.supabaseClient.from('tutors').select('*').eq('id', tutorId).single();
        if (error || !data) {
            Toast.error('Error', 'Could not load tutor data');
            return;
        }
        tutor = data;

        document.getElementById('edit-tutor-id').value = tutor.id;
        document.getElementById('tutor-name').value = tutor.full_name || '';
        document.getElementById('tutor-phone').value = tutor.phone || '';
        document.getElementById('tutor-email').value = tutor.email || '';
        document.getElementById('tutor-linkedin').value = tutor.linkedin_url || '';
        document.getElementById('tutor-notes').value = tutor.notes || '';
    }

    renderCoursesCheckboxes(tutor?.courses || []);

    formTitle.textContent = isEdit ? 'Edit Tutor' : 'Add Tutor';
    saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Update' : 'Save'} Tutor`;

    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeForm() {
    document.getElementById('tutor-form-container').style.display = 'none';
}

async function saveTutor() {
    const { Toast } = window.AdminUtils;
    const saveBtn = document.getElementById('save-tutor-btn');
    const editId = document.getElementById('edit-tutor-id').value;
    const isEdit = !!editId;

    const name = document.getElementById('tutor-name').value.trim();
    const phone = document.getElementById('tutor-phone').value.trim();
    const email = document.getElementById('tutor-email').value.trim();
    const linkedin = document.getElementById('tutor-linkedin').value.trim();
    const notes = document.getElementById('tutor-notes').value.trim();
    const courses = Array.from(document.querySelectorAll('input[name="tutor-courses"]:checked')).map(c => c.value);

    // Validation
    const { Validators } = window.AdminUtils;
    if (!name) { Toast.error('Required', 'Name required'); return; }
    if (!Validators.isValidPhone(phone)) { Toast.error('Required', 'Valid phone number required'); return; }
    if (courses.length === 0) { Toast.error('Required', 'Select at least one course'); return; }

    // Format phone for storage (e.g., "+91 - 9492020292")
    const formattedPhone = Validators.formatPhoneForStorage(phone);

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        if (isEdit) {
            const { error } = await window.supabaseClient.from('tutors').update({
                full_name: name, phone: formattedPhone, email: email || null,
                linkedin_url: linkedin || null, courses, notes
            }).eq('id', editId);
            if (error) throw error;
            Toast.success('Updated', 'Tutor updated successfully');
        } else {
            // Generate new ID
            const { data: maxData } = await window.supabaseClient.from('tutors').select('tutor_id').order('tutor_id', { ascending: false }).limit(1);
            let nextNum = 1;
            if (maxData?.length > 0) {
                const m = maxData[0].tutor_id.match(/Tr-ACS-(\d+)/);
                if (m) nextNum = parseInt(m[1]) + 1;
            }
            const newId = `Tr-ACS-${String(nextNum).padStart(3, '0')}`;

            const { error } = await window.supabaseClient.from('tutors').insert({
                tutor_id: newId, full_name: name, phone: formattedPhone, email: email || null,
                linkedin_url: linkedin || null, courses, notes, status: 'ACTIVE'
            });
            if (error) throw error;
            Toast.success('Added', 'Tutor added successfully');


            // Log activity
            if (window.DashboardActivities) {
                await window.DashboardActivities.add('tutor_added', name, '../tutors/');
            }
        }
        closeForm();
        await loadTutors();
    } catch (err) {
        console.error(err);
        Toast.error('Error', err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Update' : 'Save'} Tutor`;
    }
}

// =====================
// Delete Confirmation
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
    deleteTargetId = null;
    document.getElementById('delete-overlay').style.display = 'none';
}

async function confirmDelete() {
    if (!deleteTargetId) return;
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('confirm-delete-btn');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        await window.supabaseClient.from('tutors').delete().eq('id', deleteTargetId);
        Toast.success('Deleted', 'Tutor deleted successfully');
        hideDeleteConfirm();
        await loadTutors();
    } catch (e) {
        Toast.error('Error', e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Delete';
    }
}
