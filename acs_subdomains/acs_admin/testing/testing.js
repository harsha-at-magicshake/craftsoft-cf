/* ============================================
   Student Testing Page Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialise Sidebar and Login Security
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    AdminSidebar.init('student-testing');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Student Testing');
    }

    const admin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, admin);

    // 2. Initialise Features
    initStudentSearch();
});

function initStudentSearch() {
    const searchInput = document.getElementById('student-search-input');
    const resultsList = document.getElementById('search-results-list');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();

        if (query.length < 2) {
            resultsList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-microscope"></i>
                    <p>Ready to analyze. Enter a name to begin.</p>
                </div>
            `;
            return;
        }

        debounceTimer = setTimeout(() => performSearch(query), 300);
    });
}

async function performSearch(query) {
    const resultsList = document.getElementById('search-results-list');

    resultsList.innerHTML = `
        <div class="text-center py-5">
            <i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary opacity-50"></i>
        </div>
    `;

    try {
        const { data, error } = await window.supabaseClient
            .from('students')
            .select('id, student_id, first_name, last_name, email, status')
            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,student_id.ilike.%${query}%,email.ilike.%${query}%`)
            .eq('status', 'ACTIVE')
            .is('deleted_at', null)
            .limit(10);

        if (error) throw error;

        if (!data || data.length === 0) {
            resultsList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-user-slash"></i>
                    <p>No active students matching "${query}"</p>
                </div>
            `;
            return;
        }

        resultsList.innerHTML = data.map(s => `
            <div class="student-search-item" onclick="loadPortalPreview('${s.id}', this)">
                <div class="avatar">${s.first_name[0]}${s.last_name ? s.last_name[0] : ''}</div>
                <div class="info">
                    <span class="name">${s.first_name} ${s.last_name || ''}</span>
                    <span class="meta">${s.student_id} • ${s.email || 'No email'}</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Search error:', error);
        resultsList.innerHTML = `<div class="p-3 text-center text-danger">Search failed. Try again.</div>`;
    }
}

async function loadPortalPreview(studentId, element) {
    const previewContainer = document.getElementById('preview-container');
    const statFee = document.getElementById('stat-fee');
    const statPaid = document.getElementById('stat-paid');
    const statBalance = document.getElementById('stat-balance');

    // Update active state in list
    document.querySelectorAll('.student-search-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // Loading overlay
    previewContainer.innerHTML = `
        <div class="analysis-placeholder">
            <div class="placeholder-content">
                <i class="fa-solid fa-circle-notch fa-spin fa-2x text-primary"></i>
                <h3>Synchronizing Live Data...</h3>
            </div>
        </div>
    `;

    try {
        // Fetch student data and last 5 payments
        const [studentRes, paymentsRes] = await Promise.all([
            window.supabaseClient.from('students').select('*').eq('id', studentId).single(),
            window.supabaseClient.from('payments').select('*').eq('student_id', studentId).order('payment_date', { ascending: false }).limit(5)
        ]);

        if (studentRes.error) throw studentRes.error;
        const student = studentRes.data;
        const payments = paymentsRes.data || [];

        // Fetch courses
        let courses = [];
        if (student.courses && student.courses.length > 0) {
            const { data: coursesData } = await window.supabaseClient
                .from('courses')
                .select('course_code, course_name')
                .in('course_code', student.courses);
            courses = coursesData || [];
        }

        const totalPaid = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
        const finalFee = student.final_fee || (student.fee - student.discount) || 0;
        const feeDue = finalFee - totalPaid;

        // Populate Stats Bar
        statFee.innerText = `â‚¹${finalFee.toLocaleString()}`;
        statPaid.innerText = `â‚¹${totalPaid.toLocaleString()}`;
        statBalance.innerText = `â‚¹${feeDue.toLocaleString()}`;
        statBalance.style.color = feeDue > 0 ? '#ef4444' : '#10b981';

        previewContainer.innerHTML = `
            <div class="portal-preview">
                <div class="preview-header">
                    <div>
                        <span class="preview-badge">Student Portal Sync</span>
                        <h2>${student.first_name} ${student.last_name || ''}</h2>
                        <small class="text-secondary">Viewing profile ACS-${student.student_id}</small>
                    </div>
                </div>

                <div class="preview-sections">
                    <!-- Profile Card -->
                    <div class="analysis-card">
                        <div class="card-label">
                            <i class="fa-solid fa-user-shield"></i> Deployment Info
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <small>Registration ID</small>
                                <span>ACS-${student.student_id}</span>
                            </div>
                            <div class="info-item">
                                <small>Contact Email</small>
                                <span>${student.email || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <small>Mobile No.</small>
                                <span>+91 ${student.phone}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Courses -->
                    <div class="analysis-card">
                        <div class="card-label">
                            <i class="fa-solid fa-graduation-cap"></i> Enrolled Courses
                        </div>
                        <div class="course-list-mini">
                            ${courses.length > 0 ? courses.map(c => `
                                <div class="course-tag">
                                    <i class="fa-solid fa-book-bookmark"></i>
                                    <span>${c.course_name}</span>
                                </div>
                            `).join('') : '<p class="text-secondary">No courses enrolled</p>'}
                        </div>
                    </div>

                    <!-- Payments -->
                    <div class="analysis-card">
                        <div class="card-label">
                            <i class="fa-solid fa-receipt"></i> Recent Transactions
                        </div>
                        <div class="payment-history-mini">
                            ${payments.length > 0 ? payments.map(p => `
                                <div class="payment-mini-row">
                                    <span class="date">${new Date(p.payment_date).toLocaleDateString()}</span>
                                    <span class="amount">â‚¹${(p.amount_paid || 0).toLocaleString()}</span>
                                    <span class="mode">${p.payment_mode || 'ONLINE'}</span>
                                </div>
                            `).join('') : '<p class="text-secondary">No payment records</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Preview error:', error);
        previewContainer.innerHTML = `<div class="p-5 text-center text-danger">Failed to sync data. Error: ${error.message}</div>`;
    }
}
