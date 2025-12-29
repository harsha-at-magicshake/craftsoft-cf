// Students Module with Modal Fixes
let allStudents = [];
let allCoursesForStudents = [];
let allTutorsForStudents = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const { NavigationSecurity } = window.AdminUtils || {};
    // NavigationSecurity.initProtectedPage();
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // Init Sidebar
    AdminSidebar.init('students');

    // Render Header
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Students');
    }

    // Load Data
    await loadCoursesForStudents();
    await loadTutorsForStudents();
    await loadStudents();

    // Bind Add Button & Search
    document.getElementById('add-student-btn')?.addEventListener('click', () => openStudentModal());
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
        btn.addEventListener('click', () => openStudentModal(btn.dataset.id)));
    document.querySelectorAll('.btn-delete-student').forEach(btn =>
        btn.addEventListener('click', () => openDeleteStudentModal(btn.dataset.id, btn.dataset.name, btn.dataset.sid)));
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

// Modal implementations
async function openStudentModal(studentId = null) {
    const { Toast } = window.AdminUtils;
    const isEdit = !!studentId;
    let student = null;

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

    if (isEdit) {
        const { data, error } = await window.supabaseClient.from('students').select('*').eq('id', studentId).single();
        if (error || !data) {
            Toast.error('Error', 'Could not load student data');
            return;
        }
        student = data;
    }

    const coursesCheckboxes = allCoursesForStudents.map(c => `
        <label class="checkbox-item">
            <input type="checkbox" name="student-courses" value="${c.course_code}" ${student?.courses?.includes(c.course_code) ? 'checked' : ''}>
            <span>${c.course_code} - ${c.course_name}</span>
        </label>
    `).join('');

    const modalHTML = `
        <div class="modal-overlay active" id="student-modal">
            <div class="modal-container modal-lg">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit Student' : 'Add Student'}</h3>
                    <button type="button" class="modal-close" id="close-student-modal"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="modal-body">
                    ${isEdit ? `<div class="form-group"><label>Student ID</label><input type="text" value="${student.student_id}" disabled class="input-locked"></div>` : ''}
                    <div class="form-row">
                        <div class="form-group"><label>First Name <span class="required">*</span></label><input type="text" id="student-fname" value="${student?.first_name || ''}" placeholder="First name"></div>
                        <div class="form-group"><label>Last Name <span class="required">*</span></label><input type="text" id="student-lname" value="${student?.last_name || ''}" placeholder="Last name"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Phone <span class="required">*</span></label><input type="tel" id="student-phone" maxlength="10" value="${student?.phone || ''}" placeholder="10-digit"></div>
                        <div class="form-group"><label>Email</label><input type="email" id="student-email" value="${student?.email || ''}" placeholder="Email"></div>
                    </div>
                    <div class="form-group"><label>Courses <span class="required">*</span></label><div class="checkbox-list" id="student-courses-list">${coursesCheckboxes}</div></div>
                    <div class="form-group"><label>Assigned Tutors <span class="required">*</span></label><div class="checkbox-list" id="student-tutors-list"><p class="text-muted">Select courses first</p></div></div>
                    
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
                    
                    <div class="form-row form-row-3">
                        <div class="form-group"><label>Fee (₹)</label><input type="number" id="student-fee" value="${student?.fee || 0}" min="0"></div>
                        <div class="form-group"><label>Discount (₹)</label><input type="number" id="student-discount" value="${student?.discount || 0}" min="0"></div>
                        <div class="form-group"><label>Final Fee (₹)</label><input type="number" id="student-final-fee" value="${student?.final_fee || 0}" disabled class="input-locked"></div>
                    </div>
                    <div class="form-group"><label>Notes</label><textarea id="student-notes" rows="2" placeholder="Notes...">${student?.notes || ''}</textarea></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" id="cancel-student-btn">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-student-btn"><i class="fa-solid fa-check"></i> ${isEdit ? 'Update' : 'Save'} Student</button>
                </div>
            </div>
        </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    // SetTimeout to ensure interactions work
    setTimeout(() => {
        const modal = document.getElementById('student-modal');
        if (!modal) return;
        const closeBtn = modal.querySelector('#close-student-modal');
        const cancelBtn = modal.querySelector('#cancel-student-btn');
        const saveBtn = modal.querySelector('#save-student-btn');

        // Fee Helper
        const updateFees = () => {
            const fee = parseFloat(modal.querySelector('#student-fee').value) || 0;
            const discount = parseFloat(modal.querySelector('#student-discount').value) || 0;
            modal.querySelector('#student-final-fee').value = Math.max(0, fee - discount);
        };
        modal.querySelector('#student-fee').addEventListener('input', updateFees);
        modal.querySelector('#student-discount').addEventListener('input', updateFees);

        // Calculate fee from courses
        const calcFeeFromCourses = () => {
            const selected = Array.from(modal.querySelectorAll('input[name="student-courses"]:checked')).map(c => c.value);
            let total = 0;
            selected.forEach(code => {
                const c = allCoursesForStudents.find(x => x.course_code === code);
                if (c?.fee) total += parseFloat(c.fee);
            });
            modal.querySelector('#student-fee').value = total;
            updateFees();
        };

        // Course/Tutor Logic
        const updateTutors = () => {
            const selectedCourses = Array.from(modal.querySelectorAll('input[name="student-courses"]:checked')).map(c => c.value);
            const list = modal.querySelector('#student-tutors-list');
            const filtered = getFilteredTutors(selectedCourses);

            // Should preserve checked state of existing tutors if they are still valid
            // But for simplicity, we re-render. Ideally re-check if id exists.
            const currentChecked = Array.from(modal.querySelectorAll('input[name="student-tutors"]:checked')).map(t => t.value);

            if (filtered.length === 0) list.innerHTML = '<p class="text-muted">No tutors available</p>';
            else {
                list.innerHTML = filtered.map(t => `
                    <label class="checkbox-item"><input type="checkbox" name="student-tutors" value="${t.tutor_id}" ${currentChecked.includes(t.tutor_id) ? 'checked' : ''}><span>${t.tutor_id} - ${t.full_name}</span></label>
                `).join('');
            }
        };

        modal.querySelectorAll('input[name="student-courses"]').forEach(cb => {
            cb.addEventListener('change', () => {
                calcFeeFromCourses();
                updateTutors();
            });
        });

        // Init state
        if (student?.courses) {
            // Need to manually trigger updateTutors for initial load...
            // Or simpler: define updateTutors to accept args.
            // But we can just use the updateTutorCheckboxes helper I didn't include inside the timeout scope?
            // Re-implementing simplified version above.
            updateTutors(); // this renders based on currently checked courses
            // Need to re-check tutors that were on the student object!
            if (student.tutors) {
                student.tutors.forEach(tid => {
                    const cb = modal.querySelector(`input[name="student-tutors"][value="${tid}"]`);
                    if (cb) cb.checked = true;
                });
            }
        }

        // Demo logic
        modal.querySelectorAll('input[name="demo-scheduled"]').forEach(r => {
            r.addEventListener('change', function () {
                modal.querySelector('.demo-fields').style.display = this.value === 'yes' ? 'grid' : 'none';
            });
        });

        const closeModal = () => { modal.remove(); document.body.style.overflow = ''; };
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };

        saveBtn.onclick = async () => {
            // ... save logic ...
            const fname = modal.querySelector('#student-fname').value.trim();
            const lname = modal.querySelector('#student-lname').value.trim();
            const phone = modal.querySelector('#student-phone').value.trim();
            const email = modal.querySelector('#student-email').value.trim();
            const courses = Array.from(modal.querySelectorAll('input[name="student-courses"]:checked')).map(c => c.value);
            const tutors = Array.from(modal.querySelectorAll('input[name="student-tutors"]:checked')).map(t => t.value);
            const demoScheduled = modal.querySelector('input[name="demo-scheduled"]:checked')?.value === 'yes';
            const demoDate = modal.querySelector('#student-demo-date').value || null;
            const demoTime = modal.querySelector('#student-demo-time').value.trim() || null;
            const joiningDate = modal.querySelector('#student-joining-date').value || null;
            const batchTime = modal.querySelector('#student-batch-time').value.trim() || null;
            const fee = parseFloat(modal.querySelector('#student-fee').value) || 0;
            const discount = parseFloat(modal.querySelector('#student-discount').value) || 0;
            const finalFee = parseFloat(modal.querySelector('#student-final-fee').value) || 0; // or recalc
            const notes = modal.querySelector('#student-notes').value.trim();

            if (!fname || !lname) { Toast.error('Required', 'Name required'); return; }
            if (!phone || phone.length !== 10) { Toast.error('Required', 'Valid phone required'); return; }
            if (courses.length === 0) { Toast.error('Required', 'Select course'); return; }
            if (tutors.length === 0) { Toast.error('Required', 'Select tutor'); return; }

            saveBtn.disabled = true;
            saveBtn.innerHTML = 'Saving...';

            try {
                if (isEdit) {
                    const { error } = await window.supabaseClient.from('students').update({
                        first_name: fname, last_name: lname, phone, email: email || null,
                        courses, tutors, demo_scheduled: demoScheduled, demo_date: demoDate,
                        demo_time: demoTime, joining_date: joiningDate, batch_time: batchTime,
                        fee, discount, final_fee: finalFee, notes
                    }).eq('id', studentId);
                    if (error) throw error;
                    Toast.success('Updated', 'Student updated');
                } else {
                    const { data: maxData } = await window.supabaseClient.from('students').select('student_id').order('student_id', { ascending: false }).limit(1);
                    let nextNum = 1;
                    if (maxData?.length > 0) {
                        const m = maxData[0].student_id.match(/St-ACS-(\d+)/);
                        if (m) nextNum = parseInt(m[1]) + 1;
                    }
                    const newId = `St-ACS-${String(nextNum).padStart(3, '0')}`;
                    const { error } = await window.supabaseClient.from('students').insert({
                        student_id: newId, first_name: fname, last_name: lname, phone, email: email || null,
                        courses, tutors, demo_scheduled: demoScheduled, demo_date: demoDate,
                        demo_time: demoTime, joining_date: joiningDate, batch_time: batchTime,
                        fee, discount, final_fee: finalFee, notes, status: 'ACTIVE'
                    });
                    if (error) throw error;
                    Toast.success('Added', 'Student enrolled');
                }
                closeModal();
                await loadStudents();
            } catch (err) {
                console.error(err);
                Toast.error('Error', err.message);
                saveBtn.disabled = false;
                saveBtn.innerHTML = isEdit ? 'Update' : 'Save';
            }
        };

    }, 0);
}

function openDeleteStudentModal(studentId, studentName, studentIdCode) {
    const { Toast } = window.AdminUtils;
    const modalHTML = `
        <div class="modal-overlay active" id="delete-student-modal">
            <div class="modal-container modal-sm">
                <div class="modal-header"><h3>Delete Student</h3><button class="modal-close" id="close-del"><i class="fa-solid fa-xmark"></i></button></div>
                <div class="modal-body text-center">
                    <div class="warning-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                    <p>Delete student <strong>${studentName}</strong>?</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancel-del">Cancel</button>
                    <button class="btn btn-danger" id="confirm-del">Delete</button>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setTimeout(() => {
        const modal = document.getElementById('delete-student-modal');
        const close = () => modal.remove();
        document.getElementById('close-del').onclick = close;
        document.getElementById('cancel-del').onclick = close;
        document.getElementById('confirm-del').onclick = async () => {
            try {
                await window.supabaseClient.from('students').delete().eq('id', studentId);
                Toast.success('Deleted', 'Student deleted');
                close();
                await loadStudents();
            } catch (e) { Toast.error('Error', e.message); }
        };
    }, 0);
}
