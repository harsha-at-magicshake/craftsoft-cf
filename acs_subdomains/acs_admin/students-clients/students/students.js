﻿let allStudents = [];
let allCoursesForStudents = [];
let allTutorsForStudents = [];
let deleteTargetId = null;
let courseDiscounts = {}; // Store per-course discounts { courseCode: discount }
let currentStatusFilter = 'ALL'; // Status filter: ACTIVE, INACTIVE, ALL

// Pagination State
let currentPage = 1;
const itemsPerPage = window.innerWidth <= 1250 ? 5 : 10;
let selectedStudents = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '/';
        return;
    }

    AdminSidebar.init('students', '/');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Students');
    }

    const admin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, admin);

    // Initial stats with count-up
    initializeStats();

    await loadCoursesForStudents();
    await loadTutorsForStudents();
    await loadStudents();

    bindFormEvents();
    bindDeleteEvents();

    document.getElementById('add-student-btn')?.addEventListener('click', () => openForm());
    document.getElementById('student-search')?.addEventListener('input', handleFilter);
    document.getElementById('status-filter')?.addEventListener('change', handleFilter);
    document.getElementById('sort-order')?.addEventListener('change', handleFilter);

    // Check for prefill from inquiry conversion
    checkPrefill();

    // Check for deep links (Spotlight Search)
    const params = new URLSearchParams(window.location.search);
    const deepLinkId = params.get('id');
    if (deepLinkId) {
        // Clear param so refresh doesn't keep opening it
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);

        // Wait for data to load if needed, but openStudentProfile fetches its own data
        await openStudentProfile(deepLinkId);
    }
});

async function initializeStats() {
    window.AdminUtils.StatsHeader.render('stats-container', [
        { label: 'Total Students', value: 0, icon: 'fa-solid fa-chalkboard', color: 'var(--primary-500)' },
        { label: 'Enrolled Month', value: 0, icon: 'fa-regular fa-pen-to-square', color: 'var(--success)' },
        { label: 'Payments Count', value: 0, icon: 'fa-solid fa-credit-card', color: 'var(--info)' }
    ]);

    try {
        const monthStart = new Date();
        monthStart.setDate(1);
        const monthStartISO = monthStart.toISOString().split('T')[0];

        const [totalCount, monthCount, payCount] = await Promise.all([
            window.supabaseClient.from('students').select('id', { count: 'exact', head: true }),
            window.supabaseClient.from('students').select('id', { count: 'exact', head: true }).gte('created_at', monthStartISO),
            window.supabaseClient.from('payments').select('id', { count: 'exact', head: true })
        ]);

        window.AdminUtils.StatsHeader.render('stats-container', [
            { label: 'Total Students', value: totalCount.count || 0, icon: 'fa-solid fa-chalkboard', color: 'var(--primary-500)' },
            { label: 'Enrolled Month', value: monthCount.count || 0, icon: 'fa-regular fa-pen-to-square', color: 'var(--success)' },
            { label: 'Payments Count', value: payCount.count || 0, icon: 'fa-solid fa-credit-card', color: 'var(--info)' }
        ]);
    } catch (err) {
        console.error('Stats load error:', err);
    }
}

function checkPrefill() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('prefill') === '1') {
        const name = params.get('name') || '';
        const phone = params.get('phone') || '';
        const email = params.get('email') || '';
        const courses = params.get('courses')?.split(',').filter(c => c) || [];
        const inquiryId = params.get('inquiry_id') || '';
        const readableId = params.get('readable_id') || '';

        // Store inquiry ID for later status update
        if (inquiryId) {
            sessionStorage.setItem('converting_inquiry_id', inquiryId);
        }

        // Open form with prefilled data
        openFormWithPrefill(name, phone, email, courses, readableId);

        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

async function openFormWithPrefill(name, phone, email, courses, readableId = '') {
    await openForm(false);

    // Split name into first and last
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    document.getElementById('student-fname').value = firstName;
    document.getElementById('student-lname').value = lastName;
    document.getElementById('student-phone').value = phone;
    document.getElementById('student-email').value = email;

    if (readableId) {
        document.getElementById('student-notes').value = `Inquiry ID: ${readableId}`;
    }

    // Render courses with pre-selected
    renderCoursesCheckboxes(courses, {});

    // Explicitly trigger tutor assignment and fee breakdown
    updateCourseTutorAssignment({});
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
        if (window.innerWidth <= 768) {
            Skeleton.show('students-content', 'cards', 3);
        } else {
            Skeleton.show('students-content', 'table', 5);
        }
    }

    try {
        let query = window.supabaseClient
            .from('students')
            .select('*')
            .is('deleted_at', null)
            .neq('status', 'INACTIVE')
            .order('student_id', { ascending: true });

        const { data: students, error } = await query;

        if (error) throw error;
        allStudents = students || [];
        handleFilter();
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
                        <th width="20%">COURSE(S)</th>
                        <th width="15%" class="text-right">DISCOUNTED FEE</th>
                        <th width="12%" class="text-right">TOTAL</th>
                        <th width="15%" class="text-right">ACTIONS</th>
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
        return `<span class="glass-tag" title="${tutor ? `Tutor: ${tutor.full_name}` : 'No tutor assigned'}">${code}${tutor ? ` (${tutor.full_name.split(' ')[0]})` : ''}</span>`;
    }).join('')}
                                </div>
                            </td>
                            <td class="text-right">
                                ${(s.courses || []).map(code => {
        const course = allCoursesForStudents.find(c => c.course_code === code);
        const netFee = (course?.fee || 0) - (s.course_discounts?.[code] || 0);
        return `<div style="font-size: 0.8rem; color: var(--admin-text-muted);">${code}: ₹${formatNumber(netFee)}</div>`;
    }).join('')}
                            </td>
                            <td class="text-right" style="font-weight: 700; color: var(--primary-color);">₹${formatNumber((s.courses || []).reduce((sum, code) => {
        const course = allCoursesForStudents.find(c => c.course_code === code);
        return sum + ((course?.fee || 0) - (s.course_discounts?.[code] || 0));
    }, 0))}</td>
                            <td class="text-right">
                                <div class="cell-actions" style="justify-content: flex-end;">
                                    <button class="action-btn edit btn-edit-student" data-id="${s.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                                    <button type="button" class="action-btn whatsapp btn-wa-trigger" 
                                        data-id="${s.id}" 
                                        data-name="${s.first_name} ${s.last_name}" 
                                        data-phone="${s.phone}"
                                        data-total="${s.final_fee || 0}"
                                        data-courses="${(s.courses || []).join(', ')}"
                                        title="WhatsApp Hub">
                                        <i class="fa-brands fa-whatsapp"></i>
                                    </button>
                                    ${s.status === 'INACTIVE'
            ? `<button class="action-btn success btn-reactivate-student" data-id="${s.id}" data-name="${s.first_name} ${s.last_name}" title="Reactivate"><i class="fa-solid fa-rotate-left"></i></button>
                                           <button class="action-btn delete btn-perm-delete-student" data-id="${s.id}" data-name="${s.first_name} ${s.last_name}" title="Permanently Delete"><i class="fa-solid fa-trash"></i></button>`
            : `<button class="action-btn delete btn-delete-student" data-id="${s.id}" data-name="${s.first_name} ${s.last_name}" title="Deactivate"><i class="fa-solid fa-user-slash"></i></button>`
        }
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
                        <div class="card-header-left">
                            <input type="checkbox" class="student-checkbox" data-id="${s.id}" ${selectedStudents.has(s.id) ? 'checked' : ''}>
                            <span class="card-id-badge clickable btn-view-profile" data-id="${s.id}">${s.student_id}</span>
                        </div>
                    </div>
                    <div class="card-body" style="text-align: left;">
                        <h4 class="card-name" style="margin-bottom: 0.75rem;">${s.first_name} ${s.last_name}</h4>
                        <div class="card-info-row">
                            <div class="card-info-item" style="color: var(--admin-text-muted);"><i class="fa-solid fa-phone" style="color: #10b981;"></i> ${s.phone}</div>
                            <div class="card-info-item" style="color: var(--admin-text-muted); margin-top: 4px;"><i class="fa-solid fa-book" style="color: #6366f1;"></i> ${(s.courses || []).join(', ')}</div>
                        </div>

                        <div style="margin: 1rem 0; border-top: 1px dashed var(--admin-input-border); opacity: 0.5;"></div>

                        <div class="card-breakdown">
                            ${(s.courses || []).map(code => {
            const course = allCoursesForStudents.find(c => c.course_code === code);
            const netFee = (course?.fee || 0) - (s.course_discounts?.[code] || 0);
            return `
                                    <div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.25rem;">
                                        <span style="color: var(--admin-text-muted);">${code}</span>
                                        <span style="font-weight: 500;">₹${formatNumber(netFee)}</span>
                                    </div>
                                `;
        }).join('')}
                            <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-weight: 700; color: var(--primary-color); font-size: 1rem;">
                                <span>Total</span>
                                <span>₹${formatNumber((s.courses || []).reduce((sum, code) => {
            const course = allCoursesForStudents.find(c => c.course_code === code);
            return sum + ((course?.fee || 0) - (s.course_discounts?.[code] || 0));
        }, 0))}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="card-action-btn edit btn-edit-student" data-id="${s.id}">
                            <i class="fa-solid fa-pen"></i> <span>Edit</span>
                        </button>
                        <button type="button" class="card-action-btn whatsapp btn-wa-trigger" 
                            data-id="${s.id}" 
                            data-name="${s.first_name} ${s.last_name}" 
                            data-phone="${s.phone}"
                            data-total="${s.final_fee || 0}"
                            data-courses="${(s.courses || []).join(', ')}">
                            <i class="fa-brands fa-whatsapp"></i> <span>WhatsApp</span>
                        </button>
                        ${s.status === 'INACTIVE'
                ? `
                            <button class="card-action-btn success btn-reactivate-student" data-id="${s.id}" data-name="${s.first_name} ${s.last_name}">
                                <i class="fa-solid fa-rotate-left"></i> <span>Reactivate</span>
                            </button>
                            <button class="card-action-btn delete btn-perm-delete-student" data-id="${s.id}" data-name="${s.first_name} ${s.last_name}">
                                <i class="fa-solid fa-trash"></i> <span>Forever</span>
                            </button>
                            `
                : `
                            <button class="card-action-btn delete btn-delete-student" data-id="${s.id}" data-name="${s.first_name} ${s.last_name}">
                                <i class="fa-solid fa-user-slash"></i> <span>Deactivate</span>
                            </button>
                            `
            }
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

    // Reactivate and Permanent Delete buttons (for inactive students)
    document.querySelectorAll('.btn-reactivate-student').forEach(btn =>
        btn.addEventListener('click', () => reactivateStudent(btn.dataset.id, btn.dataset.name)));
    document.querySelectorAll('.btn-perm-delete-student').forEach(btn =>
        btn.addEventListener('click', () => showPermDeleteConfirm(btn.dataset.id, btn.dataset.name)));

    // WhatsApp Hub trigger
    document.querySelectorAll('.btn-wa-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showWhatsAppModal(
                btn.dataset.name,
                btn.dataset.phone,
                btn.dataset.total,
                btn.dataset.courses
            );
        });
    });


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

                        // Cascade delete child records
                        await window.supabaseClient.from('receipts').delete().in('student_id', ids);
                        await window.supabaseClient.from('payments').delete().in('student_id', ids);

                        const { error } = await window.supabaseClient.from('students').delete().in('id', ids);
                        if (error) throw error;

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

    const bulkCancelBtn = document.getElementById('bulk-cancel-btn');
    if (bulkCancelBtn) {
        bulkCancelBtn.onclick = () => {
            selectedStudents.clear();
            if (selectAll) selectAll.checked = false;
            checkboxes.forEach(cb => cb.checked = false);
            updateBulkBar();
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


function handleFilter() {
    const q = document.getElementById('student-search')?.value.toLowerCase() || '';
    const status = document.getElementById('status-filter')?.value || 'ALL';
    const sort = document.getElementById('sort-order')?.value || 'newest';

    const qDigits = q.replace(/[^\d]/g, '');

    let filtered = allStudents.filter(s => {
        const nameMatch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(q);
        const idMatch = (s.student_id || '').toLowerCase().includes(q);
        const phoneDigits = (s.phone || '').replace(/[^\d]/g, '');
        const phoneMatch = qDigits.length >= 3 && phoneDigits.includes(qDigits);
        const searchMatch = !q || nameMatch || idMatch || phoneMatch;

        const statusMatch = status === 'ALL' || s.status === status;

        return searchMatch && statusMatch;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sort === 'name-asc') return `${a.first_name} ${a.last_name || ''}`.localeCompare(`${b.first_name} ${b.last_name || ''}`);
        if (sort === 'name-desc') return `${b.first_name} ${b.last_name || ''}`.localeCompare(`${a.first_name} ${a.last_name || ''}`);
        return 0;
    });

    currentPage = 1;
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
    saveBtn?.addEventListener('click', showEnrollmentConfirmation);

    // Confirmation modal events
    document.getElementById('close-enrollment-confirm')?.addEventListener('click', hideEnrollmentConfirmation);
    document.getElementById('cancel-enrollment-confirm')?.addEventListener('click', hideEnrollmentConfirmation);
    document.getElementById('confirm-enrollment-btn')?.addEventListener('click', saveStudent);

    // Demo toggle
    document.querySelectorAll('input[name="demo-scheduled"]').forEach(r => {
        r.addEventListener('change', function () {
            document.querySelector('.demo-fields').style.display = this.value === 'yes' ? 'block' : 'none';
        });
    });

    // Phone input with flag transformation
    initPhoneInputComponent('student');
}

function showEnrollmentConfirmation() {
    const { Toast } = window.AdminUtils;

    // Gather form data for validation first
    const fname = document.getElementById('student-fname').value.trim();
    const lname = document.getElementById('student-lname').value.trim();
    const phone = document.getElementById('student-phone').value.trim();
    const courses = selectedCourseCodes;

    // Basic validation before showing confirmation
    if (!fname || !lname) { Toast.error('Required', 'Name required'); return; }
    if (!phone || phone.length < 6) { Toast.error('Required', 'Valid phone number required'); return; }
    if (courses.length === 0) { Toast.error('Required', 'Select at least one course'); return; }

    // Check tutor assignments
    const course_tutors = {};
    document.querySelectorAll('select[name="course-tutor"]').forEach(sel => {
        if (sel.value) course_tutors[sel.dataset.course] = sel.value;
    });
    const missingTutor = courses.some(code => !course_tutors[code]);
    if (missingTutor) {
        Toast.error('Required', 'Assign a tutor for all selected courses');
        return;
    }

    // Build confirmation summary
    const summaryDiv = document.getElementById('enrollment-summary');
    const email = document.getElementById('student-email').value.trim();

    let coursesList = '';
    let totalFee = 0;
    courses.forEach(code => {
        const course = allCoursesForStudents.find(c => c.course_code === code);
        const tutor = allTutorsForStudents.find(t => t.tutor_id === course_tutors[code]);
        const discount = courseDiscounts[code] || 0;
        const netFee = (course?.fee || 0) - discount;
        totalFee += netFee;

        // Get per-course metadata from dynamic form
        const metaItem = document.querySelector(`.course-meta-item[data-course="${code}"]`);
        const batch = metaItem?.querySelector('input[name="course-batch"]')?.value || '';
        const joining = metaItem?.querySelector('input[name="course-joining"]')?.value || '';
        const isDemo = metaItem?.querySelector('input[name="course-demo-check"]')?.checked || false;
        const demoDate = metaItem?.querySelector('input[name="course-demo-date"]')?.value || '';
        const demoTime = metaItem?.querySelector('input[name="course-demo-time"]')?.value || '';

        coursesList += `
            <div class="summary-course-item" style="flex-direction: column; align-items: stretch; gap: 0.5rem;">
                <div class="summary-course-main" style="display: flex; align-items: center; gap: 0.75rem;">
                    <span class="course-badge">${code}</span>
                    <span class="course-name">${course?.course_name || code}</span>
                    <span class="course-tutor"><i class="fa-solid fa-chalkboard-user"></i> ${tutor?.full_name || 'Unknown'}</span>
                    <span class="course-fee" style="margin-left: auto;">₹${formatNumber(netFee)}</span>
                </div>
                ${(batch || joining || isDemo) ? `
                <div class="summary-course-meta" style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--admin-text-muted); padding-left: 0.5rem;">
                    ${batch ? `<span><i class="fa-solid fa-clock" style="color: #6366f1;"></i> ${batch}</span>` : ''}
                    ${joining ? `<span><i class="fa-solid fa-calendar-check" style="color: #10b981;"></i> ${joining}</span>` : ''}
                    ${isDemo ? `<span><i class="fa-solid fa-play-circle" style="color: #f59e0b;"></i> Demo: ${demoDate}${demoTime ? ' at ' + demoTime : ''}</span>` : ''}
                </div>
                ` : ''}
            </div>
        `;
    });

    summaryDiv.innerHTML = `
        <div class="summary-section">
            <div class="summary-label">Student</div>
            <div class="summary-value">${fname} ${lname}</div>
        </div>
        <div class="summary-section">
            <div class="summary-label">Phone</div>
            <div class="summary-value">${phone}</div>
        </div>
        ${email ? `<div class="summary-section"><div class="summary-label">Email</div><div class="summary-value">${email}</div></div>` : ''}
        <div class="summary-divider"></div>
        <div class="summary-section">
            <div class="summary-label">Enrolled Courses</div>
        </div>
        <div class="summary-courses">
            ${coursesList}
        </div>
        <div class="summary-total">
            <span>Total Fee</span>
            <span class="total-amount">₹${formatNumber(totalFee)}</span>
        </div>
    `;

    document.getElementById('enrollment-confirm-overlay').classList.add('active');
}

function hideEnrollmentConfirmation() {
    document.getElementById('enrollment-confirm-overlay').classList.remove('active');
}

// Initialize phone input component with flag transformation
function initPhoneInputComponent(prefix) {
    const codeInput = document.getElementById(`${prefix}-country-code`);
    const flagBtn = document.getElementById(`${prefix}-flag-btn`);
    const phoneInput = document.getElementById(`${prefix}-phone`);

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

    // Auto-focus phone number after entering code
    codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey) {
            // Let blur handle the flag transformation
        }
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

// Render per-course tutor assignment with batch/demo metadata
function updateCourseTutorAssignment(currentCourseTutors = {}, courseMetadata = {}) {
    const selectedCourses = selectedCourseCodes;
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
        const meta = courseMetadata[courseCode] || {};

        return `
            <div class="course-meta-item" data-course="${courseCode}">
                <div class="course-meta-header">
                    <i class="fa-solid fa-book"></i>
                    <span>${courseCode} - ${course?.course_name || courseCode}</span>
                </div>
                <div class="course-meta-grid">
                    <div class="meta-field">
                        <label>Tutor <span class="required">*</span></label>
                        <select name="course-tutor" data-course="${courseCode}">
                            <option value="">Select Tutor</option>
                            ${tutorsForCourse.map(t => `
                                <option value="${t.tutor_id}" ${selectedTutor === t.tutor_id ? 'selected' : ''}>
                                    ${t.full_name} (${t.tutor_id})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="meta-field">
                        <label>Batch Time</label>
                        <input type="time" name="course-batch" value="${meta.batch_time || ''}">
                    </div>
                    <div class="meta-field">
                        <label>Joining Date</label>
                        <input type="date" name="course-joining" value="${meta.joining_date || ''}">
                    </div>
                </div>
                <div class="course-meta-demo">
                    <label class="demo-toggle">
                        <input type="checkbox" name="course-demo-check" ${meta.demo_scheduled ? 'checked' : ''}>
                        <span>Demo Scheduled?</span>
                    </label>
                    <div class="course-demo-fields" style="display: ${meta.demo_scheduled ? 'flex' : 'none'};">
                        <div class="meta-field">
                            <label>Demo Date</label>
                            <input type="date" name="course-demo-date" value="${meta.demo_date || ''}">
                        </div>
                        <div class="meta-field">
                            <label>Demo Time</label>
                            <input type="time" name="course-demo-time" value="${meta.demo_time || ''}">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Bind demo toggle events
    list.querySelectorAll('input[name="course-demo-check"]').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const demoFields = this.closest('.course-meta-demo').querySelector('.course-demo-fields');
            demoFields.style.display = this.checked ? 'flex' : 'none';
        });
    });
}
let selectedCourseCodes = [];

function renderCoursesCheckboxes(selectedCourses = [], discounts = {}) {
    const list = document.getElementById('student-courses-list');
    courseDiscounts = discounts;
    selectedCourseCodes = [...selectedCourses];

    list.innerHTML = `
        <div class="course-picker">
            <div class="course-search-dropdown">
                <div class="search-input-wrapper">
                    <i class="fa-solid fa-search"></i>
                    <input type="text" id="course-search-input" placeholder="Search and select courses..." autocomplete="off">
                    <i class="fa-solid fa-chevron-down dropdown-arrow"></i>
                </div>
                <div class="dropdown-list" id="course-dropdown-list">
                    ${allCoursesForStudents.map(c => `
                        <div class="dropdown-item ${selectedCourseCodes.includes(c.course_code) ? 'selected' : ''}" 
                             data-code="${c.course_code}" 
                             data-name="${c.course_name}"
                             data-fee="${c.fee || 0}"
                             data-search="${c.course_name.toLowerCase()} ${c.course_code.toLowerCase()}">
                            <span class="item-code">${c.course_code}</span>
                            <span class="item-name">${c.course_name}</span>
                            <i class="fa-solid fa-check check-icon"></i>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="selected-pills" id="selected-courses-pills">
                ${renderCoursePills()}
            </div>
        </div>
    `;

    bindCoursePickerEvents();
    updateCourseTutorAssignment({});
    updateFeeBreakdown();
}

function renderCoursePills() {
    if (selectedCourseCodes.length === 0) {
        return '<span class="no-selection-hint">No courses selected</span>';
    }
    return selectedCourseCodes.map(code => {
        const course = allCoursesForStudents.find(c => c.course_code === code);
        return `
            <span class="course-pill" data-code="${code}">
                <span class="pill-code">${code}</span>
                <span class="pill-name">${course?.course_name || code}</span>
                <button type="button" class="pill-remove" data-code="${code}">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </span>
        `;
    }).join('');
}

function bindCoursePickerEvents() {
    const searchInput = document.getElementById('course-search-input');
    const dropdownList = document.getElementById('course-dropdown-list');
    const wrapper = document.querySelector('.course-search-dropdown');

    // Toggle dropdown on input focus
    searchInput?.addEventListener('focus', () => {
        wrapper.classList.add('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!wrapper?.contains(e.target)) {
            wrapper?.classList.remove('open');
        }
    });

    // Filter dropdown items
    searchInput?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('#course-dropdown-list .dropdown-item').forEach(item => {
            const searchText = item.dataset.search || '';
            item.style.display = searchText.includes(query) ? 'flex' : 'none';
        });
    });

    // Select/deselect course from dropdown
    document.querySelectorAll('#course-dropdown-list .dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const code = item.dataset.code;
            toggleCourseSelection(code);
        });
    });

    // Remove pill on X click
    document.querySelectorAll('.pill-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const code = btn.dataset.code;
            toggleCourseSelection(code);
        });
    });
}

function toggleCourseSelection(code) {
    const index = selectedCourseCodes.indexOf(code);
    if (index > -1) {
        selectedCourseCodes.splice(index, 1);
        delete courseDiscounts[code];
    } else {
        selectedCourseCodes.push(code);
    }

    // Update UI
    const pillsContainer = document.getElementById('selected-courses-pills');
    pillsContainer.innerHTML = renderCoursePills();

    // Update dropdown item state
    document.querySelectorAll('#course-dropdown-list .dropdown-item').forEach(item => {
        if (selectedCourseCodes.includes(item.dataset.code)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    // Re-bind pill remove buttons
    document.querySelectorAll('.pill-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCourseSelection(btn.dataset.code);
        });
    });

    // Get current course-tutor assignments before updating
    const currentCourseTutors = {};
    document.querySelectorAll('select[name="course-tutor"]').forEach(sel => {
        if (sel.value) {
            currentCourseTutors[sel.dataset.course] = sel.value;
        }
    });

    updateCourseTutorAssignment(currentCourseTutors);
    updateFeeBreakdown();
}

// Helper to get selected courses (used by saveStudent)
function getSelectedCourses() {
    return selectedCourseCodes;
}

function updateFeeBreakdown() {
    const breakdown = document.getElementById('fee-breakdown');
    const totalRow = document.getElementById('fee-total-row');
    const totalEl = document.getElementById('fee-total');

    if (selectedCourseCodes.length === 0) {
        breakdown.innerHTML = '<p class="text-muted">Select courses to see fee breakdown</p>';
        totalRow.style.display = 'none';
        return;
    }

    let html = '';
    selectedCourseCodes.forEach(code => {
        const course = allCoursesForStudents.find(c => c.course_code === code);
        const fee = course?.fee || 0;
        const discount = courseDiscounts[code] || 0;
        const net = Math.max(0, fee - discount);

        html += `
            <div class="fee-item">
                <div class="fee-item-name">${course?.course_name || code}</div>
                <div class="fee-item-price"><i class="fa-solid fa-indian-rupee-sign"></i>${formatNumber(fee)}</div>
                <div class="fee-item-discount">
                    <span>-<i class="fa-solid fa-indian-rupee-sign"></i></span>
                    <input type="number" value="${discount}" min="0" max="${fee}" data-course="${code}" class="discount-input">
                </div>
                <div class="fee-item-net" data-net="${code}"><i class="fa-solid fa-indian-rupee-sign"></i>${formatNumber(net)}</div>
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
            document.querySelector(`.fee-item-net[data-net="${code}"]`).innerHTML = `<i class="fa-solid fa-indian-rupee-sign"></i>${formatNumber(net)}`;

            recalculateTotal();
        });
    });
}

function recalculateTotal() {
    const totalEl = document.getElementById('fee-total');

    let total = 0;
    selectedCourseCodes.forEach(code => {
        const course = allCoursesForStudents.find(c => c.course_code === code);
        const fee = course?.fee || 0;
        const discount = courseDiscounts[code] || 0;
        total += Math.max(0, fee - discount);
    });

    totalEl.innerHTML = `<i class="fa-solid fa-indian-rupee-sign"></i>${formatNumber(total)}`;
}

// =====================
// WhatsApp Hub Modal
// =====================
let currentWaData = { name: '', phone: '', total: 0, courses: '' };
let currentWaAction = '';

function showWhatsAppModal(name, phone, total, courses) {
    currentWaData = { name, phone, total, courses };
    currentWaAction = '';

    const overlay = document.getElementById('whatsapp-modal-overlay');
    document.getElementById('wa-student-name').textContent = name;
    document.getElementById('wa-student-phone').textContent = phone;
    document.getElementById('wa-message-section').style.display = 'none';
    document.getElementById('send-wa-btn').style.display = 'none';

    // Reset template cards
    document.querySelectorAll('.wa-template-card').forEach(card => card.classList.remove('active'));

    // Bind template card clicks
    document.querySelectorAll('.wa-template-card').forEach(card => {
        card.onclick = () => selectWaTemplate(card.dataset.action);
    });

    // Bind modal close/cancel
    document.getElementById('close-wa-modal').onclick = hideWaModal;
    document.getElementById('cancel-wa-modal').onclick = hideWaModal;
    document.getElementById('send-wa-btn').onclick = sendWaMessage;

    // Show modal using active class (matching modals.css pattern)
    overlay.classList.add('active');
}

function hideWaModal() {
    document.getElementById('whatsapp-modal-overlay').classList.remove('active');
}

function selectWaTemplate(action) {
    currentWaAction = action;
    const { name, total, courses } = currentWaData;
    let message = '';

    // Highlight selected card
    document.querySelectorAll('.wa-template-card').forEach(card => {
        card.classList.toggle('active', card.dataset.action === action);
    });

    if (action === 'payment') {
        message = `Hi ${name.split(' ')[0]},\n\nThank you for your payment of ₹${formatNumber(parseInt(total || 0))}! 🎉\n\nYour enrollment for ${courses} is confirmed. We're excited to have you onboard!\n\nBest regards,\nCraftSoft Academy`;
    } else if (action === 'reminder') {
        message = `Hi ${name.split(' ')[0]},\n\nThis is a friendly reminder regarding your pending balance of ₹${formatNumber(parseInt(total || 0))} for ${courses}.\n\nPlease clear the dues at your earliest convenience to continue enjoying uninterrupted sessions.\n\nBest regards,\nCraftSoft Academy`;
    } else if (action === 'direct') {
        message = `Hi ${name.split(' ')[0]}, `;
    }

    document.getElementById('wa-message-textarea').value = message;
    document.getElementById('wa-message-section').style.display = 'block';
    document.getElementById('send-wa-btn').style.display = 'flex';
}

function sendWaMessage() {
    const message = document.getElementById('wa-message-textarea').value;
    const cleanPhone = currentWaData.phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    hideWaModal();
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
    document.getElementById('student-notes').value = '';
    courseDiscounts = {};

    let student = null;
    let courseMetadata = {};

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

        // Parse and populate phone fields
        const { Validators } = window.AdminUtils;
        const parsed = Validators.parseStoredPhone(student.phone);
        document.getElementById('student-country-code').value = parsed.code;
        document.getElementById('student-phone').value = parsed.number;

        // Show flag button for existing country code
        const flagBtn = document.getElementById('student-flag-btn');
        const codeInput = document.getElementById('student-country-code');
        const countryInfo = Validators.getFlagForCode(parsed.code);
        flagBtn.querySelector('.flag-emoji').textContent = countryInfo?.flag || '🌍';
        flagBtn.querySelector('.code-text').textContent = parsed.code;
        codeInput.style.display = 'none';
        flagBtn.style.display = 'flex';

        document.getElementById('student-email').value = student.email || '';
        document.getElementById('student-notes').value = student.notes || '';

        // Load course discounts from student data
        courseDiscounts = student.course_discounts || {};

        // Smart Migration: Build courseMetadata from new JSONB or fallback to old global fields
        if (student.course_metadata && Object.keys(student.course_metadata).length > 0) {
            courseMetadata = student.course_metadata;
        } else if (student.courses && student.courses.length > 0) {
            // Migrate old data: apply global fields to all courses
            student.courses.forEach(code => {
                courseMetadata[code] = {
                    tutor: student.course_tutors?.[code] || '',
                    batch_time: student.batch_time || '',
                    joining_date: student.joining_date || '',
                    demo_scheduled: student.demo_scheduled || false,
                    demo_date: student.demo_date || '',
                    demo_time: student.demo_time || ''
                };
            });
        }
    } else {
        // New student: reset phone fields to default
        document.getElementById('student-country-code').value = '+91';
        document.getElementById('student-country-code').style.display = 'block';
        document.getElementById('student-flag-btn').style.display = 'none';
    }

    // Render courses checkboxes
    renderCoursesCheckboxes(student?.courses || [], courseDiscounts);

    // Render per-course tutor/metadata assignment with Smart Migration data
    updateCourseTutorAssignment(student?.course_tutors || {}, courseMetadata);

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

    // Get phone from split fields
    const countryCode = document.getElementById('student-country-code').value.trim();
    const phoneNumber = document.getElementById('student-phone').value.trim();
    const phone = phoneNumber; // Raw number for validation

    const email = document.getElementById('student-email').value.trim();
    const courses = selectedCourseCodes;


    // Collect per-course metadata (Tutor, Batch, Demo) from dynamic form
    const course_metadata = {};
    const course_tutors = {};
    const tutors = [];

    document.querySelectorAll('.course-meta-item').forEach(item => {
        const code = item.dataset.course;
        const tutorId = item.querySelector('select[name="course-tutor"]').value;
        const batch = item.querySelector('input[name="course-batch"]').value;
        const joining = item.querySelector('input[name="course-joining"]').value;
        const isDemo = item.querySelector('input[name="course-demo-check"]').checked;
        const dDate = item.querySelector('input[name="course-demo-date"]').value;
        const dTime = item.querySelector('input[name="course-demo-time"]').value;

        course_metadata[code] = {
            tutor: tutorId,
            batch_time: batch,
            joining_date: joining,
            demo_scheduled: isDemo,
            demo_date: isDemo ? dDate : null,
            demo_time: isDemo ? dTime : null
        };

        if (tutorId) {
            course_tutors[code] = tutorId;
            if (!tutors.includes(tutorId)) tutors.push(tutorId);
        }
    });

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
    const { Validators } = window.AdminUtils;
    if (!fname || !lname) { Toast.error('Required', 'Name required'); return; }
    if (!phone || phone.length < 6) { Toast.error('Required', 'Valid phone number required'); return; }
    if (courses.length === 0) { Toast.error('Required', 'Select at least one course'); return; }

    // Format phone for storage
    const formattedPhone = Validators.formatPhoneForStorage(phoneNumber, countryCode);

    // Ensure every selected course has a tutor assigned
    const missingTutor = courses.some(code => !course_metadata[code]?.tutor);
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
            phone: formattedPhone,
            email: email || null,
            courses,
            tutors,
            course_tutors,
            course_metadata,
            course_discounts: courseDiscounts,
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
            // Generate new ID - Find first available gap in sequence
            const { data: allStudents } = await window.supabaseClient
                .from('students')
                .select('student_id')
                .order('student_id', { ascending: true });

            // Extract all existing numbers
            const usedNumbers = new Set();
            if (allStudents?.length > 0) {
                allStudents.forEach(s => {
                    const m = s.student_id.match(/St-ACS-(\d+)/);
                    if (m) usedNumbers.add(parseInt(m[1]));
                });
            }

            // Find first available number (gap or next)
            let nextNum = 1;
            while (usedNumbers.has(nextNum)) {
                nextNum++;
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
        hideEnrollmentConfirmation();
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
    document.getElementById('delete-name').textContent = name;
    document.getElementById('delete-overlay').classList.add('active');
}

function hideDeleteConfirm() {
    deleteTargetId = null;
    document.getElementById('delete-overlay').classList.remove('active');
}

function showPermDeleteConfirm(id, name) {
    deleteTargetId = id;
    const overlay = document.getElementById('perm-delete-overlay');
    const input = document.getElementById('perm-delete-confirm-input');
    const btn = document.getElementById('confirm-perm-delete-btn');

    document.getElementById('perm-delete-name').textContent = name;
    input.value = '';
    btn.disabled = true;
    overlay.classList.add('active');
    input.focus();
}

function hidePermDeleteConfirm() {
    deleteTargetId = null;
    document.getElementById('perm-delete-overlay').classList.remove('active');
}

async function confirmDelete() {
    if (!deleteTargetId) return;
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('confirm-delete-btn');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        console.log('Soft-deleting student with id:', deleteTargetId);

        // SOFT DELETE: Move to Recovery Center
        const { error: studentError } = await window.supabaseClient
            .from('students')
            .update({
                deleted_at: new Date().toISOString()
            })
            .eq('id', deleteTargetId);

        if (studentError) {
            console.error('Student deactivation error:', studentError);
            throw studentError;
        }

        Toast.success('Deleted', 'Student moved to Recovery Center.');
        hideDeleteConfirm();
        await loadStudents();
    } catch (e) {
        console.error('Deactivation failed:', e);

        let errorMsg = 'Failed to deactivate student';
        if (e.message?.includes('RLS') || e.code === 'PGRST301') {
            errorMsg = 'Permission denied. Check your admin access.';
        } else if (e.message) {
            errorMsg = e.message;
        }

        Toast.error('Error', errorMsg);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Deactivate';
    }
}

function showRestoreConfirm(id, name) {
    deleteTargetId = id;
    document.getElementById('restore-student-name').textContent = name;
    document.getElementById('restore-modal').classList.add('active');
}

function hideRestoreConfirm() {
    deleteTargetId = null;
    document.getElementById('restore-modal').classList.remove('active');
}

async function confirmRestore() {
    if (!deleteTargetId) return;
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('confirm-restore-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Restoring...';

    try {
        const { error } = await window.supabaseClient
            .from('students')
            .update({
                status: 'ACTIVE',
                deleted_at: null
            })
            .eq('id', deleteTargetId);

        if (error) throw error;

        Toast.success('Reactivated', 'Student is now active again.');
        hideRestoreConfirm();
        await loadStudents();
    } catch (e) {
        console.error('Reactivation failed:', e);
        Toast.error('Error', 'Failed to reactivate student');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Restore Student';
    }
}

// Reactivate an inactive student
async function reactivateStudent(id, name) {
    showRestoreConfirm(id, name);
}

// Logic for permanent deletion from the custom modal
async function confirmPermDelete() {
    if (!deleteTargetId) return;
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('confirm-perm-delete-btn');
    const name = document.getElementById('perm-delete-name').textContent;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    try {
        // Delete associated receipts
        await window.supabaseClient.from('receipts').delete().eq('student_id', deleteTargetId);

        // Delete associated payments
        await window.supabaseClient.from('payments').delete().eq('student_id', deleteTargetId);

        // Delete the student
        const { error } = await window.supabaseClient.from('students').delete().eq('id', deleteTargetId);

        if (error) throw error;

        Toast.success('Permanently Deleted', `${name} and all records removed.`);
        hidePermDeleteConfirm();
        await loadStudents();
    } catch (e) {
        console.error('Permanent delete failed:', e);
        Toast.error('Error', 'Failed to permanently delete student');
        btn.disabled = false;
        btn.innerHTML = 'Delete Forever';
    }
}


// =====================
// Student Profile Panel
// =====================

let currentProfileStudentId = null;
let profilePaymentsPage = 1;
const profilePaymentsPerPage = 5;
let allProfilePayments = [];
let currentProfileStudent = null;
let profileTotalPaid = 0;
let profileBalanceDue = 0;

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

        // Fetch payments for this student - simplified query to be ultra-safe
        const { data: payments, error: paymentsError } = await window.supabaseClient
            .from('payments')
            .select('*')
            .eq('student_id', studentId)
            .order('payment_date', { ascending: false });

        if (paymentsError) console.warn('Error loading payments:', paymentsError);

        // Store data globally for pagination
        allProfilePayments = payments || [];
        currentProfileStudent = student;
        profileTotalPaid = allProfilePayments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
        profileBalanceDue = (student.final_fee || student.fee || 0) - profileTotalPaid;
        profilePaymentsPage = 1;

        // Render profile content
        content.innerHTML = renderProfileContent(currentProfileStudent, allProfilePayments, profileTotalPaid, profileBalanceDue);

        // Update footer buttons
        updateProfileFooter(studentId);

        // Bind close events and payment pagination
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

    const formatCurrency = (num) => '<i class=\"fa-solid fa-indian-rupee-sign\"></i>' + (num || 0).toLocaleString('en-IN');

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
                <a href="tel:${student.phone.replace(/[\s\-]/g, '')}" class="profile-contact-btn call">
                    <i class="fa-solid fa-phone"></i> Call
                </a>
                <a href="https://wa.me/${student.phone.replace(/\D/g, '')}" target="_blank" class="profile-contact-btn whatsapp">
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

        // Get per-course metadata
        const meta = student.course_metadata?.[code] || {};
        const batchTime = meta.batch_time || student.batch_time || '';
        const joiningDate = meta.joining_date || student.joining_date || '';
        const demoScheduled = meta.demo_scheduled || false;
        const demoDate = meta.demo_date || '';
        const demoTime = meta.demo_time || '';

        return `
                    <div class="profile-course-card">
                        <div class="profile-course-header">
                            <span class="profile-course-code">${code}</span>
                            <span class="profile-course-tutor">
                                ${tutor ? `<i class="fa-solid fa-chalkboard-user"></i> ${tutor.full_name}` : '<i class="fa-solid fa-user-slash"></i> No tutor'}
                            </span>
                        </div>
                        <div class="profile-course-details">
                            <span>Fee: ${formatCurrency(courseFee)}</span>
                            ${discount > 0 ? `<span>Discount: ${formatCurrency(discount)}</span>` : ''}
                        </div>
                        ${(batchTime || joiningDate) ? `
                        <div class="profile-course-meta-row">
                            ${batchTime ? `<span class="profile-meta-info"><i class="fa-solid fa-clock"></i> ${batchTime}</span>` : ''}
                            ${joiningDate ? `<span class="profile-meta-info"><i class="fa-solid fa-calendar-check"></i> ${joiningDate}</span>` : ''}
                        </div>
                        ` : ''}
                        ${demoScheduled ? `
                        <div class="profile-demo-tag">
                            <i class="fa-solid fa-play-circle"></i> Demo: ${demoDate}${demoTime ? ' at ' + demoTime : ''}
                        </div>
                        ` : ''}
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
            ` : (() => {
            const totalPages = Math.ceil(payments.length / profilePaymentsPerPage);
            const start = (profilePaymentsPage - 1) * profilePaymentsPerPage;
            const paginatedPayments = payments.slice(start, start + profilePaymentsPerPage);

            return `
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
                        ${paginatedPayments.map(p => `
                            <tr>
                                <td>${formatDate(p.payment_date)}</td>
                                <td><strong>${formatCurrency(p.amount_paid)}</strong></td>
                                <td>
                                    <span class="profile-payment-mode ${p.payment_mode?.toLowerCase()}">
                                        <i class="fa-solid fa-${p.payment_mode === 'CASH' ? 'money-bill' : 'credit-card'}"></i>
                                        ${p.payment_mode}
                                    </span>
                                </td>
                                <td>${p.reference_id || '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${totalPages > 1 ? `
                    <div class="profile-pagination">
                        <button class="profile-pagination-btn" id="profile-prev-page" ${profilePaymentsPage === 1 ? 'disabled' : ''}>
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <span class="profile-pagination-info">Page ${profilePaymentsPage} of ${totalPages}</span>
                        <button class="profile-pagination-btn" id="profile-next-page" ${profilePaymentsPage === totalPages ? 'disabled' : ''}>
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                ` : ''}
                `;
        })()}
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

    // Payment history pagination
    const prevBtn = document.getElementById('profile-prev-page');
    const nextBtn = document.getElementById('profile-next-page');

    if (prevBtn) {
        prevBtn.onclick = () => {
            if (profilePaymentsPage > 1) {
                profilePaymentsPage--;
                rerenderProfileContent();
            }
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            const totalPages = Math.ceil(allProfilePayments.length / profilePaymentsPerPage);
            if (profilePaymentsPage < totalPages) {
                profilePaymentsPage++;
                rerenderProfileContent();
            }
        };
    }
}

function rerenderProfileContent() {
    const content = document.getElementById('profile-content');
    if (content && currentProfileStudent) {
        content.innerHTML = renderProfileContent(currentProfileStudent, allProfilePayments, profileTotalPaid, profileBalanceDue);
        bindProfileEvents();
    }
}



