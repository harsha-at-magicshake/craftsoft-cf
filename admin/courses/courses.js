// Courses Module
const websiteCourses = [
    { code: 'GD', name: 'Graphic Design' },
    { code: 'UX', name: 'UI/UX Design' },
    { code: 'MERN', name: 'Full Stack Development (MERN)' },
    { code: 'PYFS', name: 'Python Full Stack Development' },
    { code: 'JAVA', name: 'Java Full Stack Development' },
    { code: 'DSA', name: 'DSA Mastery' },
    { code: 'DA', name: 'Data Analytics' },
    { code: 'SF', name: 'Salesforce Administration' },
    { code: 'PY', name: 'Python Programming' },
    { code: 'REACT', name: 'React JS' },
    { code: 'GIT', name: 'Git & GitHub' },
    { code: 'DEVOPS', name: 'DevOps Engineering' },
    { code: 'AWS', name: 'AWS Cloud Excellence' },
    { code: 'DEVSEC', name: 'DevSecOps' },
    { code: 'AZURE', name: 'Microsoft Azure' },
    { code: 'AUTOPY', name: 'Automation with Python' },
    { code: 'ENG', name: 'Spoken English Mastery' },
    { code: 'SOFT', name: 'Soft Skills Training' },
    { code: 'RESUME', name: 'Resume Writing & Interview Prep' },
    { code: 'HW', name: 'Handwriting Improvement' }
];

document.addEventListener('DOMContentLoaded', async () => {
    const { NavigationSecurity } = window.AdminUtils || {};
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    AdminSidebar.init('courses');

    // Header without Add button (Sync is in content)
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) headerContainer.innerHTML = AdminHeader.render('Courses');

    await loadCourses();

    document.getElementById('sync-courses-btn')?.addEventListener('click', syncCourses);
});

async function loadCourses() {
    const { Toast } = window.AdminUtils;
    const content = document.getElementById('courses-content');

    try {
        const { data: courses, error } = await window.supabaseClient
            .from('courses')
            .select('*')
            .eq('status', 'ACTIVE')
            .order('course_id', { ascending: true });

        if (error) throw error;

        if (!courses || courses.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fa-solid fa-book-bookmark"></i></div>
                    <h3>No courses yet</h3>
                    <p>Click "Sync from Website" to populate courses</p>
                </div>`;
            return;
        }

        content.innerHTML = `
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th><th>Code</th><th>Name</th><th>Fee</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${courses.map(c => `
                            <tr>
                                <td><span class="badge badge-primary">${c.course_id}</span></td>
                                <td><strong>${c.course_code}</strong></td>
                                <td>${c.course_name}</td>
                                <td class="fee-cell">₹${formatNumber(c.fee || 0)}</td>
                                <td>
                                    <button class="btn-icon btn-edit-fee" data-id="${c.id}" title="Edit Fee">
                                        <i class="fa-solid fa-pen"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <!-- Mobile Cards -->
            <div class="data-cards">
                ${courses.map(c => `
                    <div class="data-card">
                        <div class="data-card-header">
                            <span class="badge badge-primary">${c.course_id}</span>
                            <span class="data-card-code">${c.course_code}</span>
                        </div>
                        <div class="data-card-body">
                            <h4>${c.course_name}</h4>
                            <p class="data-card-fee">₹${formatNumber(c.fee || 0)}</p>
                        </div>
                        <div class="data-card-actions">
                            <button class="btn btn-sm btn-outline btn-edit-fee" data-id="${c.id}"><i class="fa-solid fa-pen"></i> Edit Fee</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="table-footer"><span>${courses.length} course${courses.length !== 1 ? 's' : ''} synced</span></div>
        `;

        document.querySelectorAll('.btn-edit-fee').forEach(btn =>
            btn.addEventListener('click', () => openEditFeeModal(btn.dataset.id)));

    } catch (error) {
        console.error(error);
        content.innerHTML = '<div class="error-state"><i class="fa-solid fa-exclamation-triangle"></i><p>Failed to load courses.</p></div>';
    }
}

function formatNumber(num) {
    return num.toLocaleString('en-IN');
}

async function syncCourses() {
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('sync-courses-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';

    try {
        const { data: existing, error: fetchError } = await window.supabaseClient.from('courses').select('course_code, fee');
        if (fetchError) throw fetchError;
        const existingMap = new Map(existing?.map(c => [c.course_code, c.fee]) || []);

        const { data: maxData } = await window.supabaseClient.from('courses').select('course_id').order('course_id', { ascending: false }).limit(1);
        let nextNum = 1;
        if (maxData?.length > 0) {
            const m = maxData[0].course_id.match(/C-(\d+)/);
            if (m) nextNum = parseInt(m[1]) + 1;
        }

        let synced = 0;
        for (const c of websiteCourses) {
            if (existingMap.has(c.code)) {
                await window.supabaseClient.from('courses').update({ course_name: c.name, synced_at: new Date().toISOString() }).eq('course_code', c.code);
            } else {
                const cid = `C-${String(nextNum).padStart(3, '0')}`;
                await window.supabaseClient.from('courses').insert({ course_id: cid, course_code: c.code, course_name: c.name, fee: 0, status: 'ACTIVE' });
                nextNum++;
            }
            synced++;
        }
        Toast.success('Sync Complete', `${synced} courses synced`);
        await loadCourses();
    } catch (e) {
        console.error(e);
        Toast.error('Sync Failed', e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync from Website';
    }
}

async function openEditFeeModal(courseId) {
    const { Toast } = window.AdminUtils;
    const { data: course, error } = await window.supabaseClient.from('courses').select('*').eq('id', courseId).single();

    if (error || !course) { Toast.error('Error', 'Could not load course'); return; }

    const modalHTML = `
        <div class="modal-overlay active" id="fee-modal">
            <div class="modal-container">
                <div class="modal-header"><h3>Edit Course Fee</h3><button class="modal-close" id="close-fee"><i class="fa-solid fa-xmark"></i></button></div>
                <div class="modal-body">
                    <div class="form-group"><label>Course</label><input type="text" value="${course.course_code} - ${course.course_name}" disabled class="input-locked"></div>
                    <div class="form-group"><label>Fee (₹)</label><input type="number" id="edit-fee-input" value="${course.fee || 0}" min="0" step="100"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancel-fee">Cancel</button>
                    <button class="btn btn-primary" id="save-fee"><i class="fa-solid fa-check"></i> Update Fee</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setTimeout(() => {
        const modal = document.getElementById('fee-modal');
        const close = () => modal.remove();
        document.getElementById('close-fee').onclick = close;
        document.getElementById('cancel-fee').onclick = close;
        document.getElementById('save-fee').onclick = async () => {
            const btn = document.getElementById('save-fee');
            const fee = parseFloat(document.getElementById('edit-fee-input').value) || 0;
            btn.disabled = true; btn.innerHTML = 'Saving...';

            const { error } = await window.supabaseClient.from('courses').update({ fee }).eq('id', courseId);
            if (error) { Toast.error('Error', 'Failed'); btn.disabled = false; btn.innerHTML = 'Update Fee'; }
            else { Toast.success('Saved', 'Fee updated'); close(); await loadCourses(); }
        };
    }, 0);
}
