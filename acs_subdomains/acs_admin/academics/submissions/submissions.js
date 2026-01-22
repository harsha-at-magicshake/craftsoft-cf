/**
 * Admin Submissions Module
 * View and manage student assignment submissions
 */

(async function () {
    // State
    let allSubmissions = [];
    let filteredSubmissions = [];
    let courses = [];
    let assignments = [];
    let currentPage = 1;
    const perPage = 5;

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
            window.location.href = '../../login.html';
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
            courses.map(c => `<option value="${c.course_code}">${c.course_code}</option>`).join('');

        // Load assignments
        const { data: assignData } = await window.supabaseClient
            .from('student_assignments')
            .select('id, title')
            .order('created_at', { ascending: false });

        assignments = assignData || [];
        filterAssignment.innerHTML = '<option value="">All Assignments</option>' +
            assignments.map(a => `<option value="${a.id}">${a.title}</option>`).join('');
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
        const start = (currentPage - 1) * perPage;
        const pageData = filteredSubmissions.slice(start, start + perPage);

        content.innerHTML = `
            <table class="submissions-table">
                <thead>
                    <tr>
                        <th width="40"><input type="checkbox" id="select-all" onchange="window.toggleSelectAll(this.checked)"></th>
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
                            <td><input type="checkbox" class="sub-checkbox" data-id="${s.id}" onchange="window.updateBulkBar()"></td>
                            <td>
                                <span class="student-name">${s.student?.first_name || ''} ${s.student?.last_name || ''}</span>
                                <br><small class="text-muted">${s.student?.student_id || 'N/A'}</small>
                            </td>
                            <td class="assignment-title">${s.assignment?.title || 'Unknown'}</td>
                            <td><span class="badge badge-primary">${s.assignment?.course_code || 'N/A'}</span></td>
                            <td class="date-cell">${formatDate(s.submitted_at)}</td>
                            <td>
                                <div class="action-buttons">
                                    <a href="${s.file_url}" target="_blank" download class="icon-btn btn-outline-success" title="Download">
                                        <i class="fa-solid fa-download"></i>
                                    </a>
                                    <button class="icon-btn btn-outline-danger" onclick="window.deleteSubmission('${s.id}')" title="Delete">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Update pagination
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('total-pages').textContent = totalPages;
        document.getElementById('prev-btn').disabled = currentPage <= 1;
        document.getElementById('next-btn').disabled = currentPage >= totalPages;
        document.getElementById('pagination').style.display = 'flex';
    }

    function formatDate(iso) {
        if (!iso) return 'N/A';
        return new Date(iso).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    // Global handlers
    window.toggleSelectAll = (checked) => {
        document.querySelectorAll('.sub-checkbox').forEach(cb => cb.checked = checked);
        window.updateBulkBar();
    };

    window.updateBulkBar = () => {
        const selected = document.querySelectorAll('.sub-checkbox:checked');
        const bar = document.getElementById('bulk-bar');
        const count = document.getElementById('selected-count');

        if (selected.length > 0) {
            bar.classList.add('active');
            count.textContent = selected.length;
        } else {
            bar.classList.remove('active');
        }
    };

    window.deleteSubmission = async (id) => {
        if (!confirm('Delete this submission?')) return;
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
    };

    window.bulkDeleteSubmissions = async () => {
        const selected = document.querySelectorAll('.sub-checkbox:checked');
        if (selected.length === 0) return;
        if (!confirm(`Delete ${selected.length} submission(s)?`)) return;

        try {
            const ids = Array.from(selected).map(cb => cb.dataset.id);
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
