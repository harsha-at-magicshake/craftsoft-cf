// Students Module - uses inline forms instead of modals
let allStudents = [];
let allCoursesForStudents = [];
let allTutorsForStudents = [];

document.addEventListener('DOMContentLoaded', async () => {
    const { NavigationSecurity } = window.AdminUtils || {};
    NavigationSecurity?.initProtectedPage();

    const session = await window.supabaseConfig?.getSession();
    if (!session) {
        NavigationSecurity?.secureRedirect('../login.html');
        return;
    }

    AdminSidebar.init('students');
    document.getElementById('header-container').innerHTML = AdminHeader.render('Students');

    await loadCoursesForStudents();
    await loadTutorsForStudents();
    await loadStudents();

    document.getElementById('add-student-btn')?.addEventListener('click', () => openStudentForm());
    document.getElementById('student-search')?.addEventListener('input', (e) => filterStudents(e.target.value));
});

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

function getTutorName(tutorId) {
    const tutor = allTutorsForStudents.find(t => t.tutor_id === tutorId);
    return tutor ? tutor.full_name : tutorId;
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
                        <th>Tutor(s)</th>
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
                            <td>${(s.tutors || []).map(t => getTutorName(t)).join(', ') || '-'}</td>
                            <td class="actions-cell">
                                <button class="btn-icon btn-edit-student" data-id="${s.id}"><i class="fa-solid fa-pen"></i></button>
                                <button class="btn-icon btn-delete-student" data-id="${s.id}" data-name="${s.first_name} ${s.last_name}" data-sid="${s.student_id}"><i class="fa-solid fa-trash"></i></button>
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
                    </div>
                    <div class="data-card-actions">
                        <button class="btn btn-sm btn-outline btn-edit-student" data-id="${s.id}"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="btn btn-sm btn-outline btn-danger btn-delete-student" data-id="${s.id}" data-name="${s.first_name} ${s.last_name}" data-sid="${s.student_id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="table-footer"><span>${students.length} student${students.length !== 1 ? 's' : ''}</span></div>`;

    document.querySelectorAll('.btn-edit-student').forEach(btn =>
        btn.addEventListener('click', () => openStudentForm(btn.dataset.id)));
    document.querySelectorAll('.btn-delete-student').forEach(btn =>
        btn.addEventListener('click', () => openDeleteStudentConfirm(btn.dataset.id, btn.dataset.name, btn.dataset.sid)));
}

function filterStudents(query) {
    const filtered = allStudents.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(query.toLowerCase()) ||
        s.phone.includes(query) ||
        s.student_id.toLowerCase().includes(query.toLowerCase())
    );
    renderStudentsList(filtered);
}

function getFilteredTutors(selectedCourses) {
    if (!selectedCourses || selectedCourses.length === 0) return [];
    return allTutorsForStudents.filter(t => t.courses && t.courses.some(c => selectedCourses.includes(c)));
}

async function openStudentForm(studentId = null) {
    const { Toast } = window.AdminUtils;
    const content = document.getElementById('students-content');
    const sectionActions = document.querySelector('.section-actions');
    const isEdit = !!studentId;
    let student = null;

    if (sectionActions) sectionActions.style.display = 'none';
    content.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';

    await loadCoursesForStudents();
    await loadTutorsForStudents();

    if (allCoursesForStudents.length === 0) {
        Toast.error('No Courses', 'Please sync courses first');
        if (sectionActions) sectionActions.style.display = '';
        renderStudentsList(allStudents);
        return;
    }

    if (isEdit) {
        const { data, error } = await window.supabaseClient.from('students').select('*').eq('id', studentId).single();
        if (error || !data) {
            Toast.error('Error', 'Could not load student data');
            if (sectionActions) sectionActions.style.display = '';
            renderStudentsList(allStudents);
            return;
        }
        student = data;
    }

    content.innerHTML = `
        <div class="inline-form-container">
            <div class="inline-form-header">
                <button type="button" class="btn btn-outline" id="back-to-list"><i class="fa-solid fa-arrow-left"></i> Back</button>
                <h3>${isEdit ? 'Edit Student' : 'Add Student'}</h3>
            </div>
            <div class="inline-form-body">
                ${isEdit ? `<div class="form-group"><label>Student ID</label><input type="text" value="${student.student_id}" disabled style="opacity:0.6;"></div>` : ''}
                
                <div class="form-row">
                    <div class="form-group">
                        <label>First Name <span class="required">*</span></label>
                        <input type="text" id="student-fname" value="${student?.first_name || ''}" placeholder="First name">
                    </div>
                    <div class="form-group">
                        <label>Last Name <span class="required">*</span></label>
                        <input type="text" id="student-lname" value="${student?.last_name || ''}" placeholder="Last name">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Phone <span class="required">*</span></label>
                        <input type="tel" id="student-phone" maxlength="10" value="${student?.phone || ''}" placeholder="10-digit phone">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="student-email" value="${student?.email || ''}" placeholder="Email">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Courses <span class="required">*</span></label>
                    <div class="checkbox-list" id="student-courses-list">
                        ${allCoursesForStudents.map(c => `
                            <label class="checkbox-item">
                                <input type="checkbox" name="student-courses" value="${c.course_code}" ${student?.courses?.includes(c.course_code) ? 'checked' : ''}>
                                <span>${c.course_code} - ${c.course_name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Assigned Tutors <span class="required">*</span></label>
                    <div class="checkbox-list" id="student-tutors-list">
                        <p class="text-muted">Select courses first</p>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Demo Scheduled?</label>
                    <div class="radio-group">
                        <label class="radio-item"><input type="radio" name="demo-scheduled" value="yes" ${student?.demo_scheduled ? 'checked' : ''}><span>Yes</span></label>
                        <label class="radio-item"><input type="radio" name="demo-scheduled" value="no" ${!student?.demo_scheduled ? 'checked' : ''}><span>No</span></label>
                    </div>
                </div>
                
                <div class="form-row demo-fields" style="${student?.demo_scheduled ? '' : 'display:none;'}">
                    <div class="form-group"><label>Demo Date</label><input type="date" id="student-demo-date" value="${student?.demo_date || ''}"></div>
                    <div class="form-group"><label>Demo Time</label><input type="text" id="student-demo-time" value="${student?.demo_time || ''}" placeholder="e.g., 6:00 PM"></div>
                </div>
                
                <div class="form-row">
                    <div class="form-group"><label>Joining Date</label><input type="date" id="student-joining-date" value="${student?.joining_date || ''}"></div>
                    <div class="form-group"><label>Batch Time</label><input type="text" id="student-batch-time" value="${student?.batch_time || ''}" placeholder="e.g., 7:00-8:30 PM"></div>
                </div>
                
                <div class="form-row">
                    <div class="form-group"><label>Fee (₹)</label><input type="number" id="student-fee" value="${student?.fee || 0}" min="0"></div>
                    <div class="form-group"><label>Discount (₹)</label><input type="number" id="student-discount" value="${student?.discount || 0}" min="0"></div>
                    <div class="form-group"><label>Final Fee (₹)</label><input type="number" id="student-final-fee" value="${student?.final_fee || 0}" disabled style="opacity:0.6;"></div>
                </div>
                
                <div class="form-group"><label>Notes</label><textarea id="student-notes" rows="2" placeholder="Additional notes...">${student?.notes || ''}</textarea></div>
            </div>
            <div class="inline-form-footer">
                <button type="button" class="btn btn-outline" id="cancel-form">Cancel</button>
                <button type="button" class="btn btn-primary" id="save-student-btn"><i class="fa-solid fa-check"></i> ${isEdit ? 'Update' : 'Save'} Student</button>
            </div>
        </div>`;

    // Initialize tutors if editing
    if (student?.courses?.length > 0) {
        updateTutorCheckboxes(student.courses, student.tutors || []);
    }

    // Course change handler
    document.querySelectorAll('input[name="student-courses"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const selected = Array.from(document.querySelectorAll('input[name="student-courses"]:checked')).map(c => c.value);
            const currentTutors = Array.from(document.querySelectorAll('input[name="student-tutors"]:checked')).map(t => t.value);
            updateTutorCheckboxes(selected, currentTutors);
            calculateFee();
        });
    });

    // Demo toggle
    document.querySelectorAll('input[name="demo-scheduled"]').forEach(radio => {
        radio.addEventListener('change', function () {
            const demoFields = document.querySelector('.demo-fields');
            if (demoFields) demoFields.style.display = this.value === 'yes' ? 'grid' : 'none';
        });
    });

    // Fee calculation
    const calculateFee = () => {
        const selected = Array.from(document.querySelectorAll('input[name="student-courses"]:checked')).map(c => c.value);
        let total = 0;
        selected.forEach(code => {
            const course = allCoursesForStudents.find(c => c.course_code === code);
            if (course?.fee) total += parseFloat(course.fee);
        });
        document.getElementById('student-fee').value = total;
        updateFinalFee();
    };

    const updateFinalFee = () => {
        const fee = parseFloat(document.getElementById('student-fee').value) || 0;
        const discount = parseFloat(document.getElementById('student-discount').value) || 0;
        document.getElementById('student-final-fee').value = Math.max(0, fee - discount);
    };

    document.getElementById('student-fee')?.addEventListener('input', updateFinalFee);
    document.getElementById('student-discount')?.addEventListener('input', updateFinalFee);

    // Back/Cancel
    const goBack = () => { if (sectionActions) sectionActions.style.display = ''; renderStudentsList(allStudents); };
    document.getElementById('back-to-list').addEventListener('click', goBack);
    document.getElementById('cancel-form').addEventListener('click', goBack);

    // Save
    document.getElementById('save-student-btn').addEventListener('click', async () => {
        const saveBtn = document.getElementById('save-student-btn');
        const fname = document.getElementById('student-fname').value.trim();
        const lname = document.getElementById('student-lname').value.trim();
        const phone = document.getElementById('student-phone').value.trim();
        const email = document.getElementById('student-email').value.trim();
        const courses = Array.from(document.querySelectorAll('input[name="student-courses"]:checked')).map(c => c.value);
        const tutors = Array.from(document.querySelectorAll('input[name="student-tutors"]:checked')).map(t => t.value);
        const demoScheduled = document.querySelector('input[name="demo-scheduled"]:checked')?.value === 'yes';
        const demoDate = document.getElementById('student-demo-date').value || null;
        const demoTime = document.getElementById('student-demo-time').value.trim() || null;
        const joiningDate = document.getElementById('student-joining-date').value || null;
        const batchTime = document.getElementById('student-batch-time').value.trim() || null;
        const fee = parseFloat(document.getElementById('student-fee').value) || 0;
        const discount = parseFloat(document.getElementById('student-discount').value) || 0;
        const finalFee = Math.max(0, fee - discount);
        const notes = document.getElementById('student-notes').value.trim() || null;

        if (!fname || !lname) { Toast.error('Required', 'Please enter student name'); return; }
        if (!phone || phone.length !== 10) { Toast.error('Required', 'Please enter valid 10-digit phone'); return; }
        if (courses.length === 0) { Toast.error('Required', 'Please select at least one course'); return; }
        if (tutors.length === 0) { Toast.error('Required', 'Please select at least one tutor'); return; }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

        try {
            if (isEdit) {
                const { error } = await window.supabaseClient.from('students').update({
                    first_name: fname, last_name: lname, phone, email: email || null,
                    courses, tutors, demo_scheduled: demoScheduled, demo_date: demoDate,
                    demo_time: demoTime, joining_date: joiningDate, batch_time: batchTime,
                    fee, discount, final_fee: finalFee, notes
                }).eq('id', studentId);
                if (error) throw error;
                Toast.success('Updated', 'Student updated successfully');
            } else {
                const { data: maxData } = await window.supabaseClient.from('students').select('student_id').order('student_id', { ascending: false }).limit(1);
                let nextNum = 1;
                if (maxData?.length > 0) {
                    const match = maxData[0].student_id.match(/St-ACS-(\d+)/);
                    if (match) nextNum = parseInt(match[1]) + 1;
                }
                const newId = `St-ACS-${String(nextNum).padStart(3, '0')}`;

                const { error } = await window.supabaseClient.from('students').insert({
                    student_id: newId, first_name: fname, last_name: lname, phone, email: email || null,
                    courses, tutors, demo_scheduled: demoScheduled, demo_date: demoDate,
                    demo_time: demoTime, joining_date: joiningDate, batch_time: batchTime,
                    fee, discount, final_fee: finalFee, notes, status: 'ACTIVE'
                });
                if (error) throw error;
                Toast.success('Added', 'Student enrolled successfully');
            }
            if (sectionActions) sectionActions.style.display = '';
            await loadStudents();
        } catch (error) {
            console.error('Save error:', error);
            Toast.error('Error', error.message || 'Failed to save');
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Update' : 'Save'} Student`;
        }
    });
}

function updateTutorCheckboxes(selectedCourses, existingTutorIds = []) {
    const list = document.getElementById('student-tutors-list');
    if (!list) return;

    if (!selectedCourses || selectedCourses.length === 0) {
        list.innerHTML = '<p class="text-muted">Select courses first</p>';
        return;
    }

    const filtered = getFilteredTutors(selectedCourses);
    if (filtered.length === 0) {
        list.innerHTML = '<p class="text-muted">No tutors for selected courses</p>';
        return;
    }

    list.innerHTML = filtered.map(t => `
        <label class="checkbox-item">
            <input type="checkbox" name="student-tutors" value="${t.tutor_id}" ${existingTutorIds.includes(t.tutor_id) ? 'checked' : ''}>
            <span>${t.tutor_id} - ${t.full_name}</span>
        </label>
    `).join('');
}

function openDeleteStudentConfirm(studentId, studentName, studentIdCode) {
    const { Toast } = window.AdminUtils;
    const content = document.getElementById('students-content');
    const sectionActions = document.querySelector('.section-actions');

    if (sectionActions) sectionActions.style.display = 'none';

    content.innerHTML = `
        <div class="inline-form-container inline-delete">
            <div class="inline-form-header">
                <button type="button" class="btn btn-outline" id="back-to-list"><i class="fa-solid fa-arrow-left"></i> Back</button>
                <h3>Delete Student</h3>
            </div>
            <div class="inline-form-body" style="text-align:center;">
                <div class="warning-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <p>Are you sure you want to delete this student?</p>
                <p class="text-strong">${studentName} (${studentIdCode})</p>
                <p class="text-muted">This action cannot be undone.</p>
            </div>
            <div class="inline-form-footer">
                <button type="button" class="btn btn-outline" id="cancel-delete">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirm-delete-btn"><i class="fa-solid fa-trash"></i> Delete Student</button>
            </div>
        </div>`;

    const goBack = () => { if (sectionActions) sectionActions.style.display = ''; renderStudentsList(allStudents); };
    document.getElementById('back-to-list').addEventListener('click', goBack);
    document.getElementById('cancel-delete').addEventListener('click', goBack);

    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
        const btn = document.getElementById('confirm-delete-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

        try {
            const { error } = await window.supabaseClient.from('students').delete().eq('id', studentId);
            if (error) throw error;
            Toast.success('Deleted', 'Student deleted');
            if (sectionActions) sectionActions.style.display = '';
            await loadStudents();
        } catch (error) {
            console.error('Delete error:', error);
            Toast.error('Error', 'Failed to delete');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Student';
        }
    });
}
