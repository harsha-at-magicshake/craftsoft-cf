/**
 * Student Assignments Module (v6.0)
 * Countdown Engine, Submission Flow & Extension Logic
 */

(async function () {
    // State
    let assignments = [];
    let submissions = [];
    let extensions = [];
    let studentEnrollments = [];
    let timers = {};
    let currentTaskToSubmit = null;
    let selectedFile = null;
    let currentFilter = 'all';

    const container = document.getElementById('assignments-container');
    const loading = document.getElementById('assignments-loading');
    const empty = document.getElementById('no-assignments');

    // Init
    async function init() {
        // WAITER: Wait for the inline auth script to set global session state
        let retry = 0;
        while (!window.studentDbId && retry < 25) {
            await new Promise(r => setTimeout(r, 200));
            retry++;
        }

        if (!window.studentDbId) {
            loading.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color:#ef4444;"></i><p>Session verification failed. Please try logging in again.</p>';
            return;
        }

        // Render Shell
        StudentSidebar.init('assignments');
        const header = document.getElementById('header-container');
        if (header) {
            header.innerHTML = StudentHeader.render('My Assignments', 'Academic Tasks & Deadlines', 'fa-file-signature');
        }

        const student = {
            name: window.studentName || localStorage.getItem('acs_student_name') || 'Student',
            student_id: window.studentId || 'ID-000',
            email: window.studentEmail || localStorage.getItem('acs_student_email') || ''
        };
        StudentSidebar.renderAccountPanel(student);

        // Fetch Data
        await fetchStudentEnrollments();
        await loadAllData();
        bindEvents();
        initRealtime();
    }

    async function fetchStudentEnrollments() {
        try {
            const { data, error } = await window.supabaseClient
                .from('students')
                .select('courses')
                .eq('id', window.studentDbId)
                .single();
            if (error) throw error;
            studentEnrollments = data.courses || [];
        } catch (e) { console.error('Enrollment fetch failed', e); }
    }

    async function loadAllData() {
        const { studentDbId } = window;

        try {
            // Load Assignments, Submissions and Extensions in parallel
            const [assignRes, subRes, extRes] = await Promise.all([
                window.supabaseClient.from('student_assignments').select('*').in('course_code', studentEnrollments),
                window.supabaseClient.from('student_submissions').select('*').eq('student_db_id', studentDbId),
                window.supabaseClient.from('assignment_extensions').select('*').eq('student_db_id', studentDbId)
            ]);

            assignments = assignRes.data || [];
            submissions = subRes.data || [];
            extensions = extRes.data || [];

            render();
        } catch (e) {
            console.error('Data load failed', e);
        }
    }

    function getEffectiveDeadline(task) {
        const ext = extensions.find(e => e.assignment_id === task.id && e.status === 'APPROVED');
        return ext ? ext.requested_deadline : task.deadline;
    }

    function getTaskStatus(task) {
        const submission = submissions.find(s => s.assignment_id === task.id);
        if (submission) return 'submitted';

        const effectiveDeadline = new Date(getEffectiveDeadline(task));
        if (new Date() > effectiveDeadline) return 'missed';

        return 'pending';
    }

    function render() {
        loading.style.display = 'none';

        // Clear existing timers
        Object.values(timers).forEach(t => clearInterval(t));
        timers = {};

        const filtered = assignments.filter(a => {
            const status = getTaskStatus(a);
            if (currentFilter === 'all') return true;
            return status === currentFilter;
        });

        if (filtered.length === 0) {
            container.style.display = 'none';
            empty.style.display = 'block';
            empty.querySelector('p').textContent = currentFilter === 'all'
                ? "No active assignments found."
                : `No assignments with status '${currentFilter}'.`;
            return;
        }

        container.style.display = 'grid';
        empty.style.display = 'none';

        container.innerHTML = filtered.map(a => {
            const submission = submissions.find(s => s.assignment_id === a.id);
            const extension = extensions.find(e => e.assignment_id === a.id && e.status !== 'REJECTED');
            return renderAssignmentCard(a, submission, extension);
        }).join('');

        // Start countdowns for non-submitted items
        filtered.forEach(a => {
            const status = getTaskStatus(a);
            if (status !== 'submitted') startCountdown(a);
        });
    }

    function renderAssignmentCard(task, submission, extension) {
        const effectiveDeadline = getEffectiveDeadline(task);
        const status = getTaskStatus(task); // submitted, missed, pending

        // Check if admin edited deadline (no extensions allowed)
        const isEdited = task.is_deadline_edited === true;

        let statusLabel = 'Pending';
        let statusClass = 'pending';

        if (status === 'submitted') { statusLabel = 'Submitted'; statusClass = 'submitted'; }
        else if (status === 'missed') { statusLabel = 'Not Submitted'; statusClass = 'missed'; }

        // Format Date
        const d = new Date(effectiveDeadline);
        const fmtDate = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

        // Extension Label
        let extBadge = '';
        if (extension) {
            if (extension.status === 'APPROVED') extBadge = `<span class="assign-status" style="background:#dbeafe; color:#1e40af;">Extended</span>`;
            else if (extension.status === 'PENDING') extBadge = `<span class="assign-status" style="background:#fef9c3; color:#854d0e;">Ext. Pending</span>`;
        }
        if (isEdited) {
            extBadge = `<span class="assign-status" style="background:#e0e7ff; color:#3730a3;">Tutor Set</span>`;
        }

        // Calculate max extension date (3 months from original deadline)
        const originalDeadline = new Date(task.deadline);
        const maxExtDate = new Date(originalDeadline);
        maxExtDate.setMonth(maxExtDate.getMonth() + 3);
        const maxExtDateStr = maxExtDate.toISOString().split('T')[0];

        return `
            <div class="assign-card" id="task-${task.id}" data-max-ext="${maxExtDateStr}" data-original="${task.deadline}">
                <div class="assign-header">
                    <div class="assign-badge-group">
                        <span class="assign-course">${task.course_code}</span>
                        <span class="assign-status ${statusClass}">${statusLabel}</span>
                        ${extBadge}
                    </div>
                </div>
                <h3 class="assign-title">${task.title}</h3>
                <p class="assign-desc">${task.description || 'No additional instructions provided.'}</p>
                
                ${status === 'submitted' ? `
                    <div class="countdown-box" style="border-style: solid; border-color: #10b981; background: #f0fdf4;">
                        <div class="countdown-timer" style="color: #059669; font-size: 1.1rem;">
                            <i class="fa-solid fa-circle-check"></i> Successfully Submitted
                        </div>
                        <div class="countdown-label">Verified Record</div>
                    </div>
                ` : status === 'missed' ? `
                     <div class="countdown-box" style="border-color: #ef4444; background: #fef2f2;">
                        <div class="countdown-timer" style="color: #dc2626; font-size: 1.1rem;">
                            <i class="fa-solid fa-circle-exclamation"></i> YOU MISSED THE DEADLINE
                        </div>
                        <div class="countdown-label">Submission Closed</div>
                    </div>
                    <p class="deadline-fallback">Deadline was: <strong>${fmtDate}</strong></p>
                ` : `
                    <div class="countdown-box" id="countdown-${task.id}">
                        <div class="countdown-label">Time Remaining</div>
                        <div class="countdown-timer" id="timer-val-${task.id}">--:--:-- left</div>
                    </div>
                    <p class="deadline-fallback">Submit by <strong>${fmtDate}</strong></p>
                `}
                
                <div class="assign-actions">
                    ${task.file_url ? `<a href="${task.file_url}" target="_blank" class="btn btn-outline" style="flex: 0.4;"><i class="fa-solid fa-download"></i> Paper</a>` : ''}
                    
                    ${status === 'submitted' ? `
                        <button class="btn btn-secondary" onclick="window.viewSubmission('${submission.file_url}')"><i class="fa-solid fa-eye"></i> View</button>
                    ` : status === 'missed' ? `
                        <button class="btn btn-primary" disabled style="opacity:0.5; cursor:not-allowed;"><i class="fa-solid fa-lock"></i> Locked</button>
                    ` : `
                        <button class="btn btn-primary" onclick="window.openSubmitModal('${task.id}', '${task.title}')"><i class="fa-solid fa-upload"></i> Submit</button>
                        ${!isEdited && !extension ? `<button class="btn btn-outline" id="ext-btn-${task.id}" onclick="window.openExtensionModal('${task.id}', '${maxExtDateStr}')" disabled title="Only available < 1h before deadline"><i class="fa-solid fa-clock-rotate-left"></i> Extension</button>` : ''}
                    `}
                </div>
            </div>
        `;
    }

    function startCountdown(task) {
        const deadline = new Date(getEffectiveDeadline(task)).getTime();
        const timerEl = document.getElementById(`timer-val-${task.id}`);
        const extBtn = document.getElementById(`ext-btn-${task.id}`);

        // If element missing (e.g. filtered out or missed state), skip
        if (!timerEl) return;

        const update = () => {
            const now = new Date().getTime();
            const diff = deadline - now;

            if (diff <= 0) {
                // Time Over -> Trigger Re-render to show 'Missed' state
                clearInterval(timers[task.id]);
                render();
                return;
            }

            // Calculations
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} left`;

            if (timerEl) {
                timerEl.innerHTML = display;
                if (hours < 1) {
                    timerEl.classList.add('urgent');
                    timerEl.parentElement.style.borderColor = "#f87171";
                }
            }

            // Extension Policy: Only if < 1h left AND > 0
            if (extBtn) {
                const canRequestExtension = diff > 0 && diff < (1 * 60 * 60 * 1000);
                extBtn.disabled = !canRequestExtension;
            }
        };

        update();
        timers[task.id] = setInterval(update, 1000);
    }

    // Modal Handlers
    window.openSubmitModal = (id, title) => {
        currentTaskToSubmit = id;
        document.getElementById('submit-task-name').textContent = `Submitting for: ${title}`;
        document.getElementById('submit-modal').classList.add('active');
    };

    window.openExtensionModal = (id, maxDate) => {
        currentTaskToSubmit = id;
        // Set max date on the input
        const dateInput = document.getElementById('extension-date');
        if (dateInput && maxDate) {
            dateInput.max = maxDate;
        }
        document.getElementById('extension-modal').classList.add('active');
    };

    window.viewSubmission = (url) => window.open(url, '_blank');

    function bindEvents() {
        // Filter Buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.dataset.filter;
                render();
            });
        });

        // Dropzone & Modals
        const dropzone = document.getElementById('submission-dropzone');
        const fileInput = document.getElementById('submission-file-input');
        const confirmSubmit = document.getElementById('confirm-submit');

        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', e => {
            selectedFile = e.target.files[0];
            if (selectedFile) {
                document.getElementById('submission-preview').innerHTML = `
                    <div class="file-preview-item">
                        <span class="file-name">${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                        <i class="fa-solid fa-trash-can remove-file" id="clear-file"></i>
                    </div>
                `;
                confirmSubmit.disabled = false;
                document.getElementById('clear-file').onclick = () => {
                    selectedFile = null;
                    document.getElementById('submission-preview').innerHTML = '';
                    confirmSubmit.disabled = true;
                };
            }
        });

        document.getElementById('cancel-submit').onclick = () => {
            document.getElementById('submit-modal').classList.remove('active');
            selectedFile = null;
            document.getElementById('submission-preview').innerHTML = '';
        };

        document.getElementById('confirm-submit').onclick = async () => {
            if (!selectedFile || !currentTaskToSubmit) return;

            confirmSubmit.disabled = true;
            confirmSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

            try {
                // Upload logic
                const ts = Date.now();
                const path = `submissions/${window.studentDbId}/${ts}_${selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

                const { error: uploadError } = await window.supabaseClient.storage
                    .from('submissions')
                    .upload(path, selectedFile);

                if (uploadError) throw uploadError;

                const { data: urlData } = window.supabaseClient.storage
                    .from('submissions')
                    .getPublicUrl(path);

                // Insert submission
                const { error: dbError } = await window.supabaseClient
                    .from('student_submissions')
                    .insert({
                        assignment_id: currentTaskToSubmit,
                        student_db_id: window.studentDbId,
                        file_url: urlData.publicUrl
                    });

                if (dbError) throw dbError;

                showToast('Success!', 'Assignment submitted successfully.', 'success');
                document.getElementById('submit-modal').classList.remove('active');
                await loadAllData();
            } catch (e) {
                console.error(e);
                showToast('Error', e.message || 'Submission failed.', 'error');
            } finally {
                confirmSubmit.disabled = false;
                confirmSubmit.innerHTML = 'Upload & Submit';
            }
        };

        // Extension Request
        document.getElementById('confirm-extension').onclick = async () => {
            const reason = document.getElementById('extension-reason').value.trim();
            const date = document.getElementById('extension-date').value;
            const time = document.getElementById('extension-time')?.value || '23:59';

            if (!reason || !date) {
                showToast('Warning', 'Please provide a reason and new date.', 'warning');
                return;
            }

            try {
                const { error } = await window.supabaseClient
                    .from('assignment_extensions')
                    .insert({
                        assignment_id: currentTaskToSubmit,
                        student_db_id: window.studentDbId,
                        reason: reason,
                        requested_deadline: new Date(`${date}T${time}:00`).toISOString()
                    });
                if (error) throw error;
                showToast('Sent!', 'Extension request sent to Tutor.', 'success');
                document.getElementById('extension-modal').classList.remove('active');
                await loadAllData();
            } catch (e) {
                showToast('Error', 'Failed to send request.', 'error');
            }
        };

        document.getElementById('cancel-extension').onclick = () => {
            document.getElementById('extension-modal').classList.remove('active');
        };

        // Search
        document.getElementById('assignments-search').addEventListener('input', e => {
            const query = e.target.value.toLowerCase();
            const cards = container.querySelectorAll('.assign-card');
            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });
    }

    function initRealtime() {
        window.supabaseClient
            .channel('assignments-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_assignments' }, () => loadAllData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assignment_extensions' }, () => loadAllData())
            .subscribe();
    }

    function showToast(title, message, type) {
        const toast = document.getElementById('toast');
        toast.className = `toast ${type} show`;
        toast.innerHTML = `<strong>${title}</strong><br>${message}`;
        setTimeout(() => toast.classList.remove('show'), 5000);
    }

    init();
})();
