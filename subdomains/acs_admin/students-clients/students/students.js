﻿let allStudents = [];
let allCoursesForStudents = [];
let allTutorsForStudents = [];
let deleteTargetId = null;
let courseDiscounts = {}; // Store per-course discounts { courseCode: discount }

// Pagination State
let currentPage = 1;
const itemsPerPage = 10;
let selectedStudents = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../../login.html';
        return;
    }

    AdminSidebar.init('students', '../../');

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

    // Check for prefill from inquiry conversion
    checkPrefill();
});

function checkPrefill() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('prefill') === '1') {
        const name = params.get('name') || '';
        const phone = params.get('phone') || '';
        const email = params.get('email') || '';
        const courses = params.get('courses')?.split(',').filter(c => c) || [];
        const inquiryId = params.get('inquiry_id') || '';

        // Store inquiry ID for later status update
        if (inquiryId) {
            sessionStorage.setItem('converting_inquiry_id', inquiryId);
        }

        // Open form with prefilled data
        openFormWithPrefill(name, phone, email, courses);

        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

async function openFormWithPrefill(name, phone, email, courses) {
    await openForm(false);

    // Split name into first and last
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    document.getElementById('student-fname').value = firstName;
    document.getElementById('student-lname').value = lastName;
    document.getElementById('student-phone').value = phone;
    document.getElementById('student-email').value = email;

    // Render courses with pre-selected
    renderCoursesCheckboxes(courses, {});
    updateFeeBreakdown();
}

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
    const { Toast, Skeleton } = window.AdminUtils;
    const content = document.getElementById('students-content');

    // Show skeleton loading
    if (Skeleton) {
        Skeleton.show('students-content', 'table', 5);
    }

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

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedStudents = students.slice(start, start + itemsPerPage);

    content.innerHTML = `
        <div class="table-container">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th width="40px">
                            <input type="checkbox" id="select-all-students">
                        </th>
                        <th width="14%">STUDENT ID</th>
                        <th width="22%">NAME</th>
                        <th width="15%">PHONE</th>
                        <th width="32%">COURSE(S)</th>
                        <th width="17%" class="text-right">ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedStudents.map(s => `
                        <tr>
                            <td>
                                <input type="checkbox" class="student-checkbox" data-id="${s.id}" ${selectedStudents.has(s.id) ? 'checked' : ''}>
                            </td>
                            <td><span class="cell-badge clickable btn-view-profile" data-id="${s.id}">${s.student_id}</span></td>
                            <td><span class="cell-title">${s.first_name} ${s.last_name}</span></td>
                            <td><span class="cell-phone">${s.phone}</span></td>
                            <td>
                                <div class="cell-tags">
                                    ${(s.courses || []).map(code => {
        const tutorId = s.course_tutors?.[code];
        const tutor = allTutorsForStudents.find(t => t.tutor_id === tutorId);
        return `<span class="glass-tag" title="${tutor ? `Tutor: ${tutor.full_name}` : 'No tutor assigned'}">
                                            ${code}${tutor ? ` (${tutor.full_name.split(' ')[0]})` : ''}
                                        </span>`;
    }).join('')}
                                </div>
                            </td>
                            </td>
                            <td class="text-right">
                                <div class="cell-actions">
                                    <button class="action-btn edit btn-edit-student" data-id="${s.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                                    <a href="https://wa.me/91${s.phone.replace(/\D/g, '')}" target="_blank" class="action-btn whatsapp" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
                                    <button class="action-btn delete btn-delete-student" data-id="${s.id}" data-name="${s.first_name} ${s.last_name}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="data-cards">
            ${paginatedStudents.map(s => `
                <div class="premium-card">
                    <div class="card-header">
                        <div style="display: flex; gap: 0.75rem; align-items: center;">
                            <input type="checkbox" class="student-checkbox" data-id="${s.id}" ${selectedStudents.has(s.id) ? 'checked' : ''}>
                            <span class="card-id-badge clickable btn-view-profile" data-id="${s.id}">${s.student_id}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <h4 class="card-name">${s.first_name} ${s.last_name}</h4>
                        <div class="card-info-row">
                            <span class="card-info-item"><i class="fa-solid fa-phone"></i> ${s.phone}</span>
                            <div class="card-info-item">
                                <i class="fa-solid fa-book-open"></i> 
                                <div class="cell-tags">
                                    ${(s.courses || []).map(code => {
        const tutorId = s.course_tutors?.[code];
        const tutor = allTutorsForStudents.find(t => t.tutor_id === tutorId);
        return `<span class="glass-tag">${code}${tutor ? ` (${tutor.full_name.split(' ')[0]})` : ''}</span>`;
    }).join('')}
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="card-action-btn edit btn-edit-student" data-id="${s.id}">
                            <i class="fa-solid fa-pen"></i> <span>Edit</span>
                        </button>
                        <a href="https://wa.me/91${s.phone.replace(/\D/g, '')}" target="_blank" class="card-action-btn whatsapp">
                            <i class="fa-brands fa-whatsapp"></i> <span>WhatsApp</span>
                        </a>
                        <button class="card-action-btn delete btn-delete-student" data-id="${s.id}" data-name="${s.first_name} ${s.last_name}">
                            <i class="fa-solid fa-trash"></i> <span>Delete</span>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="table-footer">
            <span>Total Students: <strong>${students.length}</strong></span>
        </div>`;

    // Render pagination
    window.AdminUtils.Pagination.render('pagination-container', students.length, currentPage, itemsPerPage, (page) => {
        currentPage = page;
        renderStudentsList(allStudents);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.querySelectorAll('.btn-edit-student').forEach(btn =>
        btn.addEventListener('click', () => openForm(btn.dataset.id)));
    document.querySelectorAll('.btn-delete-student').forEach(btn =>
        btn.addEventListener('click', () => showDeleteConfirm(btn.dataset.id, btn.dataset.name)));
    document.querySelectorAll('.btn-view-profile').forEach(btn =>
        btn.addEventListener('click', () => openStudentProfile(btn.dataset.id)));

    bindBulkActions();
}

function bindBulkActions() {
    const selectAll = document.getElementById('select-all-students');
    const checkboxes = document.querySelectorAll('.student-checkbox');
    const bulkBar = document.getElementById('bulk-actions-container');
    const selectedCountText = document.getElementById('selected-count');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

    if (selectAll) {
        selectAll.onchange = (e) => {
            const start = (currentPage - 1) * itemsPerPage;
            const currentItems = allStudents.slice(start, start + itemsPerPage);
            currentItems.forEach(s => {
                if (e.target.checked) selectedStudents.add(s.id);
                else selectedStudents.delete(s.id);
            });
            renderStudentsList(allStudents);
            updateBulkBar();
        };

        const start = (currentPage - 1) * itemsPerPage;
        const currentItems = allStudents.slice(start, start + itemsPerPage);
        const allSelected = currentItems.length > 0 && currentItems.every(s => selectedStudents.has(s.id));
        selectAll.checked = allSelected;
    }

    checkboxes.forEach(cb => {
        cb.onchange = (e) => {
            const id = cb.dataset.id;
            if (e.target.checked) selectedStudents.add(id);
            else selectedStudents.delete(id);
            updateBulkBar();

            if (selectAll) {
                const start = (currentPage - 1) * itemsPerPage;
                const currentItems = allStudents.slice(start, start + itemsPerPage);
                selectAll.checked = currentItems.every(s => selectedStudents.has(s.id));
            }
        };
    });

    if (bulkDeleteBtn) {
        bulkDeleteBtn.onclick = async () => {
            if (selectedStudents.size === 0) return;

            window.AdminUtils.Modal.confirm(
                'Bulk Delete',
                `Are you sure you want to delete ${selectedStudents.size} selected students?`,
                async () => {
                    try {
                        const ids = Array.from(selectedStudents);
                        await window.supabaseClient.from('students').delete().in('id', ids);

                        window.AdminUtils.Toast.success('Deleted', `${ids.length} students removed`);
                        selectedStudents.clear();
                        updateBulkBar();
                        await loadStudents();
                    } catch (e) {
                        console.error(e);
                        window.AdminUtils.Toast.error('Error', 'Failed to delete students');
                    }
                }
            );
        };
    }

    function updateBulkBar() {
        if (bulkBar && selectedCountText) {
            if (selectedStudents.size > 0) {
                bulkBar.style.display = 'block';
                selectedCountText.textContent = selectedStudents.size;
            } else {
                bulkBar.style.display = 'none';
            }
        }
    }

    updateBulkBar();
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

// Get tutors for a specific course
function getTutorsForCourse(courseCode) {
    return allTutorsForStudents.filter(t => t.courses && t.courses.includes(courseCode));
}

// Render per-course tutor assignment
function updateCourseTutorAssignment(currentCourseTutors = {}) {
    const selectedCourses = Array.from(document.querySelectorAll('input[name="student-courses"]:checked')).map(c => c.value);
    const section = document.getElementById('course-tutor-section');
    const list = document.getElementById('course-tutor-list');

    if (selectedCourses.length === 0) {
        section.style.display = 'none';
        list.innerHTML = '<p class="text-muted">Select courses first</p>';
        return;
    }

    section.style.display = 'block';

    list.innerHTML = selectedCourses.map(courseCode => {
        const course = allCoursesForStudents.find(c => c.course_code === courseCode);
        const tutorsForCourse = getTutorsForCourse(courseCode);
        const selectedTutor = currentCourseTutors[courseCode] || '';

        return `
            <div class="course-tutor-item">
                <div class="course-tutor-course">
                    <i class="fa-solid fa-book"></i>
                    <span>${courseCode} - ${course?.course_name || courseCode}</span>
                </div>
                <div class="course-tutor-select">
                    <select name="course-tutor" data-course="${courseCode}">
                        <option value="">Select Tutor</option>
                        ${tutorsForCourse.map(t => `
                            <option value="${t.tutor_id}" ${selectedTutor === t.tutor_id ? 'selected' : ''}>
                                ${t.full_name} (${t.tutor_id})
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
        `;
    }).join('');
}

function renderCoursesCheckboxes(selectedCourses = [], discounts = {}) {
    const list = document.getElementById('student-courses-list');
    courseDiscounts = discounts; // Initialize

    // Remove fee from display - just show course code and name
    list.innerHTML = allCoursesForStudents.map(c => `
        <label class="checkbox-item">
            <input type="checkbox" name="student-courses" value="${c.course_code}" data-fee="${c.fee || 0}" ${selectedCourses.includes(c.course_code) ? 'checked' : ''}>
            <span>${c.course_code} - ${c.course_name}</span>
        </label>
    `).join('');

    // Bind course change events
    document.querySelectorAll('input[name="student-courses"]').forEach(cb => {
        cb.addEventListener('change', () => {
            // Get current course-tutor assignments
            const currentCourseTutors = {};
            document.querySelectorAll('select[name="course-tutor"]').forEach(sel => {
                if (sel.value) {
                    currentCourseTutors[sel.dataset.course] = sel.value;
                }
            });
            updateCourseTutorAssignment(currentCourseTutors);
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
                <div class="fee-item-price">â‚¹${formatNumber(fee)}</div>
                <div class="fee-item-discount">
                    <span>-â‚¹</span>
                    <input type="number" value="${discount}" min="0" max="${fee}" data-course="${code}" class="discount-input">
                </div>
                <div class="fee-item-net" data-net="${code}">â‚¹${formatNumber(net)}</div>
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
            document.querySelector(`.fee-item-net[data-net="${code}"]`).textContent = `â‚¹${formatNumber(net)}`;

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

    totalEl.textContent = `â‚¹${formatNumber(total)}`;
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

    // Render per-course tutor assignment
    updateCourseTutorAssignment(student?.course_tutors || {});

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

    // Collect per-course tutor assignments
    const course_tutors = {};
    const tutors = []; // Keeping array for backward compatibility
    document.querySelectorAll('select[name="course-tutor"]').forEach(sel => {
        if (sel.value) {
            course_tutors[sel.dataset.course] = sel.value;
            if (!tutors.includes(sel.value)) tutors.push(sel.value);
        }
    });

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

    // Ensure every selected course has a tutor assigned
    const missingTutor = courses.some(code => !course_tutors[code]);
    if (missingTutor) {
        Toast.error('Required', 'Assign a tutor for all selected courses');
        return;
    }

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
            course_tutors,
            course_discounts: courseDiscounts,
            demo_scheduled: demoScheduled,
            demo_date: demoDate,
            demo_time: demoTime,
            joining_date: joiningDate,
            batch_time: batchTime,
            fee: totalFee,
            discount: totalDiscount,
            final_fee: finalFee,
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
            const { Activity } = window.AdminUtils;
            if (Activity) {
                await Activity.add('student_added', `${fname} ${lname}`, '../students/');
                if (demoScheduled) {
                    await Activity.add('demo_scheduled', `${fname} ${lname}`, '../students/');
                }
            }

            // Update inquiry status if converting
            const convertingInquiryId = sessionStorage.getItem('converting_inquiry_id');
            if (convertingInquiryId) {
                await window.supabaseClient.from('inquiries').update({ status: 'Converted' }).eq('id', convertingInquiryId);
                sessionStorage.removeItem('converting_inquiry_id');
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


// =====================
// Student Profile Panel
// =====================

let currentProfileStudentId = null;

async function openStudentProfile(studentId) {
    console.log('openStudentProfile called with:', studentId);
    const overlay = document.getElementById('student-profile-overlay');
    const content = document.getElementById('profile-content');
    const footer = document.getElementById('profile-footer');

    if (!overlay || !content) return;

    currentProfileStudentId = studentId;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Show loading
    content.innerHTML = `
        <div class="loading-spinner">
            <i class="fa-solid fa-spinner fa-spin"></i> Loading profile...
        </div>
    `;

    try {
        // Fetch student data
        const { data: student, error: studentError } = await window.supabaseClient
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single();

        if (studentError) throw studentError;

        // Fetch payments for this student
        const { data: payments, error: paymentsError } = await window.supabaseClient
            .from('payments')
            .select('*, courses(course_code, course_name)')
            .eq('student_id', studentId)
            .order('payment_date', { ascending: false });

        if (paymentsError) console.warn('Error loading payments:', paymentsError);

        // Calculate totals
        const totalPaid = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
        const balanceDue = (student.final_fee || 0) - totalPaid;

        // Render profile content
        content.innerHTML = renderProfileContent(student, payments || [], totalPaid, balanceDue);

        // Update footer buttons
        updateProfileFooter(studentId);

        // Bind close events
        bindProfileEvents();

    } catch (e) {
        console.error('Error loading student profile:', e);
        content.innerHTML = `
            <div class="profile-empty-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                <p>Error loading profile. Please try again.</p>
            </div>
        `;
    }
}

function renderProfileContent(student, payments, totalPaid, balanceDue) {
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatCurrency = (num) => 'Rs.' + (num || 0).toLocaleString('en-IN');

    return `
        <!-- Basic Info Section -->
        <div class="profile-section">
            <div class="profile-section-header">
                <i class="fa-solid fa-user"></i> Basic Information
            </div>
            <div class="profile-info-grid">
                <div class="profile-info-item">
                    <span class="profile-info-label">Student ID</span>
                    <span class="profile-info-value">${student.student_id}</span>
                </div>
                <div class="profile-info-item">
                    <span class="profile-info-label">Status</span>
                    <span class="profile-info-value">
                        <i class="fa-solid fa-circle ${student.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}"></i>
                        ${student.status || 'ACTIVE'}
                    </span>
                </div>
                <div class="profile-info-item full-width">
                    <span class="profile-info-label">Full Name</span>
                    <span class="profile-info-value">${student.first_name} ${student.last_name}</span>
                </div>
                <div class="profile-info-item">
                    <span class="profile-info-label">Phone</span>
                    <span class="profile-info-value">${student.phone}</span>
                </div>
                <div class="profile-info-item">
                    <span class="profile-info-label">Email</span>
                    <span class="profile-info-value">${student.email || 'N/A'}</span>
                </div>
                <div class="profile-info-item">
                    <span class="profile-info-label">Joined</span>
                    <span class="profile-info-value">${formatDate(student.joining_date)}</span>
                </div>
                <div class="profile-info-item">
                    <span class="profile-info-label">Batch Time</span>
                    <span class="profile-info-value">${student.batch_time || 'N/A'}</span>
                </div>
            </div>
            <div class="profile-contact-btns">
                <a href="tel:+91${student.phone}" class="profile-contact-btn call">
                    <i class="fa-solid fa-phone"></i> Call
                </a>
                <a href="https://wa.me/91${student.phone.replace(/\D/g, '')}" target="_blank" class="profile-contact-btn whatsapp">
                    <i class="fa-brands fa-whatsapp"></i> WhatsApp
                </a>
            </div>
        </div>
        
        <!-- Enrolled Courses Section -->
        <div class="profile-section">
            <div class="profile-section-header">
                <i class="fa-solid fa-book-open"></i> Enrolled Courses
            </div>
            ${(student.courses || []).length === 0 ? `
                <div class="profile-empty-state">
                    <i class="fa-solid fa-book"></i>
                    <p>No courses enrolled</p>
                </div>
            ` : (student.courses || []).map(code => {
        const tutorId = student.course_tutors?.[code];
        const tutor = allTutorsForStudents.find(t => t.tutor_id === tutorId);
        const course = allCoursesForStudents.find(c => c.course_code === code);
        const discount = student.course_discounts?.[code] || 0;
        const courseFee = course?.fee || 0;

        return `
                    <div class="profile-course-card">
                        <div class="profile-course-header">
                            <span class="profile-course-code">${code}</span>
                            <span class="profile-course-tutor">
                                ${tutor ? `<i class="fa-solid fa-chalkboard-user"></i> ${tutor.full_name}` : '<i class="fa-solid fa-user-slash"></i> No tutor'}
                            </span>
                        </div>
                        <div class="profile-course-details">
                            <span><i class="fa-solid fa-indian-rupee-sign"></i> Fee: ${formatCurrency(courseFee)}</span>
                            ${discount > 0 ? `<span><i class="fa-solid fa-tag"></i> Discount: ${formatCurrency(discount)}</span>` : ''}
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
        
        <!-- Fee Summary Section -->
        <div class="profile-section">
            <div class="profile-section-header">
                <i class="fa-solid fa-wallet"></i> Fee Summary
            </div>
            <div class="profile-fee-grid">
                <div class="profile-fee-item">
                    <div class="profile-fee-label">Total Fee</div>
                    <div class="profile-fee-value">${formatCurrency(student.fee || 0)}</div>
                </div>
                <div class="profile-fee-item">
                    <div class="profile-fee-label">Discount</div>
                    <div class="profile-fee-value">${formatCurrency(student.discount || 0)}</div>
                </div>
                <div class="profile-fee-item highlight">
                    <div class="profile-fee-label">Final Fee</div>
                    <div class="profile-fee-value">${formatCurrency(student.final_fee || 0)}</div>
                </div>
                <div class="profile-fee-item ${balanceDue > 0 ? 'danger' : ''}">
                    <div class="profile-fee-label">Balance Due</div>
                    <div class="profile-fee-value">${formatCurrency(balanceDue)}</div>
                </div>
                <div class="profile-fee-item" style="grid-column: 1 / -1;">
                    <div class="profile-fee-label">Total Paid</div>
                    <div class="profile-fee-value">${formatCurrency(totalPaid)}</div>
                    <div class="profile-fee-count">${payments.length} payment(s)</div>
                </div>
            </div>
        </div>
        
        <!-- Payment History Section -->
        <div class="profile-section">
            <div class="profile-section-header">
                <i class="fa-solid fa-history"></i> Payment History
            </div>
            ${payments.length === 0 ? `
                <div class="profile-empty-state">
                    <i class="fa-solid fa-receipt"></i>
                    <p>No payments recorded yet</p>
                </div>
            ` : `
                <table class="profile-payments-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Mode</th>
                            <th>Ref</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(p => `
                            <tr>
                                <td>${formatDate(p.payment_date)}</td>
                                <td><strong>${formatCurrency(p.amount_paid)}</strong></td>
                                <td>
                                    <span class="profile-payment-mode ${p.payment_mode?.toLowerCase()}">
                                        <i class="fa-solid fa-${p.payment_mode === 'CASH' ? 'money-bill' : 'credit-card'}"></i>
                                        ${p.payment_mode}
                                    </span>
                                </td>
                                <td>${p.reference_id || 'â€”'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `}
        </div>
        
        <!-- Notes Section -->
        ${student.notes ? `
            <div class="profile-section">
                <div class="profile-section-header">
                    <i class="fa-solid fa-sticky-note"></i> Notes
                </div>
                <div class="profile-notes">"${student.notes}"</div>
            </div>
        ` : ''}
    `;
}

function updateProfileFooter(studentId) {
    const editBtn = document.getElementById('profile-edit-btn');
    const paymentBtn = document.getElementById('profile-payment-btn');

    if (editBtn) {
        editBtn.onclick = () => {
            closeStudentProfile();
            openForm(studentId);
        };
    }

    if (paymentBtn) {
        paymentBtn.href = `/payments/record-payment/?student_id=${studentId}`;
    }
}

function closeStudentProfile() {
    const overlay = document.getElementById('student-profile-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
        currentProfileStudentId = null;
    }
}

function bindProfileEvents() {
    const closeBtn = document.getElementById('close-profile-btn');
    const overlay = document.getElementById('student-profile-overlay');

    if (closeBtn) {
        closeBtn.onclick = closeStudentProfile;
    }

    // Close on overlay click (outside panel)
    if (overlay) {
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                closeStudentProfile();
            }
        };
    }

    // Close on Escape key
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape' && currentProfileStudentId) {
            closeStudentProfile();
            document.removeEventListener('keydown', escHandler);
        }
    });
}



