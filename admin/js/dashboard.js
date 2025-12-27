/* ============================================
   Dashboard Page Logic
   - Auth check
   - Load admin data
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
    // ============================================
    // AUTH CHECK
    // ============================================

    async function checkAuth() {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();

            if (!session || !session.user) {
                window.location.replace('signin.html');
                return null;
            }

            if (!session.user.email_confirmed_at) {
                window.location.replace('signin.html');
                return null;
            }

            return session;
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.replace('signin.html');
            return null;
        }
    }

    const session = await checkAuth();
    if (!session) return;

    // ============================================
    // LOAD ADMIN DATA
    // ============================================

    async function loadAdminData() {
        try {
            const { data: admin, error } = await window.supabaseClient
                .from('admins')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error || !admin) {
                console.error('Failed to load admin data:', error);
                return null;
            }

            return admin;
        } catch (e) {
            console.error('Error loading admin:', e);
            return null;
        }
    }

    const admin = await loadAdminData();

    // Update UI with admin info
    if (admin) {
        const adminNameEl = document.getElementById('adminName');
        const adminIdEl = document.getElementById('adminId');
        const adminAvatarEl = document.getElementById('adminAvatar');
        const welcomeNameEl = document.getElementById('welcomeName');
        const welcomeIdEl = document.getElementById('welcomeAdminId');
        const welcomeEmailEl = document.getElementById('welcomeEmail');

        if (adminNameEl) adminNameEl.textContent = admin.full_name;
        if (adminIdEl) adminIdEl.textContent = admin.admin_id;
        if (adminAvatarEl) adminAvatarEl.textContent = admin.full_name.charAt(0).toUpperCase();
        if (welcomeNameEl) welcomeNameEl.textContent = admin.full_name.split(' ')[0];
        if (welcomeIdEl) welcomeIdEl.textContent = admin.admin_id;
        if (welcomeEmailEl) welcomeEmailEl.textContent = admin.email;
    }

    // ============================================
    // LOAD DASHBOARD STATS FROM SUPABASE
    // ============================================
    async function loadDashboardStats() {
        try {
            // Load students count
            const { count: studentCount, error: studentError } = await window.supabaseClient
                .from('students')
                .select('*', { count: 'exact', head: true });

            const statStudents = document.getElementById('statStudents');
            if (statStudents) {
                statStudents.textContent = studentError ? (localStorage.getItem('craftsoft_student_count') || 0) : studentCount;
            }

            // Load tutors count
            const { count: tutorCount, error: tutorError } = await window.supabaseClient
                .from('tutors')
                .select('*', { count: 'exact', head: true });

            const statTutors = document.getElementById('statTutors');
            if (statTutors) {
                statTutors.textContent = tutorError ? (localStorage.getItem('craftsoft_tutor_count') || 0) : tutorCount;
            }

            // Load inquiries count
            const { count: inquiryCount, error: inquiryError } = await window.supabaseClient
                .from('inquiries')
                .select('*', { count: 'exact', head: true });

            const statInquiries = document.getElementById('statInquiries');
            if (statInquiries) {
                statInquiries.textContent = inquiryError ? (localStorage.getItem('craftsoft_inquiry_count') || 0) : inquiryCount;
            }

            // Load revenue (sum of payments)
            const { data: payments, error: paymentError } = await window.supabaseClient
                .from('payments')
                .select('amount');

            const statRevenue = document.getElementById('statRevenue');
            if (statRevenue) {
                if (paymentError) {
                    statRevenue.textContent = '₹' + (localStorage.getItem('craftsoft_revenue') || 0).toLocaleString('en-IN');
                } else {
                    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
                    statRevenue.textContent = '₹' + totalRevenue.toLocaleString('en-IN');
                }
            }

        } catch (error) {
            console.error('Error loading stats:', error);
            // Fallback to localStorage
            const statStudents = document.getElementById('statStudents');
            const statTutors = document.getElementById('statTutors');
            const statInquiries = document.getElementById('statInquiries');
            const statRevenue = document.getElementById('statRevenue');

            if (statStudents) statStudents.textContent = localStorage.getItem('craftsoft_student_count') || 0;
            if (statTutors) statTutors.textContent = localStorage.getItem('craftsoft_tutor_count') || 0;
            if (statInquiries) statInquiries.textContent = localStorage.getItem('craftsoft_inquiry_count') || 0;
            if (statRevenue) statRevenue.textContent = '₹' + (localStorage.getItem('craftsoft_revenue') || 0).toLocaleString('en-IN');
        }
    }

    loadDashboardStats();

    // Refresh stats when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) loadDashboardStats();
    });
});
