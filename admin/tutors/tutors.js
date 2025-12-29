// Tutors Module - Inline Form Approach
let allTutors = [];
let allCoursesForTutors = [];
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    AdminSidebar.init('tutors');

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
    const { Toast } = window.AdminUtils;
    const content = document.getElementById('tutors-content');

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
                <p>Click "Add Tutor" to add your first tutor</p>
            </div>`;
        return;
    }

    content.innerHTML = `
        <div class="data-table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Courses</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tutors.map(t => `
                        <tr>
                            <td><span class="badge badge-primary">${t.tutor_id}</span></td>
                            <td><strong>${t.full_name}</strong></td>
                            <td>${t.phone}</td>
                            <td>${(t.courses || []).join(', ') || '-'}</td>
                            <td class="actions-cell">
                                <button class="btn-icon btn-edit-tutor" data-id="${t.id}"><i class="fa-solid fa-pen"></i></button>
                                <button class="btn-icon btn-delete-tutor" data-id="${t.id}" data-name="${t.full_name}"><i class="fa-solid fa-trash"></i></button>
                                <a href="https://wa.me/91${t.phone.replace(/\D/g, '')}" target="_blank" class="btn-icon btn-whatsapp"><i class="fa-brands fa-whatsapp"></i></a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="data-cards">
            ${tutors.map(t => `
                <div class="data-card">
                    <div class="data-card-header"><span class="badge badge-primary">${t.tutor_id}</span></div>
                    <div class="data-card-body">
                        <h4>${t.full_name}</h4>
                        <p class="data-card-meta"><i class="fa-solid fa-phone"></i> ${t.phone}</p>
                        <p class="data-card-meta"><i class="fa-solid fa-book"></i> ${(t.courses || []).join(', ') || 'No courses'}</p>
                    </div>
                    <div class="data-card-actions">
                        <button class="btn btn-sm btn-outline btn-edit-tutor" data-id="${t.id}"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="btn btn-sm btn-outline btn-danger btn-delete-tutor" data-id="${t.id}" data-name="${t.full_name}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="table-footer"><span>${tutors.length} tutor${tutors.length !== 1 ? 's' : ''}</span></div>`;

    document.querySelectorAll('.btn-edit-tutor').forEach(btn =>
        btn.addEventListener('click', () => openForm(btn.dataset.id)));
    document.querySelectorAll('.btn-delete-tutor').forEach(btn =>
        btn.addEventListener('click', () => showDeleteConfirm(btn.dataset.id, btn.dataset.name)));
}

function filterTutors(query) {
    const filtered = allTutors.filter(t =>
        t.full_name.toLowerCase().includes(query.toLowerCase()) ||
        t.phone.includes(query) ||
        t.tutor_id.toLowerCase().includes(query.toLowerCase())
    );
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
    document.getElementById('tutor-specialization').value = '';
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
    const courses = Array.from(document.querySelectorAll('input[name="tutor-courses"]:checked')).map(c => c.value);

    // Validation
    if (!name) { Toast.error('Required', 'Name required'); return; }
    if (!phone || phone.length !== 10) { Toast.error('Required', 'Valid 10-digit phone required'); return; }
    if (courses.length === 0) { Toast.error('Required', 'Select at least one course'); return; }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        if (isEdit) {
            const { error } = await window.supabaseClient.from('tutors').update({
                full_name: name, phone, email: email || null,
                linkedin_url: linkedin || null, courses
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
                tutor_id: newId, full_name: name, phone, email: email || null,
                linkedin_url: linkedin || null, courses, status: 'ACTIVE'
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
