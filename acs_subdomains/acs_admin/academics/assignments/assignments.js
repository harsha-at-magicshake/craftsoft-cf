/**
 * Manage Assignments - Admin Logic
 * Handles broadcasting tasks to courses and managing extensions.
 * S3-Ready Architecture for unlimited scaling.
 */

(async function () {
    // State
    let allCourses = [];
    let allStudents = [];
    let allAssignments = [];
    let selectedFile = null;
    let currentDeleteId = null;
    let currentAdmin = null;
    let currentPage = 1;
    const perPage = 3;

    let courseSearchableSelect = null;
    let studentSearchableSelect = null;

    // DOM Elements
    const courseSelect = document.getElementById('course-select');
    const studentSelect = document.getElementById('student-select');
    const studentSelectGroup = document.getElementById('student-select-group');
    const studentHint = document.getElementById('student-hint');
    const publishBtn = document.getElementById('publish-btn');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const historyContent = document.getElementById('assignments-history');

    // Initialize
    async function init() {
        const session = await window.supabaseConfig.getSession();
        if (!session) {
            window.location.href = '../../login.html';
            return;
        }

        // Init Sidebar (Parent JS handles mapping)
        if (window.AdminSidebar) {
            window.AdminSidebar.init('assignments', '../../');
        }

        const headerContainer = document.getElementById('header-container');
        if (headerContainer && window.AdminHeader) {
            headerContainer.innerHTML = window.AdminHeader.render('Assignments');
        }

        currentAdmin = await window.Auth.getCurrentAdmin();
        await window.AdminSidebar.renderAccountPanel(session, currentAdmin);

        await loadCourses();
        await loadAssignments();
        await loadExtensions();
        bindEvents();
        initRealtime();
    }

    async function loadCourses() {
        try {
            const { data, error } = await window.supabaseClient
                .from('courses')
                .select('course_code, course_name')
                .eq('status', 'ACTIVE')
                .order('course_code');

            if (error) throw error;
            allCourses = data || [];
            courseSelect.innerHTML = '<option value="">-- Select a Course --</option>' +
                allCourses.map(c => `<option value="${c.course_code}">${c.course_code} - ${c.course_name}</option>`).join('');

            // Initialize SearchableSelect
            if (!courseSearchableSelect && window.AdminUtils.SearchableSelect) {
                courseSearchableSelect = new window.AdminUtils.SearchableSelect('course-select', {
                    placeholder: 'Search for a course...'
                });
            } else if (courseSearchableSelect) {
                courseSearchableSelect.syncWithOptions();
            }
        } catch (err) {
            console.error('Error loading courses:', err);
        }
    }

    async function loadStudentsForCourse(courseCode) {
        if (!courseCode) {
            studentSelect.innerHTML = '<option value="">-- Select a Course First --</option>';
            if (studentSearchableSelect) studentSearchableSelect.syncWithOptions();
            return;
        }

        studentSelect.disabled = true;
        studentSelect.innerHTML = '<option value="">Loading students...</option>';
        if (studentSearchableSelect) studentSearchableSelect.syncWithOptions();

        try {
            const { data, error } = await window.supabaseClient
                .from('students')
                .select('id, student_id, first_name, last_name, courses')
                .contains('courses', [courseCode])
                .eq('status', 'ACTIVE')
                .is('deleted_at', null)
                .order('student_id');

            if (error) throw error;

            allStudents = data || [];

            if (allStudents.length === 0) {
                studentSelect.innerHTML = '<option value="">No students found</option>';
                studentHint.textContent = 'No students are currently enrolled in this course.';
            } else {
                studentSelect.innerHTML = '<option value="">-- Select a Student --</option>' +
                    allStudents.map(s => `<option value="${s.id}">${s.student_id} - ${s.first_name} ${s.last_name}</option>`).join('');
                studentHint.textContent = `${allStudents.length} student(s) found in this course.`;
                studentSelect.disabled = false;
            }

            // Sync SearchableSelect
            if (!studentSearchableSelect && window.AdminUtils.SearchableSelect) {
                studentSearchableSelect = new window.AdminUtils.SearchableSelect('student-select', {
                    placeholder: 'Search for a student...'
                });
            } else if (studentSearchableSelect) {
                studentSearchableSelect.syncWithOptions();
            }
        } catch (err) {
            console.error('Error loading students:', err);
            studentSelect.innerHTML = '<option value="">Error loading</option>';
        }
    }

    // ============================================
    // Universal Storage Adapter (R2 / S3 Ready)
    // ============================================
    async function uploadAsset(file, bucket = 'assignments') {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${bucket}/${timestamp}_${safeName}`;

        const { data, error } = await window.supabaseClient.storage
            .from(bucket)
            .upload(filePath, file, { upsert: false });

        if (error) throw error;

        const { data: urlData } = window.supabaseClient.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return urlData?.publicUrl || '';
    }

    async function handlePublish() {
        const mode = document.querySelector('input[name="broadcast-mode"]:checked').value;
        const course = courseSelect.value;
        const student = studentSelect.value;
        const title = document.getElementById('assign-title').value.trim();
        const desc = document.getElementById('assign-desc').value.trim();
        const date = document.getElementById('assign-date').value;
        const time = document.getElementById('assign-time').value;

        if (!course || !title || !date || !time) {
            showToast('error', 'Please fill all required fields');
            return;
        }

        if (mode === 'student' && !student) {
            showToast('error', 'Please select a student');
            return;
        }

        const deadline = new Date(`${date}T${time}:00`).toISOString();

        publishBtn.disabled = true;
        publishBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Broadcasting...';

        try {
            let fileUrl = null;
            if (selectedFile) {
                fileUrl = await uploadAsset(selectedFile);
            }

            const { error } = await window.supabaseClient
                .from('student_assignments')
                .insert({
                    course_code: course,
                    student_db_id: mode === 'student' ? student : null,
                    title: title,
                    description: desc,
                    file_url: fileUrl,
                    deadline: deadline,
                    created_by: currentAdmin.id
                });

            if (error) throw error;

            showToast('success', 'Assignment published successfully');
            resetForm();
            await loadAssignments();
        } catch (err) {
            console.error('Publish error:', err);
            showToast('error', err.message || 'Failed to publish');
        } finally {
            publishBtn.disabled = false;
            publishBtn.innerHTML = '<i class="fa-solid fa-bullhorn"></i> <span>Publish Assignment</span>';
        }
    }

    async function loadAssignments() {
        try {
            const { data, error } = await window.supabaseClient
                .from('student_assignments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            allAssignments = data || [];
            renderAssignments();
        } catch (err) {
            console.error('Load assignments error:', err);
        }
    }

    function renderAssignments() {
        if (allAssignments.length === 0) {
            historyContent.innerHTML = '<p class="text-muted">No assignments published yet.</p>';
            return;
        }

        const totalPages = Math.ceil(allAssignments.length / perPage);
        const start = (currentPage - 1) * perPage;
        const pageData = allAssignments.slice(start, start + perPage);

        historyContent.innerHTML = `
            <div class="stats-strip">
                <div class="stat-item">
                    <i class="fa-solid fa-file-signature"></i>
                    <span>Total Assignments: <strong>${allAssignments.length}</strong></span>
                </div>
            </div>
            <div class="bulk-actions-bar" id="bulk-bar">
                <span class="bulk-count"><span id="selected-count">0</span> selected</span>
                <div>
                    <button class="btn btn-danger btn-sm" onclick="window.bulkDeleteAssignments()">
                        <i class="fa-solid fa-trash"></i> Delete Selected
                    </button>
                </div>
            </div>
            <table class="recent-table">
                <thead>
                    <tr>
                        <th width="40"><input type="checkbox" id="select-all" onchange="window.toggleSelectAll(this.checked)"></th>
                        <th>Title</th>
                        <th>Course</th>
                        <th>Deadline</th>
                        <th width="120">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${pageData.map(a => `
                        <tr>
                            <td><input type="checkbox" class="assign-checkbox" data-id="${a.id}" onchange="window.updateBulkBar()"></td>
                            <td>
                                <strong>${a.title}</strong>
                                ${a.file_url ? `<br><a href="${a.file_url}" target="_blank" class="file-link small"><i class="fa-solid fa-paperclip"></i> Reference</a>` : ''}
                            </td>
                            <td><span class="badge badge-primary">${a.course_code}</span></td>
                            <td>
                                <span class="deadline-tag ${isUrgent(a.deadline) ? 'urgent' : ''}">${formatDeadline(a.deadline)}</span>
                                ${a.is_deadline_edited ? '<br><small class="text-muted">✏️ Edited</small>' : ''}
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="icon-btn btn-outline-primary" onclick="window.openEditDeadlineModal('${a.id}', '${a.title}', '${a.deadline}')" title="Edit Deadline">
                                        <i class="fa-solid fa-pen"></i>
                                    </button>
                                    <button class="icon-btn btn-outline-danger" onclick="window.confirmDeleteAssign('${a.id}')" title="Delete">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="pagination-controls" style="display:flex; align-items:center; justify-content:center; gap:1rem; margin-top:1.5rem;">
                <button class="btn btn-outline btn-sm" id="assign-prev" ${currentPage <= 1 ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-left"></i> Prev
                </button>
                <span class="page-info">Page ${currentPage} of ${totalPages}</span>
                <button class="btn btn-outline btn-sm" id="assign-next" ${currentPage >= totalPages ? 'disabled' : ''}>
                    Next <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
        `;

        // Bind pagination
        document.getElementById('assign-prev')?.addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; renderAssignments(); }
        });
        document.getElementById('assign-next')?.addEventListener('click', () => {
            if (currentPage < totalPages) { currentPage++; renderAssignments(); }
        });
    }

    async function loadExtensions() {
        const content = document.getElementById('extensions-content');
        const badge = document.getElementById('extension-badge');

        try {
            const { data, error } = await window.supabaseClient
                .from('assignment_extensions')
                .select('*, student:students(first_name, last_name), assign:student_assignments(title)')
                .eq('status', 'PENDING');

            if (error) throw error;

            const requests = data || [];
            badge.textContent = requests.length;
            badge.style.display = requests.length > 0 ? 'inline-block' : 'none';

            if (requests.length === 0) {
                content.innerHTML = '<p class="text-muted">No pending requests.</p>';
                return;
            }

            content.innerHTML = requests.map(r => `
                <div class="extension-card">
                    <div class="ext-info">
                        <h4>${r.student ? r.student.first_name + ' ' + r.student.last_name : 'Unknown Student'}</h4>
                        <p class="text-muted">Requesting extension for: <strong>${r.assign?.title || 'Assignment'}</strong></p>
                        <div class="ext-reason">"${r.reason}"</div>
                        <div class="ext-meta">
                            <span class="ext-meta-item"><i class="fa-solid fa-calendar-plus"></i> New Date: ${new Date(r.requested_deadline).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="ext-actions">
                        <button class="btn btn-primary btn-sm" onclick="window.handleExtension('${r.id}', 'APPROVED')">Approve</button>
                        <button class="btn btn-outline btn-danger btn-sm" onclick="window.handleExtension('${r.id}', 'REJECTED')">Reject</button>
                    </div>
                </div>
            `).join('');

        } catch (err) {
            console.error('Load extensions error:', err);
        }
    }

    // ============================================
    // Global Window Hooks for Callbacks
    // ============================================
    window.handleExtension = async (id, status) => {
        try {
            const { error } = await window.supabaseClient
                .from('assignment_extensions')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            showToast('success', 'Request ' + status.toLowerCase());
            await loadExtensions();
        } catch (err) {
            showToast('error', 'Failed to update request');
        }
    };

    window.confirmDeleteAssign = (id) => {
        currentDeleteId = id;
        document.getElementById('delete-overlay').style.display = 'flex';
    };

    window.toggleSelectAll = (checked) => {
        document.querySelectorAll('.assign-checkbox').forEach(cb => cb.checked = checked);
        window.updateBulkBar();
    };

    window.updateBulkBar = () => {
        const selected = document.querySelectorAll('.assign-checkbox:checked');
        const bar = document.getElementById('bulk-bar');
        const count = document.getElementById('selected-count');

        if (selected.length > 0) {
            bar.classList.add('active');
            count.textContent = selected.length;
        } else {
            bar.classList.remove('active');
        }
    };

    window.bulkDeleteAssignments = async () => {
        const selected = document.querySelectorAll('.assign-checkbox:checked');
        if (selected.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${selected.length} assignment(s)?`)) return;

        try {
            const ids = Array.from(selected).map(cb => cb.dataset.id);
            const { error } = await window.supabaseClient
                .from('student_assignments')
                .delete()
                .in('id', ids);

            if (error) throw error;
            showToast('success', `${ids.length} assignment(s) deleted`);
            await loadAssignments();
        } catch (e) {
            showToast('error', 'Failed to delete assignments');
        }
    };

    // ============================================
    // Real-time Event Handlers
    // ============================================
    function initRealtime() {
        window.supabaseClient
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assignment_extensions' }, payload => {
                loadExtensions(); // Auto refresh extensions for admin
            })
            .subscribe();
    }

    function bindEvents() {
        // Dropzone
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) {
                selectedFile = file;
                renderFilePreview();
                validateForm();
            }
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab).classList.add('active');
            });
        });

        // Form Validation
        const inputs = ['course-select', 'assign-title', 'assign-date', 'assign-time'];
        inputs.forEach(id => document.getElementById(id).addEventListener('input', validateForm));

        // Broadcast Mode Toggle
        document.querySelectorAll('input[name="broadcast-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isStudentMode = e.target.value === 'student';
                studentSelectGroup.style.display = isStudentMode ? 'block' : 'none';
                if (isStudentMode && courseSelect.value) {
                    loadStudentsForCourse(courseSelect.value);
                }
                validateForm();
            });
        });

        // Course Selection Change
        courseSelect.addEventListener('change', (e) => {
            const mode = document.querySelector('input[name="broadcast-mode"]:checked').value;
            if (mode === 'student') {
                loadStudentsForCourse(e.target.value);
            }
            validateForm();
        });

        // Student Selection Change
        studentSelect.addEventListener('change', validateForm);

        // Publish
        publishBtn.addEventListener('click', handlePublish);

        // Modal
        document.getElementById('cancel-delete-btn').addEventListener('click', () => {
            document.getElementById('delete-overlay').style.display = 'none';
        });
        document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
            if (!currentDeleteId) return;
            try {
                const { error } = await window.supabaseClient
                    .from('student_assignments')
                    .delete()
                    .eq('id', currentDeleteId);
                if (error) throw error;
                showToast('success', 'Assignment deleted');
                document.getElementById('delete-overlay').style.display = 'none';
                await loadAssignments();
            } catch (err) {
                showToast('error', 'Failed to delete');
            }
        });

        // Edit Modal Handlers
        let currentEditId = null;

        window.openEditDeadlineModal = (id, title, deadlineISO) => {
            currentEditId = id;
            document.getElementById('edit-modal-subtitle').textContent = `Update deadline for: ${title}`;

            const dateObj = new Date(deadlineISO);
            document.getElementById('edit-new-date').value = dateObj.toISOString().split('T')[0];
            document.getElementById('edit-new-time').value = dateObj.toTimeString().substring(0, 5);

            document.getElementById('edit-modal-overlay').style.display = 'flex';
        };

        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            document.getElementById('edit-modal-overlay').style.display = 'none';
            currentEditId = null;
        });

        document.getElementById('confirm-edit-btn').addEventListener('click', async () => {
            if (!currentEditId) return;

            const date = document.getElementById('edit-new-date').value;
            const time = document.getElementById('edit-new-time').value;

            if (!date || !time) {
                showToast('error', 'Please submit both date and time');
                return;
            }

            const newDeadline = new Date(`${date}T${time}:00`).toISOString();
            const btn = document.getElementById('confirm-edit-btn');
            btn.disabled = true;
            btn.textContent = 'Updating...';

            try {
                const { error } = await window.supabaseClient
                    .from('student_assignments')
                    .update({ deadline: newDeadline, is_deadline_edited: true })
                    .eq('id', currentEditId);

                if (error) throw error;

                showToast('success', 'Deadline updated successfully');
                document.getElementById('edit-modal-overlay').style.display = 'none';
                await loadAssignments();
            } catch (e) {
                console.error(e);
                showToast('error', 'Failed to update deadline');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Update Deadline';
            }
        });
    }

    function validateForm() {
        const mode = document.querySelector('input[name="broadcast-mode"]:checked')?.value || 'course';
        const course = courseSelect.value;
        const student = studentSelect.value;
        const title = document.getElementById('assign-title').value.trim();
        const date = document.getElementById('assign-date').value;
        const time = document.getElementById('assign-time').value;

        let isValid = course && title && date && time;
        if (mode === 'student' && !student) isValid = false;

        publishBtn.disabled = !isValid;
    }

    function resetForm() {
        document.getElementById('assign-title').value = '';
        document.getElementById('assign-desc').value = '';
        document.getElementById('assign-date').value = '';
        selectedFile = null;
        fileInput.value = '';
        filePreview.innerHTML = '';
        validateForm();
    }

    function renderFilePreview() {
        if (!selectedFile) return;
        filePreview.innerHTML = `
            <div class="file-preview-item">
                <div class="file-preview-info">
                    <div class="file-preview-name">${selectedFile.name}</div>
                </div>
                <button class="file-preview-remove" onclick="this.parentElement.remove(); window.clearFile();">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;
    }

    window.clearFile = () => { selectedFile = null; validateForm(); };

    function isUrgent(deadline) {
        const diff = new Date(deadline) - new Date();
        return diff > 0 && diff < (24 * 60 * 60 * 1000); // Less than 24 hours
    }

    function formatDeadline(deadline) {
        return new Date(deadline).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    }

    function showToast(type, message) {
        const { Toast } = window.AdminUtils || {};
        if (Toast) Toast[type]('Assignment', message);
        else alert(message);
    }

    init();
})();
