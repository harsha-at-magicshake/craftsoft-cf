// Inquiries Module
let allInquiries = [];
let currentStatus = 'NEW';

document.addEventListener('DOMContentLoaded', async () => {
    const { NavigationSecurity } = window.AdminUtils || {};
    NavigationSecurity?.initProtectedPage();

    const session = await window.supabaseConfig?.getSession();
    if (!session) {
        NavigationSecurity?.secureRedirect('../login.html');
        return;
    }

    AdminSidebar.init('inquiries');
    document.getElementById('header-container').innerHTML = AdminHeader.render('Inquiries');

    // Tab switching
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentStatus = tab.dataset.status;
            renderInquiries();
        });
    });

    await loadInquiries();
});

async function loadInquiries() {
    const content = document.getElementById('inquiries-content');

    try {
        const { data, error } = await window.supabaseClient
            .from('contact_form')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allInquiries = data || [];
        renderInquiries();
    } catch (error) {
        console.error('Load error:', error);
        content.innerHTML = '<div class="error-state"><i class="fa-solid fa-exclamation-triangle"></i><p>Failed to load inquiries.</p></div>';
    }
}

function renderInquiries() {
    const content = document.getElementById('inquiries-content');
    const filtered = allInquiries.filter(i => i.status === currentStatus);

    if (filtered.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-envelope"></i></div>
                <h3>No ${currentStatus.toLowerCase()} inquiries</h3>
            </div>`;
        return;
    }

    content.innerHTML = filtered.map(i => `
        <div class="inquiry-card" data-id="${i.id}">
            <div class="inquiry-header">
                <div class="inquiry-name">${i.name}</div>
                <div class="inquiry-date">${new Date(i.created_at).toLocaleDateString('en-IN')}</div>
            </div>
            <div class="inquiry-contact">
                <span><i class="fa-solid fa-phone"></i> ${i.phone || '-'}</span>
                <span><i class="fa-solid fa-envelope"></i> ${i.email || '-'}</span>
            </div>
            <div class="inquiry-message">${i.message || 'No message'}</div>
            <div class="inquiry-actions">
                ${currentStatus === 'NEW' ? `
                    <button class="btn btn-sm btn-outline" onclick="updateStatus('${i.id}', 'CONTACTED')">
                        <i class="fa-solid fa-check"></i> Mark Contacted
                    </button>
                ` : ''}
                ${currentStatus === 'CONTACTED' ? `
                    <button class="btn btn-sm btn-primary" onclick="updateStatus('${i.id}', 'CLOSED')">
                        <i class="fa-solid fa-check-double"></i> Close
                    </button>
                ` : ''}
                <a href="https://wa.me/91${(i.phone || '').replace(/\D/g, '')}" target="_blank" class="btn btn-sm btn-whatsapp">
                    <i class="fa-brands fa-whatsapp"></i>
                </a>
                <a href="mailto:${i.email}" class="btn btn-sm btn-outline">
                    <i class="fa-solid fa-envelope"></i>
                </a>
            </div>
        </div>
    `).join('');
}

async function updateStatus(id, status) {
    const { Toast } = window.AdminUtils;
    try {
        const { error } = await window.supabaseClient
            .from('contact_form')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
        Toast.success('Updated', `Status changed to ${status}`);
        await loadInquiries();
    } catch (error) {
        Toast.error('Error', 'Failed to update status');
    }
}

window.updateStatus = updateStatus;
