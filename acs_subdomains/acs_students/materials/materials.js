/* ============================================
   Materials Page Logic
   Craft Soft - Student Module
   ============================================ */

(function () {
    'use strict';

    let studentData = null;
    let allMaterials = [];
    const container = document.getElementById('materials-container');
    const loading = document.getElementById('materials-loading');
    const emptyState = document.getElementById('no-materials');
    const searchInput = document.getElementById('materials-search');

    async function checkAuth() {
        const token = localStorage.getItem('acs_student_token');
        if (!token) { window.location.replace('../'); return; }

        const { data: session, error } = await window.supabaseClient
            .from('student_sessions')
            .select('*')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error || !session) {
            window.location.replace('../');
            return;
        }

        const metadata = session.metadata;
        studentData = {
            id: session.student_db_id,
            name: metadata.name,
            student_id: metadata.student_id,
            email: metadata.email,
            phone: metadata.phone
        };
        initPage();
    }

    async function initPage() {
        // Render Header
        const header = document.getElementById('header-container');
        if (header && window.StudentHeader) {
            header.innerHTML = window.StudentHeader.render(
                'Study Materials',
                'Access notes and learning resources',
                'fa-book-skull'
            );
        }

        // Init Sidebar
        if (window.StudentSidebar) {
            window.StudentSidebar.init('materials');
            window.StudentSidebar.renderAccountPanel(studentData);
        }

        // Load Materials
        await fetchMaterials();
        bindSearch();
    }

    async function fetchMaterials() {
        try {
            loading.style.display = 'block';
            container.style.display = 'none';
            emptyState.style.display = 'none';

            // DEBUG: Log the student ID since console.log is disabled
            console.error('Fetching materials for Student UUID:', studentData.id);

            const { data, error } = await window.supabaseClient
                .from('student_materials')
                .select('*')
                .eq('student_db_id', studentData.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase Query Error:', error);
                throw error;
            }

            console.error('Materials data received:', data?.length || 0, 'items');

            allMaterials = data || [];
            renderMaterials(allMaterials);

        } catch (err) {
            console.error('Error fetching materials:', err);
            showToast('error', 'Failed to load materials');
            loading.style.display = 'none';
            emptyState.style.display = 'block';
        }
    }

    function renderMaterials(materials) {
        loading.style.display = 'none';

        if (!materials || materials.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        container.style.display = 'grid';

        // Group by course_code
        const grouped = materials.reduce((acc, m) => {
            if (!acc[m.course_code]) acc[m.course_code] = [];
            acc[m.course_code].push(m);
            return acc;
        }, {});

        container.innerHTML = Object.entries(grouped).map(([course, files]) => `
            <div class="course-materials-card">
                <div class="course-header">
                    <div class="course-badge">${course}</div>
                    <span class="file-count">${files.length} File(s)</span>
                </div>
                <div class="files-list">
                    ${files.map(file => `
                        <div class="file-row">
                            <div class="file-icon">
                                <i class="fa-solid ${getFileIcon(file.file_name)}"></i>
                            </div>
                            <div class="file-details">
                                <span class="file-name" title="${file.file_name}">${file.file_name}</span>
                                <span class="file-date">${new Date(file.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            </div>
                            <a href="${file.file_url}" target="_blank" class="download-btn" title="View/Download">
                                <i class="fa-solid fa-cloud-arrow-down"></i>
                            </a>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    function bindSearch() {
        searchInput?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            if (!term) {
                renderMaterials(allMaterials);
                return;
            }

            const filtered = allMaterials.filter(m =>
                m.file_name.toLowerCase().includes(term) ||
                m.course_code.toLowerCase().includes(term)
            );
            renderMaterials(filtered);
        });
    }

    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            pdf: 'fa-file-pdf',
            doc: 'fa-file-word',
            docx: 'fa-file-word',
            xls: 'fa-file-excel',
            xlsx: 'fa-file-excel',
            ppt: 'fa-file-powerpoint',
            pptx: 'fa-file-powerpoint',
            zip: 'fa-file-zipper',
            rar: 'fa-file-zipper',
            png: 'fa-file-image',
            jpg: 'fa-file-image',
            jpeg: 'fa-file-image'
        };
        return icons[ext] || 'fa-file';
    }

    function showToast(type, message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.className = `toast show ${type}`;
        toast.textContent = message;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Logout handler
    window.handleLogout = function () {
        const token = localStorage.getItem('acs_student_token');
        if (token) {
            window.supabaseClient.from('student_sessions').delete().eq('token', token).then(() => {
                localStorage.removeItem('acs_student_token');
                window.location.replace('../');
            });
        } else {
            window.location.replace('../');
        }
    };

    checkAuth();
})();
