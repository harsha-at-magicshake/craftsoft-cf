(async function () {
    let studentData = {};

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
        // Render Header First
        const header = document.getElementById('header-container');
        if (header && window.StudentHeader) {
            header.innerHTML = window.StudentHeader.render('My Profile');
        }

        if (window.StudentSidebar) {
            window.StudentSidebar.init('profile');
            window.StudentSidebar.renderAccountPanel(studentData);
        }

        renderDetails();
    }

    function renderDetails() {
        document.getElementById('p-name').textContent = studentData.name || 'N/A';
        document.getElementById('p-id').textContent = studentData.student_id || 'N/A';
        document.getElementById('p-email').textContent = studentData.email || 'N/A';
        document.getElementById('p-phone').textContent = studentData.phone || 'N/A';
    }

    checkAuth();
})();
