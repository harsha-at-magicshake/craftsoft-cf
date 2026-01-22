/**
 * Manage Assignments - Admin Logic
 * Handles broadcasting tasks to courses and managing extensions.
 * S3-Ready Architecture for unlimited scaling.
 */

(async function () {
    // State
    let allCourses = [];
    let allAssignments = [];
    let selectedFile = null;
    let currentDeleteId = null;
    let currentAdmin = null;

    // DOM Elements
    const courseSelect = document.getElementById('course-select');
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
        } catch (err) {
            console.error('Error loading courses:', err);
        }
    }

    // ============================================
    // Universal Storage Adapter (R2 / S3 Ready)
    // ============================================
    async function uploadAsset(file, bucket = 'assignments') {
        // SCALING POLICY: 
        // Currently using Supabase Storage, but structured to slot in Cloudflare R2 easily.
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
        const course = courseSelect.value;
        const title = document.getElementById('assign-title').value.trim();
        const desc = document.getElementById('assign-desc').value.trim();
        const date = document.getElementById('assign-date').value;
        const time = document.getElementById('assign-time').value;

        if (!course || !title || !date || !time) {
            showToast('error', 'Please fill all required fields');
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
                    title: title,
                    description: desc,
                    file_url: fileUrl,
                    deadline: deadline,
                    created_by: currentAdmin.id
                });

            if (error) throw error;

            showToast('success', 'Assignment published to ' + course);
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

        historyContent.innerHTML = `
            <table class="recent-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Course</th>
                        <th>Deadline</th>
                        <th width="100">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${allAssignments.map(a => `
                        <tr>
                            <td>
                                <strong>${a.title}</strong>
                                ${a.file_url ? `<br><a href="${a.file_url}" target="_blank" class="file-link small"><i class="fa-solid fa-paperclip"></i> Reference</a>` : ''}
                            </td>
                            <td><span class="badge badge-primary">${a.course_code}</span></td>
                            <td><span class="deadline-tag ${isUrgent(a.deadline) ? 'urgent' : ''}">${formatDeadline(a.deadline)}</span></td>
                            <td>
                                <button class="delete-single-btn" onclick="window.confirmDeleteAssign('${a.id}')" title="Delete">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
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
    }

    function validateForm() {
        const course = courseSelect.value;
        const title = document.getElementById('assign-title').value.trim();
        const date = document.getElementById('assign-date').value;
        const time = document.getElementById('assign-time').value;
        publishBtn.disabled = !(course && title && date && time);
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
