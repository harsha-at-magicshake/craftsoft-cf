// Students Module - With Time Pickers and Per-Course Discount
let allStudents = [];
let allCoursesForStudents = [];
let allTutorsForStudents = [];
let deleteTargetId = null;
let courseDiscounts = {}; // Store per-course discounts { courseCode: discount }

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    AdminSidebar.init('students');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Students');
    }

    const admin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, admin);

    await loadCoursesForStudents();
    await loadTutorsForStudents();
    await loadStudents();

    bindFormEvents();
    bindDeleteEvents();

    document.getElementById('add-student-btn')?.addEventListener('click', () => openForm());
    document.getElementById('student-search')?.addEventListener('input', (e) => filterStudents(e.target.value));
});

// =====================
// Data Loading
// =====================
async function loadCoursesForStudents() {
    const { data, error } = await window.supabaseClient
        .from('courses')
        .select('course_code, course_name, fee')
        .eq('status', 'ACTIVE')
        .order('course_code');
    if (!error && data) allCoursesForStudents = data;
}

async function loadTutorsForStudents() {
    const { data, error } = await window.supabaseClient
        .from('tutors')
        .select('tutor_id, full_name, courses')
        .eq('status', 'ACTIVE')
        .order('tutor_id');
    if (!error && data) allTutorsForStudents = data;
}

async function loadStudents() {
    const { Toast } = window.AdminUtils;
    const content = document.getElementById('students-content');

    try {
        const { data: students, error } = await window.supabaseClient
            .from('students')
            .select('*')
            .eq('status', 'ACTIVE')
            .order('student_id', { ascending: true });

        if (error) throw error;
        allStudents = students || [];
        renderStudentsList(allStudents);
    } catch (error) {
        console.error('Load students error:', error);
        content.innerHTML = '<div class="error-state"><i class="fa-solid fa-exclamation-triangle"></i><p>Failed to load students.</p></div>';
    }
}

// =====================
// Rendering
// =====================
function getTutorName(tutorId) {
    const tutor = allTutorsForStudents.find(t => t.tutor_id === tutorId);
    return tutor ? tutor.full_name : tutorId;
}

function formatNumber(num) {
    return num.toLocaleString('en-IN');
}

function renderStudentsList(students) {
    const content = document.getElementById('students-content');

    if (!students || students.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-user-graduate"></i></div>
                <h3>No students yet</h3>
                <p>Click "Add Student" to enroll your first student</p>
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
                        <th>Course(s)</th>
                        <th>Fee</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map(s => `
                        <tr>
                            <td><span class="badge badge-primary">${s.student_id}</span></td>
                            <td><strong>${s.first_name} ${s.last_name}</strong></td>
                            <td>${s.phone}</td>
                            <td>${(s.courses || []).join(', ') || '-'}</td>
                            <td class="fee-cell">₹${formatNumber(s.final_fee || 0)}</td>
                            <td class="actions-cell">
                                <button class="btn-icon btn-edit-student" data-id="${s.id}"><i class="fa-solid fa-pen"></i></button>
                                <button class="btn-icon btn-delete-student" data-id="${s.id}" data-name="${s.first_name} ${s.last_name}"><i class="fa-solid fa-trash"></i></button>
                                <a href="https://wa.me/91${s.phone.replace(/\D/g, '')}" target="_blank" class="btn-icon btn-whatsapp-student"><i class="fa-brands fa-whatsapp"></i></a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="data-cards">
            ${students.map(s => `
                <div class="data-card">
                    <div class="data-card-header"><span class="badge badge-primary">${s.student_id}</span></div>
                    <div class="data-card-body">
                        <h4>${s.first_name} ${s.last_name}</h4>
                        <p class="data-card-meta"><i class="fa-solid fa-phone"></i> ${s.phone}</p>
                        <p class="data-card-meta"><i class="fa-solid fa-book"></i> ${(s.courses || []).join(', ') || 'No courses'}</p>
                        <p class="data-card-meta"><i class="fa-solid fa-indian-rupee-sign"></i> ${formatNumber(s.final_fee || 0)}</p>
                    </div>
                    <div class="data-card-actions">
                        <button class="btn btn-sm btn-outline btn-edit-student" data-id="${s.id}"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="btn btn-sm btn-outline btn-danger btn-delete-student" data-id="${s.id}" data-name="${s.first_name} ${s.last_name}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="table-footer"><span>${students.length} student${students.length !== 1 ? 's' : ''}</span></div>`;

    document.querySelectorAll('.btn-edit-student').forEach(btn =>
        btn.addEventListener('click', () => openForm(btn.dataset.id)));
    document.querySelectorAll('.btn-delete-student').forEach(btn =>
        btn.addEventListener('click', () => showDeleteConfirm(btn.dataset.id, btn.dataset.name)));
}

function filterStudents(query) {
    const filtered = allStudents.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(query.toLowerCase()) ||
        s.phone.includes(query) ||
        s.student_id.toLowerCase().includes(query.toLowerCase())
    );
    renderStudentsList(filtered);
}

// =====================
// Inline Form
// =====================
function bindFormEvents() {
    const closeBtn = document.getElementById('close-form-btn');
    const cancelBtn = document.getElementById('cancel-form-btn');
    const saveBtn = document.getElementById('save-student-btn');

    closeBtn?.addEventListener('click', closeForm);
    cancelBtn?.addEventListener('click', closeForm);
    saveBtn?.addEventListener('click', saveStudent);

    // Demo toggle
    document.querySelectorAll('input[name="demo-scheduled"]').forEach(r => {
        r.addEventListener('change', function () {
            document.querySelector('.demo-fields').style.display = this.value === 'yes' ? 'block' : 'none';
        });
    });
}

function getFilteredTutors(selectedCourses) {
    if (!selectedCourses || selectedCourses.length === 0) return [];
    return allTutorsForStudents.filter(t => t.courses && t.courses.some(c => selectedCourses.includes(c)));
}

function updateTutorsList(currentTutors = []) {
    const selectedCourses = Array.from(document.querySelectorAll('input[name="student-courses"]:checked')).map(c => c.value);
    const list = document.getElementById('student-tutors-list');
    const filtered = getFilteredTutors(selectedCourses);

    if (filtered.length === 0) {
        list.innerHTML = '<p class="text-muted">No tutors available for selected courses</p>';
    } else {
        list.innerHTML = filtered.map(t => `
            <label class="checkbox-item">
                <input type="checkbox" name="student-tutors" value="${t.tutor_id}" ${currentTutors.includes(t.tutor_id) ? 'checked' : ''}>
                <span>${t.tutor_id} - ${t.full_name}</span>
            </label>
        `).join('');
    }
}

function renderCoursesCheckboxes(selectedCourses = [], discounts = {}) {
    const list = document.getElementById('student-courses-list');
    courseDiscounts = discounts; // Initialize

    list.innerHTML = allCoursesForStudents.map(c => `
        <label class="checkbox-item">
            <input type="checkbox" name="student-courses" value="${c.course_code}" data-fee="${c.fee || 0}" ${selectedCourses.includes(c.course_code) ? 'checked' : ''}>
            <span>${c.course_code} - ${c.course_name} (₹${formatNumber(c.fee || 0)})</span>
        </label>
    `).join('');

    // Bind course change events
    document.querySelectorAll('input[name="student-courses"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const currentTutors = Array.from(document.querySelectorAll('input[name="student-tutors"]:checked')).map(t => t.value);
            updateTutorsList(currentTutors);
            updateFeeBreakdown();
        });
    });
}

function updateFeeBreakdown() {
    const breakdown = document.getElementById('fee-breakdown');
    const totalRow = document.getElementById('fee-total-row');
    const totalEl = document.getElementById('fee-total');

    const selectedCourses = Array.from(document.querySelectorAll('input[name="student-courses"]:checked'));

    if (selectedCourses.length === 0) {
        breakdown.innerHTML = '<p class="text-muted">Select courses to see fee breakdown</p>';
        totalRow.style.display = 'none';
        return;
    }

    let html = '';
    selectedCourses.forEach(cb => {
        const code = cb.value;
        const course = allCoursesForStudents.find(c => c.course_code === code);
        const fee = course?.fee || 0;
        const discount = courseDiscounts[code] || 0;
        const net = Math.max(0, fee - discount);

        html += `
            <div class="fee-item">
                <div class="fee-item-name">${course?.course_name || code}</div>
                <div class="fee-item-price">₹${formatNumber(fee)}</div>
                <div class="fee-item-discount">
                    <span>-₹</span>
                    <input type="number" value="${discount}" min="0" max="${fee}" data-course="${code}" class="discount-input">
                </div>
                <div class="fee-item-net" data-net="${code}">₹${formatNumber(net)}</div>
            </div>
        `;
    });

    breakdown.innerHTML = html;
    totalRow.style.display = 'flex';

    // Calculate total
    recalculateTotal();

    // Bind discount inputs
    document.querySelectorAll('.discount-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
            const code = e.target.dataset.course;
            const val = parseFloat(e.target.value) || 0;
            courseDiscounts[code] = val;

            // Update net for this course
            const course = allCoursesForStudents.find(c => c.course_code === code);
            const fee = course?.fee || 0;
            const net = Math.max(0, fee - val);
            document.querySelector(`.fee-item-net[data-net="${code}"]`).textContent = `₹${formatNumber(net)}`;

            recalculateTotal();
        });
    });
}

function recalculateTotal() {
    const totalEl = document.getElementById('fee-total');
    const selectedCourses = Array.from(document.querySelectorAll('input[name="student-courses"]:checked'));

    let total = 0;
    selectedCourses.forEach(cb => {
        const code = cb.value;
        const course = allCoursesForStudents.find(c => c.course_code === code);
        const fee = course?.fee || 0;
        const discount = courseDiscounts[code] || 0;
        total += Math.max(0, fee - discount);
    });

    totalEl.textContent = `₹${formatNumber(total)}`;
}

async function openForm(studentId = null) {
    const { Toast } = window.AdminUtils;
    const container = document.getElementById('student-form-container');
    const formTitle = document.getElementById('form-title');
    const saveBtn = document.getElementById('save-student-btn');
    const isEdit = !!studentId;

    // Refresh data
    await loadCoursesForStudents();
    await loadTutorsForStudents();

    if (allCoursesForStudents.length === 0) {
        Toast.error('No Courses', 'Please sync courses first');
        return;
    }
    if (allTutorsForStudents.length === 0) {
        Toast.error('No Tutors', 'Please add tutors first');
        return;
    }

    // Reset form
    document.getElementById('edit-student-id').value = '';
    document.getElementById('student-fname').value = '';
    document.getElementById('student-lname').value = '';
    document.getElementById('student-phone').value = '';
    document.getElementById('student-email').value = '';
    document.getElementById('student-demo-date').value = '';
    document.getElementById('student-demo-time').value = '';
    document.getElementById('student-joining-date').value = '';
    document.getElementById('student-batch-time').value = '';
    document.getElementById('student-notes').value = '';
    document.querySelector('input[name="demo-scheduled"][value="no"]').checked = true;
    document.querySelector('.demo-fields').style.display = 'none';
    courseDiscounts = {};

    let student = null;
    if (isEdit) {
        const { data, error } = await window.supabaseClient.from('students').select('*').eq('id', studentId).single();
        if (error || !data) {
            Toast.error('Error', 'Could not load student data');
            return;
        }
        student = data;

        document.getElementById('edit-student-id').value = student.id;
        document.getElementById('student-fname').value = student.first_name || '';
        document.getElementById('student-lname').value = student.last_name || '';
        document.getElementById('student-phone').value = student.phone || '';
        document.getElementById('student-email').value = student.email || '';
        document.getElementById('student-demo-date').value = student.demo_date || '';
        document.getElementById('student-demo-time').value = student.demo_time || '';
        document.getElementById('student-joining-date').value = student.joining_date || '';
        document.getElementById('student-batch-time').value = student.batch_time || '';
        document.getElementById('student-notes').value = student.notes || '';

        if (student.demo_scheduled) {
            document.querySelector('input[name="demo-scheduled"][value="yes"]').checked = true;
            document.querySelector('.demo-fields').style.display = 'block';
        }

        // Load course discounts from student data
        courseDiscounts = student.course_discounts || {};
    }

    // Render courses checkboxes
    renderCoursesCheckboxes(student?.courses || [], courseDiscounts);

    // Render tutors
    updateTutorsList(student?.tutors || []);

    // Update fee breakdown
    updateFeeBreakdown();

    formTitle.textContent = isEdit ? 'Edit Student' : 'Add Student';
    saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Update' : 'Save'} Student`;

    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeForm() {
    document.getElementById('student-form-container').style.display = 'none';
}

async function saveStudent() {
    const { Toast } = window.AdminUtils;
    const saveBtn = document.getElementById('save-student-btn');
    const editId = document.getElementById('edit-student-id').value;
    const isEdit = !!editId;

    const fname = document.getElementById('student-fname').value.trim();
    const lname = document.getElementById('student-lname').value.trim();
    const phone = document.getElementById('student-phone').value.trim();
    const email = document.getElementById('student-email').value.trim();
    const courses = Array.from(document.querySelectorAll('input[name="student-courses"]:checked')).map(c => c.value);
    const tutors = Array.from(document.querySelectorAll('input[name="student-tutors"]:checked')).map(t => t.value);
    const demoScheduled = document.querySelector('input[name="demo-scheduled"]:checked')?.value === 'yes';
    const demoDate = document.getElementById('student-demo-date').value || null;
    const demoTime = document.getElementById('student-demo-time').value || null;
    const joiningDate = document.getElementById('student-joining-date').value || null;
    const batchTime = document.getElementById('student-batch-time').value || null;
    const notes = document.getElementById('student-notes').value.trim();

    // Calculate totals
    let totalFee = 0;
    let totalDiscount = 0;
    courses.forEach(code => {
        const course = allCoursesForStudents.find(c => c.course_code === code);
        const fee = course?.fee || 0;
        const discount = courseDiscounts[code] || 0;
        totalFee += fee;
        totalDiscount += discount;
    });
    const finalFee = totalFee - totalDiscount;

    // Validation
    if (!fname || !lname) { Toast.error('Required', 'Name required'); return; }
    if (!phone || phone.length !== 10) { Toast.error('Required', 'Valid 10-digit phone required'); return; }
    if (courses.length === 0) { Toast.error('Required', 'Select at least one course'); return; }
    if (tutors.length === 0) { Toast.error('Required', 'Select at least one tutor'); return; }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        const studentData = {
            first_name: fname,
            last_name: lname,
            phone,
            email: email || null,
            courses,
            tutors,
            demo_scheduled: demoScheduled,
            demo_date: demoDate,
            demo_time: demoTime,
            joining_date: joiningDate,
            batch_time: batchTime,
            fee: totalFee,
            discount: totalDiscount,
            final_fee: finalFee,
            course_discounts: courseDiscounts,
            notes
        };

        if (isEdit) {
            const { error } = await window.supabaseClient.from('students').update(studentData).eq('id', editId);
            if (error) throw error;
            Toast.success('Updated', 'Student updated successfully');
        } else {
            // Generate new ID
            const { data: maxData } = await window.supabaseClient.from('students').select('student_id').order('student_id', { ascending: false }).limit(1);
            let nextNum = 1;
            if (maxData?.length > 0) {
                const m = maxData[0].student_id.match(/St-ACS-(\d+)/);
                if (m) nextNum = parseInt(m[1]) + 1;
            }
            const newId = `St-ACS-${String(nextNum).padStart(3, '0')}`;

            const { error } = await window.supabaseClient.from('students').insert({
                ...studentData,
                student_id: newId,
                status: 'ACTIVE'
            });
            if (error) throw error;
            Toast.success('Added', 'Student enrolled successfully');

            // Log activity
            if (window.DashboardActivities) {
                await window.DashboardActivities.add('student_added', `${fname} ${lname}`, '../students/');
                if (demoScheduled) {
                    await window.DashboardActivities.add('demo_scheduled', `${fname} ${lname}`, '../students/');
                }
            }
        }
        closeForm();
        await loadStudents();
    } catch (err) {
        console.error(err);
        Toast.error('Error', err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Update' : 'Save'} Student`;
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
        await window.supabaseClient.from('students').delete().eq('id', deleteTargetId);
        Toast.success('Deleted', 'Student deleted successfully');
        hideDeleteConfirm();
        await loadStudents();
    } catch (e) {
        Toast.error('Error', e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Delete';
    }
}
