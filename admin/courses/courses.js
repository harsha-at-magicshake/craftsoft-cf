// Courses Module
let allCourses = [];

const WEBSITE_COURSES = [
    { code: 'FSM', name: 'Full Stack MERN Development', defaultFee: 30000 },
    { code: 'UXD', name: 'UI/UX Design', defaultFee: 20000 },
    { code: 'PYT', name: 'Python Programming', defaultFee: 15000 },
    { code: 'DSA', name: 'Data Structures & Algorithms', defaultFee: 15000 },
    { code: 'AWS', name: 'AWS Cloud Computing', defaultFee: 25000 },
    { code: 'DAN', name: 'Data Analytics', defaultFee: 20000 },
    { code: 'CYB', name: 'Cybersecurity Fundamentals', defaultFee: 22000 },
    { code: 'DMS', name: 'Digital Marketing', defaultFee: 18000 }
];

document.addEventListener('DOMContentLoaded', async () => {
    const { NavigationSecurity } = window.AdminUtils || {};
    NavigationSecurity?.initProtectedPage();

    const session = await window.supabaseConfig?.getSession();
    if (!session) {
        NavigationSecurity?.secureRedirect('../login.html');
        return;
    }

    AdminSidebar.init('courses');
    document.getElementById('header-container').innerHTML = AdminHeader.render('Courses');

    document.getElementById('sync-courses-btn')?.addEventListener('click', syncCourses);

    await loadCourses();
});

async function loadCourses() {
    const content = document.getElementById('courses-content');

    try {
        const { data, error } = await window.supabaseClient
            .from('courses')
            .select('*')
            .eq('status', 'ACTIVE')
            .order('course_code');

        if (error) throw error;
        allCourses = data || [];
        renderCourses();
    } catch (error) {
        console.error('Load error:', error);
        content.innerHTML = '<div class="error-state"><i class="fa-solid fa-exclamation-triangle"></i><p>Failed to load courses.</p></div>';
    }
}

function renderCourses() {
    const content = document.getElementById('courses-content');

    if (allCourses.length === 0) {
        content.innerHTML = `
            <div class="sync-info">
                <i class="fa-solid fa-info-circle"></i>
                No courses synced yet. Click "Sync from Website" to import courses.
            </div>
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-book"></i></div>
                <h3>No courses</h3>
                <p>Sync courses from the website to get started</p>
            </div>`;
        return;
    }

    content.innerHTML = `
        <div class="sync-info">
            <i class="fa-solid fa-info-circle"></i>
            ${allCourses.length} courses synced. Edit fees below and they'll auto-save.
        </div>
        ${allCourses.map(c => `
            <div class="course-card" data-id="${c.id}">
                <div class="course-info">
                    <h4>${c.course_name}</h4>
                    <span class="course-code">${c.course_code}</span>
                </div>
                <div class="course-fee">
                    <span>₹</span>
                    <input type="number" value="${c.fee || 0}" min="0" step="1000" 
                        onchange="updateFee('${c.id}', this.value)">
                </div>
            </div>
        `).join('')}`;
}

async function syncCourses() {
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('sync-courses-btn');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';

    try {
        for (const course of WEBSITE_COURSES) {
            const existing = allCourses.find(c => c.course_code === course.code);

            if (!existing) {
                await window.supabaseClient.from('courses').insert({
                    course_code: course.code,
                    course_name: course.name,
                    fee: course.defaultFee,
                    status: 'ACTIVE'
                });
            }
        }

        Toast.success('Synced', 'Courses synced successfully');
        await loadCourses();
    } catch (error) {
        console.error('Sync error:', error);
        Toast.error('Error', 'Failed to sync courses');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-sync"></i> Sync from Website';
    }
}

async function updateFee(id, fee) {
    const { Toast } = window.AdminUtils;
    try {
        const { error } = await window.supabaseClient
            .from('courses')
            .update({ fee: parseFloat(fee) || 0 })
            .eq('id', id);

        if (error) throw error;
        Toast.success('Saved', 'Fee updated');
    } catch (error) {
        Toast.error('Error', 'Failed to update fee');
    }
}

window.updateFee = updateFee;
