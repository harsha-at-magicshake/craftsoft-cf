/**
 * Admin Submissions Module
 * View and manage student assignment submissions
 */

(async function () {
    // State
    let allSubmissions = [];
    let filteredSubmissions = [];
    let selectedSubmissions = new Set(); // 🛡️ Fix: Use Set for selection
    let courses = [];
    let assignments = [];
    let currentPage = 1;
    const perPage = 5;
    let courseSearchableSelect = null;
    let assignmentSearchableSelect = null;

    // DOM Elements
    const content = document.getElementById('submissions-content');
    const totalCount = document.getElementById('total-count');
    const searchInput = document.getElementById('search-input');
    const filterCourse = document.getElementById('filter-course');
    const filterAssignment = document.getElementById('filter-assignment');

    // Initialize
    async function init() {
        const session = await window.supabaseConfig.getSession();
        if (!session) {
            window.location.href = '/login';
            return;
        }

        // Init Sidebar
        if (window.AdminSidebar) {
            window.AdminSidebar.init('submissions', '../../');
        }

        const headerContainer = document.getElementById('header-container');
        if (headerContainer && window.AdminHeader) {
            headerContainer.innerHTML = window.AdminHeader.render('Submissions');
        }

        const currentAdmin = await window.Auth.getCurrentAdmin();
        await window.AdminSidebar.renderAccountPanel(session, currentAdmin);

        await loadFilters();
        await loadSubmissions();
        bindEvents();
    }

    async function loadFilters() {
        // Load courses
        const { data: courseData } = await window.supabaseClient
            .from('courses')
            .select('course_code, course_name')
            .eq('status', 'ACTIVE')
            .order('course_code');

        courses = courseData || [];
        filterCourse.innerHTML = '<option value="">All Courses</option>' +
            courses.map(c => `<option value="${c.course_code}">${c.course_code} - ${c.course_name}</option>`).join('');

        // Load assignments
        const { data: assignData } = await window.supabaseClient
            .from('student_assignments')
            .select('id, title, course_code')
            .order('created_at', { ascending: false });

        assignments = assignData || [];
        filterAssignment.innerHTML = '<option value="">All Assignments</option>' +
            assignments.map(a => `<option value="${a.id}">${a.title} (${a.course_code})</option>`).join('');

        // Initialize/Sync SearchableSelects
        if (window.AdminUtils?.SearchableSelect) {
            if (!courseSearchableSelect) {
                courseSearchableSelect = new window.AdminUtils.SearchableSelect('filter-course', {
                    placeholder: 'Search Course...'
                });
            } else {
                courseSearchableSelect.syncWithOptions();
            }

            if (!assignmentSearchableSelect) {
                assignmentSearchableSelect = new window.AdminUtils.SearchableSelect('filter-assignment', {
                    placeholder: 'Search Assignment...'
                });
            } else {
                assignmentSearchableSelect.syncWithOptions();
            }
        }
    }

    async function loadSubmissions() {
        try {
            const { data, error } = await window.supabaseClient
                .from('student_submissions')
                .select(`
                    *,
                    student:students(first_name, last_name, student_id),
                    assignment:student_assignments(title, course_code)
                `)
                .order('submitted_at', { ascending: false });

            if (error) throw error;
            allSubmissions = data || [];

            // 🛡️ Fix: Clear selection on refresh
            selectedSubmissions.clear();
            applyFilters();
        } catch (e) {
            console.error('Load submissions error:', e);
            content.innerHTML = '<p class="text-muted">Error loading submissions.</p>';
        }
    }

    function applyFilters() {
        const search = searchInput.value.toLowerCase();
        const courseFilter = filterCourse.value;
        const assignFilter = filterAssignment.value;

        filteredSubmissions = allSubmissions.filter(s => {
            const studentName = `${s.student?.first_name || ''} ${s.student?.last_name || ''}`.toLowerCase();
            const assignTitle = s.assignment?.title?.toLowerCase() || '';
            const courseCode = s.assignment?.course_code || '';

            const matchSearch = !search || studentName.includes(search) || assignTitle.includes(search);
            const matchCourse = !courseFilter || courseCode === courseFilter;
            const matchAssign = !assignFilter || s.assignment_id === assignFilter;

            return matchSearch && matchCourse && matchAssign;
        });

        totalCount.textContent = filteredSubmissions.length;
        currentPage = 1;
        render();
    }

    function render() {
        if (filteredSubmissions.length === 0) {
            content.innerHTML = '<p class="text-muted">No submissions found.</p>';
            document.getElementById('pagination').style.display = 'none';
            return;
        }

        const totalPages = Math.ceil(filteredSubmissions.length / perPage);

        // 🛡️ Fix: Pagination Math
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        }

        const start = (currentPage - 1) * perPage;
        const pageData = filteredSubmissions.slice(start, start + perPage);

        const tableHTML = `
            <div class="table-container">
                <table class="submissions-table">
                    <thead>
                        <tr>
                            <th width="40"><input type="checkbox" id="select-all" ${isAllSelectedOnPage(pageData) ? 'checked' : ''} onchange="window.toggleSelectAll(this.checked)"></th>
                            <th>Student</th>
                            <th>Assignment</th>
                            <th>Course</th>
                            <th>Submitted</th>
                            <th width="120">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageData.map(s => `
                            <tr>
                                <td><input type="checkbox" class="sub-checkbox" data-id="${s.id}" ${selectedSubmissions.has(s.id) ? 'checked' : ''} onchange="window.toggleSubmissionChoice('${s.id}', this.checked)"></td>
                                <td>
                                    <span class="student-name">${s.student?.first_name || ''} ${s.student?.last_name || ''}</span>
                                    <br><small class="text-muted">${s.student?.student_id || 'N/A'}</small>
                                </td>
                                <td class="assignment-title">${s.assignment?.title || 'Unknown'}</td>
                                <td><span class="badge badge-primary">${s.assignment?.course_code || 'N/A'}</span></td>
                                <td class="date-cell">${formatDate(s.submitted_at)}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="icon-btn btn-outline-success" onclick="window.downloadSubmission('${s.file_url}', '${s.assignment?.title || 'submission'}')" title="Download">
                                            <i class="fa-solid fa-download"></i>
                                        </button>
                                        <button class="icon-btn btn-outline-danger" onclick="window.deleteSubmission('${s.id}')" title="Delete">
                                            <i class="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const cardsHTML = `
            <div class="data-cards">
                ${pageData.map(s => `
                    <div class="premium-card">
                        <div class="card-header">
                            <div class="card-header-left">
                                <input type="checkbox" class="sub-checkbox" data-id="${s.id}" ${selectedSubmissions.has(s.id) ? 'checked' : ''} onchange="window.toggleSubmissionChoice('${s.id}', this.checked)">
                                <span class="card-id-badge">${s.assignment?.course_code || 'N/A'}</span>
                            </div>
                            <div class="card-header-right">
                                <span class="badge badge-primary">${formatDate(s.submitted_at)}</span>
                            </div>
                        </div>
                        <div class="card-body" style="text-align: left;">
                            <h4 class="card-name" style="margin-bottom: 0.5rem;">${s.student ? s.student.first_name + ' ' + s.student.last_name : 'Unknown Student'}</h4>
                            <p style="font-size: 0.85rem; color: var(--admin-text-muted); margin-bottom: 0.75rem;">${s.student?.student_id || 'N/A'}</p>
                            <div class="card-info-row">
                                <div class="card-info-item"><i class="fa-solid fa-file-pen"></i> Task: ${s.assignment?.title || 'Unknown'}</div>
                            </div>
                        </div>
                        <div class="card-actions">
                            <button class="card-action-btn success" onclick="window.downloadSubmission('${s.file_url}', '${s.assignment?.title || 'submission'}')">
                                <i class="fa-solid fa-download"></i> <span>Download</span>
                            </button>
                            <button class="card-action-btn delete" onclick="window.deleteSubmission('${s.id}')">
                                <i class="fa-solid fa-trash"></i> <span>Delete</span>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        content.innerHTML = `
            <div id="bulk-bar" class="bulk-actions-bar" style="display: ${selectedSubmissions.size > 0 ? 'flex' : 'none'}; border-bottom: 2px solid var(--admin-input-border); margin-bottom: 1rem; padding: 1rem; border-radius: 12px; background: rgba(239, 68, 68, 0.05);">
                <span class="bulk-count" style="font-weight: 700; color: var(--error);"><span id="selected-count">${selectedSubmissions.size}</span> selected</span>
                <div>
                    <button class="btn btn-danger btn-sm" onclick="window.bulkDeleteSubmissions()">
                        <i class="fa-solid fa-trash"></i> Delete Selected
                    </button>
                </div>
            </div>
            ${tableHTML}
            ${cardsHTML}
        `;

        // Update pagination
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('total-pages').textContent = totalPages || 1;
        document.getElementById('prev-btn').disabled = currentPage <= 1;
        document.getElementById('next-btn').disabled = currentPage >= totalPages;
        document.getElementById('pagination').style.display = 'flex';
    }

    function isAllSelectedOnPage(pageData) {
        return pageData.length > 0 && pageData.every(s => selectedSubmissions.has(s.id));
    }

    function formatDate(iso) {
        if (!iso) return 'N/A';
        return new Date(iso).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    // Global handlers
    window.handleLogout = async () => {
        const { Modal } = window.AdminUtils || {};
        if (Modal) {
            Modal.confirm('Sign Out', 'Are you sure you want to sign out?', async () => {
                await window.Auth.logout();
            });
        }
    };

    window.downloadSubmission = async (url, title) => {
        try {
            showToast('info', 'Downloading...');
            const response = await fetch(url);
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            // Extract file extension from URL
            const ext = url.split('.').pop().split('?')[0] || 'pdf';
            link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            showToast('success', 'Downloaded successfully');
        } catch (e) {
            console.error('Download error:', e);
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
    };

    window.toggleSubmissionChoice = (id, checked) => {
        if (checked) selectedSubmissions.add(id);
        else selectedSubmissions.delete(id);
        render();
    };

    window.toggleSelectAll = (checked) => {
        const start = (currentPage - 1) * perPage;
        const pageData = filteredSubmissions.slice(start, start + perPage);
        pageData.forEach(s => {
            if (checked) selectedSubmissions.add(s.id);
            else selectedSubmissions.delete(s.id);
        });
        render();
    };

    window.updateBulkBar = () => {
        // Obsolete
    };

    window.deleteSubmission = async (id) => {
        const { Modal } = window.AdminUtils || {};
        if (!Modal) return;

        Modal.confirm('Delete Submission', 'Are you sure you want to delete this submission?', async () => {
            try {
                const { error } = await window.supabaseClient
                    .from('student_submissions')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                showToast('success', 'Submission deleted');
                await loadSubmissions();
            } catch (e) {
                showToast('error', 'Failed to delete');
            }
        });
    };

    window.bulkDeleteSubmissions = async () => {
        if (selectedSubmissions.size === 0) return;

        const { Modal } = window.AdminUtils || {};
        if (!Modal) return;

        Modal.confirm('Bulk Delete', `Delete ${selectedSubmissions.size} submission(s)?`, async () => {
            try {
                const ids = Array.from(selectedSubmissions);
                const { error } = await window.supabaseClient
                    .from('student_submissions')
                    .delete()
                    .in('id', ids);
                if (error) throw error;
                showToast('success', `${ids.length} submission(s) deleted`);
                await loadSubmissions();
            } catch (e) {
                showToast('error', 'Failed to delete');
            }
        });
    };

    function bindEvents() {
        searchInput.addEventListener('input', applyFilters);
        filterCourse.addEventListener('change', applyFilters);
        filterAssignment.addEventListener('change', applyFilters);

        document.getElementById('prev-btn').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                render();
            }
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            const totalPages = Math.ceil(filteredSubmissions.length / perPage);
            if (currentPage < totalPages) {
                currentPage++;
                render();
            }
        });
    }

    function showToast(type, message) {
        const { Toast } = window.AdminUtils || {};
        if (Toast) Toast[type]('Submissions', message);
        else alert(message);
    }

    init();
})();
