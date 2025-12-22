// Inquiries Page Logic - Track leads, demos, and follow-ups

let allInquiries = [];
let currentInquiry = null;

// Update user info
auth.onAuthStateChanged((user) => {
    if (user) {
        const initial = user.email.charAt(0).toUpperCase();
        document.getElementById('userAvatar').textContent = initial;
        document.getElementById('userName').textContent = user.email.split('@')[0];
    }
});

// Load Inquiries
async function loadInquiries() {
    try {
        if (typeof showCardSkeleton === 'function') showCardSkeleton('inquiriesList', 4);
        const snapshot = await db.collection('inquiries').orderBy('createdAt', 'desc').get();

        allInquiries = [];
        let newCount = 0;
        let demoCount = 0;
        let convertedCount = 0;
        let totalCount = 0;

        snapshot.forEach(doc => {
            const inquiry = { id: doc.id, ...doc.data() };
            allInquiries.push(inquiry);
            totalCount++;

            if (inquiry.status === 'new') newCount++;
            if (inquiry.status === 'demo-scheduled') demoCount++;
            if (inquiry.status === 'converted') convertedCount++;
        });

        // Update stats
        document.getElementById('newCount').textContent = newCount;
        document.getElementById('demoCount').textContent = demoCount;
        document.getElementById('convertedCount').textContent = convertedCount;
        document.getElementById('conversionRate').textContent = totalCount > 0
            ? Math.round((convertedCount / totalCount) * 100) + '%'
            : '0%';

        renderInquiries(allInquiries);

    } catch (error) {
        console.error('Error loading inquiries:', error);
        showToast('Error loading inquiries', 'error');
    }
}

// Render Inquiries
function renderInquiries(inquiries) {
    const container = document.getElementById('inquiriesList');

    if (inquiries.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <span class="material-icons">contact_phone</span>
                    <h3>No inquiries yet</h3>
                    <p>Click "Add Inquiry" to track your first lead</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = inquiries.map(inquiry => {
        const createdDate = formatDate(inquiry.createdAt);

        let demoInfo = '';
        if (inquiry.demoDate) {
            const demoDate = new Date(inquiry.demoDate);
            const isUpcoming = demoDate > new Date();
            const demoStr = formatDate(demoDate);
            demoInfo = `<span class="demo-time"><span class="material-icons">${isUpcoming ? 'schedule' : 'event_available'}</span> ${demoStr}</span>`;
        }

        const statusLabels = {
            'new': '🆕 New',
            'demo-scheduled': '📅 Demo Scheduled',
            'demo-done': '✅ Demo Done',
            'converted': '🎉 Converted',
            'lost': '❌ Lost'
        };

        const sourceIcons = {
            'website': 'language',
            'whatsapp': 'chat',
            'instagram': 'photo_camera',
            'facebook': 'thumb_up',
            'referral': 'people',
            'walk-in': 'directions_walk',
            'other': 'help'
        };

        return `
            <div class="inquiry-card ${inquiry.status || 'new'}">
                <div class="inquiry-header">
                    <div>
                        <div class="inquiry-name">${inquiry.name}</div>
                        <div class="inquiry-phone">
                            <a href="tel:${inquiry.phone}" style="color: #64748b; text-decoration: none;">
                                📞 ${inquiry.phone}
                            </a>
                        </div>
                    </div>
                    <span class="inquiry-course">${inquiry.course}</span>
                </div>
                
                <div class="inquiry-meta">
                    <span><span class="material-icons">${sourceIcons[inquiry.source] || 'help'}</span> ${inquiry.source || 'Unknown'}</span>
                    <span><span class="material-icons">calendar_today</span> ${createdDate}</span>
                    ${demoInfo}
                </div>
                
                ${inquiry.notes ? `<p style="font-size: 0.85rem; color: #475569; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px;">${inquiry.notes}</p>` : ''}
                
                <div class="inquiry-actions">
                    <select class="status-select" onchange="updateStatus('${inquiry.id}', this.value)">
                        <option value="new" ${inquiry.status === 'new' ? 'selected' : ''}>🆕 New</option>
                        <option value="demo-scheduled" ${inquiry.status === 'demo-scheduled' ? 'selected' : ''}>📅 Demo Scheduled</option>
                        <option value="demo-done" ${inquiry.status === 'demo-done' ? 'selected' : ''}>✅ Demo Done</option>
                        <option value="converted" ${inquiry.status === 'converted' ? 'selected' : ''}>🎉 Converted</option>
                        <option value="lost" ${inquiry.status === 'lost' ? 'selected' : ''}>❌ Lost</option>
                    </select>
                    <button class="btn btn-whatsapp btn-sm" onclick="sendWhatsApp('${inquiry.phone}', '${inquiry.name}', '${inquiry.course}')" title="WhatsApp">
                        <span class="material-icons">chat</span>
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="openEditModal('${inquiry.id}')" title="Edit">
                        <span class="material-icons">edit</span>
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="deleteInquiry('${inquiry.id}')" title="Delete" style="color: #EF4444;">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Filter Inquiries
function filterInquiries() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;

    let filtered = allInquiries.filter(inquiry => {
        const matchesSearch = !search ||
            inquiry.name.toLowerCase().includes(search) ||
            (inquiry.phone && inquiry.phone.includes(search));

        const matchesStatus = !status || inquiry.status === status;

        return matchesSearch && matchesStatus;
    });

    renderInquiries(filtered);
}

document.getElementById('searchInput').addEventListener('input', filterInquiries);
document.getElementById('statusFilter').addEventListener('change', filterInquiries);

// Update Status
async function updateStatus(id, status) {
    try {
        await db.collection('inquiries').doc(id).update({
            status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Status updated', 'success');
        loadInquiries();
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Error updating status', 'error');
    }
}

// Send WhatsApp
function sendWhatsApp(phone, name, course) {
    const message = `Hi ${name}! 👋

Thank you for your interest in *${course}* at Abhi's Craft Soft!

We'd love to schedule a FREE demo class for you. When would be a convenient time?

📍 Location: Vanasthalipuram, Hyderabad
📞 Call/WhatsApp: 7842239090
🌐 Website: www.craftsoft.co.in

Looking forward to hearing from you! 🎓`;

    const whatsappUrl = `https://wa.me/${phone.replace(/\+/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Open Edit Modal
async function openEditModal(id) {
    try {
        const doc = await db.collection('inquiries').doc(id).get();
        currentInquiry = { id: doc.id, ...doc.data() };

        document.getElementById('editInquiryId').value = id;
        document.getElementById('editName').value = currentInquiry.name || '';
        document.getElementById('editPhone').value = currentInquiry.phone || '';
        document.getElementById('editCourse').value = currentInquiry.course || '';
        document.getElementById('editStatus').value = currentInquiry.status || 'new';
        document.getElementById('editNotes').value = currentInquiry.notes || '';

        if (currentInquiry.demoDate) {
            document.getElementById('editDemo').value = currentInquiry.demoDate;
        } else {
            document.getElementById('editDemo').value = '';
        }

        document.getElementById('editInquiryModal').classList.add('active');
    } catch (error) {
        console.error('Error loading inquiry:', error);
        showToast('Error loading inquiry', 'error');
    }
}

// Follow Up WhatsApp from Edit Modal
function followUpWhatsApp() {
    if (currentInquiry) {
        sendWhatsApp(currentInquiry.phone, currentInquiry.name, currentInquiry.course);
    }
}

// Convert to Student
async function convertToStudent() {
    if (!currentInquiry) return;

    // Redirect to students page with pre-filled data (via URL params)
    const params = new URLSearchParams({
        name: currentInquiry.name,
        phone: currentInquiry.phone,
        course: currentInquiry.course,
        fromInquiry: currentInquiry.id
    });

    window.location.href = `students.html?${params.toString()}`;
}

// Delete Inquiry
async function deleteInquiry(id) {
    const confirmed = await showConfirm({
        title: 'Delete Inquiry?',
        message: 'Are you sure you want to delete this lead?',
        confirmText: 'Yes, Delete',
        type: 'danger'
    });

    if (!confirmed) return;

    try {
        await db.collection('inquiries').doc(id).delete();
        showToast('Inquiry deleted', 'success');
        loadInquiries();
    } catch (error) {
        console.error('Error deleting inquiry:', error);
        showToast('Error deleting', 'error');
    }
}

// Modal Functions
function openAddInquiryModal() {
    document.getElementById('addInquiryForm').reset();
    document.getElementById('addInquiryModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

// Add Inquiry Form
document.getElementById('addInquiryForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('inquiryName').value.trim();
    const phone = formatPhoneNumber(document.getElementById('inquiryPhone').value.trim());
    const course = document.getElementById('inquiryCourse').value;
    const source = document.getElementById('inquirySource').value;
    const demoDate = document.getElementById('inquiryDemo').value;
    const notes = document.getElementById('inquiryNotes').value.trim();

    try {
        await db.collection('inquiries').add({
            name,
            phone,
            course,
            source,
            demoDate: demoDate || null,
            notes,
            status: demoDate ? 'demo-scheduled' : 'new',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Inquiry added!', 'success');
        closeModal('addInquiryModal');
        loadInquiries();

    } catch (error) {
        console.error('Error adding inquiry:', error);
        showToast('Error adding inquiry', 'error');
    }
});

// Edit Inquiry Form
document.getElementById('editInquiryForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editInquiryId').value;
    const name = document.getElementById('editName').value.trim();
    const phone = formatPhoneNumber(document.getElementById('editPhone').value.trim());
    const course = document.getElementById('editCourse').value;
    const status = document.getElementById('editStatus').value;
    const demoDate = document.getElementById('editDemo').value;
    const notes = document.getElementById('editNotes').value.trim();

    try {
        await db.collection('inquiries').doc(id).update({
            name,
            phone,
            course,
            status,
            demoDate: demoDate || null,
            notes,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Inquiry updated!', 'success');
        closeModal('editInquiryModal');
        loadInquiries();

    } catch (error) {
        console.error('Error updating inquiry:', error);
        showToast('Error updating', 'error');
    }
});

// Toast
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Global functions
window.openAddInquiryModal = openAddInquiryModal;
window.closeModal = closeModal;
window.updateStatus = updateStatus;
window.sendWhatsApp = sendWhatsApp;
window.openEditModal = openEditModal;
window.followUpWhatsApp = followUpWhatsApp;
window.convertToStudent = convertToStudent;
window.deleteInquiry = deleteInquiry;

// Phone input validation
document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('input', function () {
        this.value = this.value.replace(/[^+0-9]/g, '').slice(0, 15);
    });
});

// Load data
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadInquiries, 500);
});
