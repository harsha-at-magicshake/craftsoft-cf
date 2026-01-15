const websiteCourses = [
    { code: 'GD', name: 'Graphic Design' },
    { code: 'UX', name: 'UI/UX Design' },
    { code: 'MERN', name: 'Full Stack Development (MERN)' },
    { code: 'PYFS', name: 'Python Full Stack Development' },
    { code: 'JAVA', name: 'Java Full Stack Development' },
    { code: 'DSA', name: 'DSA Mastery' },
    { code: 'DA', name: 'Data Analytics' },
    { code: 'AIML', name: 'AI & Machine Learning (AI-ML)' },
    { code: 'SQL', name: 'SQL (Structured Query Language)' },
    { code: 'SF', name: 'Salesforce Administration' },
    { code: 'SFDEV', name: 'Salesforce Developer' },
    { code: 'SFMC', name: 'Salesforce Marketing Cloud' },
    { code: 'PY', name: 'Python Programming' },
    { code: 'REACT', name: 'React JS' },
    { code: 'GIT', name: 'Git & GitHub' },
    { code: 'DEVOPS', name: 'DevOps Engineering' },
    { code: 'AWS', name: 'AWS Cloud Excellence' },
    { code: 'DEVSEC', name: 'DevSecOps' },
    { code: 'AZURE', name: 'Microsoft Azure' },
    { code: 'CYBER', name: 'Cyber Security' },
    { code: 'ORACLE', name: 'Oracle Fusion Cloud' },
    { code: 'AUTOPY', name: 'Automation with Python' },
    { code: 'ENG', name: 'Spoken English Mastery' },
    { code: 'SOFT', name: 'Soft Skills Training' },
    { code: 'RESUME', name: 'Resume Writing & Interview Prep' },
    { code: 'HW', name: 'Handwriting Improvement' },
    { code: 'CAREER', name: 'Career Counselling' }
];

let allCourses = []; // Store fetched courses
let currentPage = 1;
let defaultGstRate = 18; // Default fallback
const itemsPerPage = window.innerWidth <= 1250 ? 5 : 10;

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '/';
        return;
    }

    AdminSidebar.init('courses', '/');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) headerContainer.innerHTML = AdminHeader.render('Courses');

    const admin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, admin);

    // Fetch GST Rate
    try {
        const { data: gstSetting } = await window.supabaseClient
            .from('settings')
            .select('setting_value')
            .eq('setting_key', 'course_gst_rate')
            .single();
        if (gstSetting) defaultGstRate = parseFloat(gstSetting.setting_value) || 18;
    } catch (e) {
        console.warn('Using default course GST 18%');
    }

    await loadCourses();

    bindFormEvents();
    document.getElementById('sync-courses-btn')?.addEventListener('click', syncCourses);

    // Check for deep links (Spotlight Search)
    const params = new URLSearchParams(window.location.search);
    const deepLinkId = params.get('id');
    if (deepLinkId && allCourses.length > 0) {
        const course = allCourses.find(c => c.id == deepLinkId);
        if (course) {
            // Clear param
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);

            openFeeForm(course.id, course.course_code, course.course_name, course.base_fee, course.gst_amount, course.fee);
        }
    }
});

// =====================
// Data Loading
// =====================
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
        allCourses = courses || [];
        renderCoursesList(allCourses);
    } catch (error) {
        console.error(error);
        content.innerHTML = '<div class="error-state"><i class="fa-solid fa-exclamation-triangle"></i><p>Failed to load courses.</p></div>';
    }
}

function renderCoursesList(courses) {
    const content = document.getElementById('courses-content');

    if (!courses || courses.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-book-bookmark"></i></div>
                <h3>No courses yet</h3>
                <p>Click "Sync from Website" to populate courses</p>
            </div>`;
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedCourses = courses.slice(start, start + itemsPerPage);

    content.innerHTML = `
        <div class="admin-courses-grid">
            ${paginatedCourses.map(c => `
                <div class="admin-course-card">
                    <div class="card-id-ribbon">${c.course_id}</div>
                    <div class="card-body">
                        <div class="card-main-info">
                            <span class="course-code-tag">${c.course_code}</span>
                            <h4>${c.course_name}</h4>
                        </div>
                        <div class="card-pricing-details">
                            <div class="price-row">
                                <span class="label">Base Fee</span>
                                <span class="value">₹${formatNumber(c.base_fee || c.fee || 0)}</span>
                            </div>
                            <div class="price-row">
                                <span class="label">GST (${defaultGstRate}%)</span>
                                <span class="value">₹${formatNumber(c.gst_amount || 0)}</span>
                            </div>
                            <div class="price-row total">
                                <span class="label">Total Fee</span>
                                <span class="value">₹${formatNumber(c.total_fee || c.fee || 0)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-primary btn-sm btn-edit-fee" data-id="${c.id}" data-code="${c.course_code}" data-name="${c.course_name}" 
                            data-base="${c.base_fee || c.fee || 0}" data-gst="${c.gst_amount || 0}" data-total="${c.total_fee || c.fee || 0}">
                            <i class="fa-solid fa-pen"></i> Edit Pricing
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="admin-table-footer">
            <span>Showing ${start + 1}-${Math.min(start + itemsPerPage, courses.length)} of ${courses.length} courses</span>
        </div>
    `;

    // Render pagination
    window.AdminUtils.Pagination.render('pagination-container', courses.length, currentPage, itemsPerPage, (page) => {
        currentPage = page;
        renderCoursesList(allCourses);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.querySelectorAll('.btn-edit-fee').forEach(btn =>
        btn.addEventListener('click', () => openFeeForm(btn.dataset.id, btn.dataset.code, btn.dataset.name, btn.dataset.base, btn.dataset.gst, btn.dataset.total)));
}

function formatNumber(num) {
    return num.toLocaleString('en-IN');
}

// =====================
// Sync Courses
// =====================
async function syncCourses() {
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('sync-courses-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';

    try {
        // 1. Fetch current database state
        const { data: existing, error: fetchError } = await window.supabaseClient.from('courses').select('course_code, course_id');
        if (fetchError) throw fetchError;

        const existingCodes = new Set(existing?.map(c => c.course_code) || []);

        // 2. Clear potential ID collisions by prefixing existing internal IDs
        // This allows us to re-assign C-001, C-002 etc. in any order
        if (existing && existing.length > 0) {
            for (const course of existing) {
                await window.supabaseClient.from('courses')
                    .update({ course_id: 'TEMP-' + course.course_id })
                    .eq('course_code', course.course_code);
            }
        }

        // 3. Purge old Career Counselling records with wrong codes (legacy cleanup)
        await window.supabaseClient.from('courses').delete().eq('course_name', 'Career Counselling').neq('course_code', 'CAREER');

        let synced = 0;
        for (let i = 0; i < websiteCourses.length; i++) {
            const c = websiteCourses[i];
            const cid = `C-${String(i + 1).padStart(3, '0')}`;

            if (existingCodes.has(c.code)) {
                // Update existing record with final ID and name
                const { error: upErr } = await window.supabaseClient.from('courses')
                    .update({
                        course_id: cid,
                        course_name: c.name,
                        synced_at: new Date().toISOString()
                    })
                    .eq('course_code', c.code);
                if (upErr) console.error(`Error updating ${c.code}:`, upErr);
            } else {
                // Insert new course
                const { error: insErr } = await window.supabaseClient.from('courses')
                    .insert({
                        course_id: cid,
                        course_code: c.code,
                        course_name: c.name,
                        fee: 0,
                        status: 'ACTIVE',
                        synced_at: new Date().toISOString()
                    });
                if (insErr) console.error(`Error inserting ${c.code}:`, insErr);
            }
            synced++;
        }

        // 4. Cleanup: If any leftover TEMP- IDs exist (courses removed from website), 
        // they stay as TEMP- but valid. Optional: handle deletions.

        Toast.success('Sync Complete', `${synced} courses processed from website`);
        await loadCourses();
    } catch (e) {
        console.error('Sync Error:', e);
        Toast.error('Sync Failed', e.message || 'An unknown error occurred during synchronization');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync from Website';
    }
}

// =====================
// Inline Fee Form
// =====================
function bindFormEvents() {
    document.getElementById('close-fee-form-btn')?.addEventListener('click', closeFeeForm);
    document.getElementById('cancel-fee-btn')?.addEventListener('click', closeFeeForm);
    document.getElementById('save-fee-btn')?.addEventListener('click', saveFee);
}

function openFeeForm(id, code, name, baseFee, gstAmount, totalFee) {
    const container = document.getElementById('fee-form-container');
    document.getElementById('edit-course-id').value = id;
    document.getElementById('fee-course-name').value = `${code} - ${name}`;
    document.getElementById('fee-modal-title').innerText = `Edit Pricing (GST ${defaultGstRate}%)`;

    const baseInput = document.getElementById('base-fee-input');
    const gstInput = document.getElementById('gst-amount-input');
    const totalInput = document.getElementById('total-fee-input');

    baseInput.value = baseFee || 0;
    gstInput.value = gstAmount || 0;
    totalInput.value = totalFee || 0;

    // Attach real-time calculation listeners
    baseInput.oninput = () => calculateFromBase();
    totalInput.oninput = () => calculateFromTotal();

    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    baseInput.focus();
}

function calculateFromBase() {
    const base = parseFloat(document.getElementById('base-fee-input').value) || 0;
    const gst = (base * defaultGstRate) / 100;
    const total = base + gst;

    document.getElementById('gst-amount-input').value = gst.toFixed(2);
    document.getElementById('total-fee-input').value = total.toFixed(2);
}

function calculateFromTotal() {
    const total = parseFloat(document.getElementById('total-fee-input').value) || 0;
    const base = total / (1 + defaultGstRate / 100);
    const gst = total - base;

    document.getElementById('base-fee-input').value = base.toFixed(2);
    document.getElementById('gst-amount-input').value = gst.toFixed(2);
}

function closeFeeForm() {
    document.getElementById('fee-form-container').style.display = 'none';
}

async function saveFee() {
    const { Toast } = window.AdminUtils;
    const saveBtn = document.getElementById('save-fee-btn');
    const id = document.getElementById('edit-course-id').value;

    const baseFee = parseFloat(document.getElementById('base-fee-input').value) || 0;
    const gstAmount = parseFloat(document.getElementById('gst-amount-input').value) || 0;
    const totalFee = parseFloat(document.getElementById('total-fee-input').value) || 0;

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        const { error } = await window.supabaseClient.from('courses').update({
            base_fee: baseFee,
            gst_amount: gstAmount,
            total_fee: totalFee,
            fee: totalFee // For backward compatibility
        }).eq('id', id);

        if (error) throw error;
        Toast.success('Saved', 'Pricing updated successfully');

        // Log activity
        const courseName = document.getElementById('fee-course-name').value;
        if (window.DashboardActivities) {
            await window.DashboardActivities.add('fee_updated', courseName, '../courses/');
        }

        closeFeeForm();
        await loadCourses();
    } catch (e) {
        Toast.error('Error', e.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Update Pricing';
    }
}


