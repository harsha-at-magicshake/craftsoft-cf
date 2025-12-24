// Inquiries Page Logic - Migrated to Supabase

let allInquiries = [];
let currentInquiry = null;

// Load Inquiries
async function loadInquiries() {
    try {
        if (typeof showCardSkeleton === 'function') showCardSkeleton('inquiriesList', 4);

        const { data, error } = await supabase
            .from('inquiries')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allInquiries = data;
        let newCount = 0, demoCount = 0, convertedCount = 0;

        allInquiries.forEach(inquiry => {
            if (inquiry.status === 'new') newCount++;
            if (inquiry.status === 'demo-scheduled') demoCount++;
            if (inquiry.status === 'converted') convertedCount++;
        });

        document.getElementById('newCount').textContent = newCount;
        document.getElementById('demoCount').textContent = demoCount;
        document.getElementById('convertedCount').textContent = convertedCount;

        renderInquiries(allInquiries);
    } catch (error) {
        console.error('Error loading inquiries:', error);
        showToast('Error loading inquiries', 'error');
    }
}

// Render Inquiries
function renderInquiries(inquiries) {
    const container = document.getElementById('inquiriesList');
    if (!container) return;

    if (inquiries.length === 0) {
        container.innerHTML = `<div class="card"><div class="empty-state"><h3>No inquiries yet</h3></div></div>`;
        return;
    }

    container.innerHTML = inquiries.map(inquiry => {
        const statusClass = inquiry.status || 'new';
        return `
            <div class="inquiry-card ${statusClass}">
                <div class="inquiry-header">
                    <div>
                        <div class="inquiry-name">${inquiry.name}</div>
                        <div class="inquiry-phone"><a href="tel:${inquiry.phone}">📞 ${inquiry.phone}</a></div>
                    </div>
                    <span class="inquiry-course">${inquiry.course || 'General'}</span>
                </div>
                <div class="inquiry-meta">
                    <span>${inquiry.source || 'Other'}</span>
                    <span>${formatDate(inquiry.created_at)}</span>
                    ${inquiry.demo_date ? `<span>📅 Demo: ${formatDate(inquiry.demo_date)}</span>` : ''}
                </div>
                ${inquiry.notes ? `<p class="inquiry-notes">${inquiry.notes}</p>` : ''}
                <div class="inquiry-actions">
                    <select onchange="updateStatus('${inquiry.id}', this.value)">
                        <option value="new" ${inquiry.status === 'new' ? 'selected' : ''}>🆕 New</option>
                        <option value="demo-scheduled" ${inquiry.status === 'demo-scheduled' ? 'selected' : ''}>📅 Demo Scheduled</option>
                        <option value="converted" ${inquiry.status === 'converted' ? 'selected' : ''}>🎉 Converted</option>
                        <option value="lost" ${inquiry.status === 'lost' ? 'selected' : ''}>❌ Lost</option>
                    </select>
                    <button class="btn btn-outline btn-sm" onclick="openEditModal('${inquiry.id}')"><span class="material-icons">edit</span></button>
                    <button class="btn btn-outline btn-sm" onclick="deleteInquiry('${inquiry.id}')" style="color:#EF4444"><span class="material-icons">delete</span></button>
                </div>
            </div>`;
    }).join('');
}

// Update Status
async function updateStatus(id, status) {
    try {
        const { error } = await supabase.from('inquiries').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        showToast('Status updated');
        loadInquiries();
    } catch (e) { showToast('Error updating status', 'error'); }
}

// Delete
async function deleteInquiry(id) {
    const confirmed = await showConfirm({ title: 'Delete Lead?', type: 'danger' });
    if (!confirmed) return;
    const { error } = await supabase.from('inquiries').delete().eq('id', id);
    if (!error) { showToast('Deleted'); loadInquiries(); }
}

// Add Inquiry
document.getElementById('addInquiryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('inquiryName').value,
        phone: formatPhoneNumber(document.getElementById('inquiryPhone').value),
        course: document.getElementById('inquiryCourse').value,
        source: document.getElementById('inquirySource').value,
        demo_date: document.getElementById('inquiryDemo').value || null,
        notes: document.getElementById('inquiryNotes').value,
        status: document.getElementById('inquiryDemo').value ? 'demo-scheduled' : 'new',
        created_at: new Date().toISOString()
    };
    const { error } = await supabase.from('inquiries').insert([data]);
    if (!error) { showToast('Added!'); closeModal('addInquiryModal'); loadInquiries(); }
});

// Edit Inquiry
async function openEditModal(id) {
    const { data } = await supabase.from('inquiries').select('*').eq('id', id).single();
    currentInquiry = data;
    document.getElementById('editInquiryId').value = id;
    document.getElementById('editName').value = data.name;
    document.getElementById('editPhone').value = data.phone;
    document.getElementById('editInquiryModal').classList.add('active');
}

document.getElementById('editInquiryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editInquiryId').value;
    const updates = {
        name: document.getElementById('editName').value,
        phone: formatPhoneNumber(document.getElementById('editPhone').value),
        updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('inquiries').update(updates).eq('id', id);
    if (!error) { showToast('Updated!'); closeModal('editInquiryModal'); loadInquiries(); }
});

// Globals
window.updateStatus = updateStatus;
window.deleteInquiry = deleteInquiry;
window.openEditModal = openEditModal;
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
window.closeModal = closeModal;

document.addEventListener('DOMContentLoaded', loadInquiries);
