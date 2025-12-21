// Students Page Logic - Enhanced with Edit and Demo Date

let allStudents = [];
let currentStudentData = null;

// Update user info
auth.onAuthStateChanged((user) => {
    if (user) {
        const initial = user.email.charAt(0).toUpperCase();
        document.getElementById('userAvatar').textContent = initial;
        document.getElementById('userName').textContent = user.email.split('@')[0];
    }
});

// Load Students
async function loadStudents() {
    try {
        const snapshot = await db.collection('students').orderBy('createdAt', 'desc').get();

        allStudents = [];
        snapshot.forEach(doc => {
            allStudents.push({ id: doc.id, ...doc.data() });
        });

        renderStudents(allStudents);

    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Error loading students', 'error');
    }
}

// Render Students Table
function renderStudents(students) {
    const tbody = document.getElementById('studentsTable');

    if (students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <span class="material-icons">group</span>
                        <h3>No students found</h3>
                        <p>Click "+" to add a student</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = students.map(student => {
        const pending = (student.totalFee || 0) - (student.paidAmount || 0);
        let statusClass = 'pending';
        let statusText = 'Pending';

        if (pending <= 0) {
            statusClass = 'paid';
            statusText = 'Paid';
        } else if (student.paidAmount > 0) {
            statusClass = 'partial';
            statusText = 'Partial';
        }

        // Format demo date
        let demoInfo = '';
        if (student.demoDate) {
            const demoDate = new Date(student.demoDate);
            demoInfo = demoDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        }

        return `
            <tr>
                <td>
                    <strong>${student.name}</strong>
                    <br><small style="color: #64748b;">${student.phone || '-'}</small>
                    ${demoInfo ? `<br><small style="color: #6C5CE7;">📅 Demo: ${demoInfo}</small>` : ''}
                </td>
                <td style="font-size: 0.8rem;">${student.course}</td>
                <td>${formatCurrency(student.totalFee)}</td>
                <td style="color: #10B981; font-weight: 600;">${formatCurrency(student.paidAmount)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-sm btn-icon" onclick="openEditStudentModal('${student.id}')" title="Edit">
                            <span class="material-icons">edit</span>
                        </button>
                        ${pending > 0 ? `<button class="btn btn-success btn-sm btn-icon" onclick="openPaymentModal('${student.id}', '${student.name}', ${pending})" title="Pay">
                            <span class="material-icons">add</span>
                        </button>` : ''}
                        <button class="btn btn-outline btn-sm btn-icon" onclick="openPaymentHistory('${student.id}')" title="History">
                            <span class="material-icons">receipt_long</span>
                        </button>
                        <button class="btn btn-whatsapp btn-sm btn-icon" onclick="shareViaWhatsApp('${student.id}')" title="WhatsApp">
                            <span class="material-icons">share</span>
                        </button>
                        <button class="btn btn-outline btn-sm btn-icon" onclick="deleteStudent('${student.id}')" title="Delete" style="color: #EF4444;">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter Students
function filterStudents() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const course = document.getElementById('courseFilter').value;
    const status = document.getElementById('statusFilter').value;

    let filtered = allStudents.filter(student => {
        const matchesSearch = !search ||
            student.name.toLowerCase().includes(search) ||
            (student.phone && student.phone.includes(search));

        const matchesCourse = !course || student.course === course;

        const pending = (student.totalFee || 0) - (student.paidAmount || 0);
        let studentStatus = 'pending';
        if (pending <= 0) studentStatus = 'paid';
        else if (student.paidAmount > 0) studentStatus = 'partial';

        const matchesStatus = !status || studentStatus === status;

        return matchesSearch && matchesCourse && matchesStatus;
    });

    renderStudents(filtered);
}

document.getElementById('searchInput').addEventListener('input', filterStudents);
document.getElementById('courseFilter').addEventListener('change', filterStudents);
document.getElementById('statusFilter').addEventListener('change', filterStudents);

// ============================================
// EDIT STUDENT - New Feature
// ============================================
async function openEditStudentModal(studentId) {
    try {
        const doc = await db.collection('students').doc(studentId).get();
        const student = { id: doc.id, ...doc.data() };

        document.getElementById('editStudentId').value = studentId;
        document.getElementById('editStudentName').value = student.name || '';
        document.getElementById('editStudentPhone').value = student.phone || '';
        document.getElementById('editStudentEmail').value = student.email || '';
        document.getElementById('editStudentCourse').value = student.course || '';
        document.getElementById('editTotalFee').value = student.totalFee || 0;
        document.getElementById('editDemoDate').value = student.demoDate || '';
        document.getElementById('editStudentNotes').value = student.notes || '';

        document.getElementById('editStudentModal').classList.add('active');
    } catch (error) {
        console.error('Error loading student:', error);
        showToast('Error loading student', 'error');
    }
}

// Edit Student Form Handler
document.getElementById('editStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const studentId = document.getElementById('editStudentId').value;
    const name = document.getElementById('editStudentName').value.trim();
    const phone = document.getElementById('editStudentPhone').value.trim();
    const email = document.getElementById('editStudentEmail').value.trim();
    const course = document.getElementById('editStudentCourse').value;
    const totalFee = parseInt(document.getElementById('editTotalFee').value) || 0;
    const demoDate = document.getElementById('editDemoDate').value;
    const notes = document.getElementById('editStudentNotes').value.trim();

    try {
        await db.collection('students').doc(studentId).update({
            name,
            phone,
            email,
            course,
            totalFee,
            demoDate: demoDate || null,
            notes,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Student updated successfully!', 'success');
        closeModal('editStudentModal');
        loadStudents();
    } catch (error) {
        console.error('Error updating student:', error);
        showToast('Error updating student', 'error');
    }
});

// Delete Student
async function deleteStudent(studentId) {
    if (!confirm('Are you sure you want to delete this student? This will also delete all their payment records.')) {
        return;
    }

    try {
        const paymentsSnapshot = await db.collection('payments')
            .where('studentId', '==', studentId)
            .get();

        const batch = db.batch();
        paymentsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        batch.delete(db.collection('students').doc(studentId));

        await batch.commit();

        showToast('Student deleted successfully', 'success');
        loadStudents();

    } catch (error) {
        console.error('Error deleting student:', error);
        showToast('Error deleting student', 'error');
    }
}

// Payment History
async function openPaymentHistory(studentId) {
    try {
        const studentDoc = await db.collection('students').doc(studentId).get();
        const student = { id: studentDoc.id, ...studentDoc.data() };
        currentStudentData = student;

        const pending = student.totalFee - student.paidAmount;

        document.getElementById('studentInfoHeader').innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h4 style="font-size: 1.1rem; margin-bottom: 4px;">${student.name}</h4>
                    <p style="color: #64748b; font-size: 0.85rem;">${student.course}</p>
                </div>
                <div style="text-align: right;">
                    <p style="font-size: 0.8rem; color: #64748b;">Balance</p>
                    <p style="font-size: 1.25rem; font-weight: 700; color: ${pending > 0 ? '#EF4444' : '#10B981'};">
                        ${formatCurrency(pending)}
                    </p>
                </div>
            </div>
        `;

        const paymentsSnapshot = await db.collection('payments')
            .where('studentId', '==', studentId)
            .orderBy('createdAt', 'desc')
            .get();

        const timeline = document.getElementById('paymentTimeline');

        if (paymentsSnapshot.empty) {
            timeline.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px;">
                    <span class="material-icons">receipt</span>
                    <h3>No payments recorded</h3>
                </div>
            `;
        } else {
            let timelineHTML = '';
            paymentsSnapshot.forEach(doc => {
                const payment = doc.data();
                const date = payment.createdAt?.toDate?.()
                    ? payment.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Unknown';

                const iconClass = payment.mode === 'cash' ? 'cash' : 'online';
                const modeIcon = payment.mode === 'cash' ? 'payments' : 'credit_card';

                timelineHTML += `
                    <li class="payment-timeline-item">
                        <div class="timeline-icon ${iconClass}">
                            <span class="material-icons">${modeIcon}</span>
                        </div>
                        <div class="timeline-content">
                            <div class="amount">${formatCurrency(payment.amount)}</div>
                            <div class="meta">${date} • ${payment.mode?.toUpperCase() || 'N/A'}</div>
                            <div class="receipt-num"># ${payment.receiptNumber || '-'}</div>
                        </div>
                    </li>
                `;
            });
            timeline.innerHTML = timelineHTML;
        }

        document.getElementById('paymentHistoryModal').classList.add('active');

    } catch (error) {
        console.error('Error loading payment history:', error);
        showToast('Error loading history', 'error');
    }
}

// WhatsApp Share
async function shareViaWhatsApp(studentId) {
    try {
        const studentDoc = await db.collection('students').doc(studentId).get();
        const student = studentDoc.data();

        const pending = student.totalFee - student.paidAmount;
        const status = pending <= 0 ? '✅ FULLY PAID' : '⏳ PARTIAL PAYMENT';

        const message = `🎓 *Abhi's Craft Soft*
━━━━━━━━━━━━━━━━━━
📋 *Payment Receipt*

👤 *Student:* ${student.name}
📚 *Course:* ${student.course}

💰 *Total Fee:* ₹${student.totalFee?.toLocaleString('en-IN')}
✅ *Paid:* ₹${student.paidAmount?.toLocaleString('en-IN')}
${pending > 0 ? `⏳ *Balance:* ₹${pending.toLocaleString('en-IN')}` : ''}

🏷️ *Status:* ${status}
━━━━━━━━━━━━━━━━━━
📍 Vanasthalipuram, Hyderabad
📞 +91 7842239090
🌐 www.craftsoft.co.in`;

        const phoneNumber = student.phone ? `91${student.phone}` : '';
        const whatsappUrl = phoneNumber
            ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');

    } catch (error) {
        console.error('Error sharing via WhatsApp:', error);
        showToast('Error sharing receipt', 'error');
    }
}

function shareReceiptWhatsApp() {
    if (currentStudentData) {
        shareViaWhatsApp(currentStudentData.id);
    }
}

// Format Currency
function formatCurrency(amount) {
    return '₹' + (amount || 0).toLocaleString('en-IN');
}

// Modal Functions
function openAddStudentModal() {
    document.getElementById('addStudentForm').reset();
    document.getElementById('addStudentModal').classList.add('active');
}

function openPaymentModal(studentId, studentName, pending) {
    document.getElementById('paymentStudentId').value = studentId;
    document.getElementById('paymentStudentName').value = studentName;
    document.getElementById('pendingDisplayAmount').value = formatCurrency(pending);
    document.getElementById('paymentAmount').max = pending;
    document.getElementById('paymentAmount').value = '';
    document.getElementById('addPaymentModal').classList.add('active');
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

// Add Student Form Handler
document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('studentName').value.trim();
    const phone = document.getElementById('studentPhone').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const course = document.getElementById('studentCourse').value;
    const totalFee = parseInt(document.getElementById('totalFee').value) || 0;
    const initialPayment = parseInt(document.getElementById('initialPayment').value) || 0;
    const paymentMode = document.getElementById('paymentMode').value;
    const demoDate = document.getElementById('studentDemoDate').value;
    const notes = document.getElementById('studentNotes').value.trim();

    try {
        const receiptNum = 'CS-' + Date.now().toString().slice(-8);

        const studentRef = await db.collection('students').add({
            name,
            phone,
            email,
            course,
            totalFee,
            paidAmount: initialPayment,
            demoDate: demoDate || null,
            notes,
            receiptPrefix: receiptNum,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (initialPayment > 0) {
            await db.collection('payments').add({
                studentId: studentRef.id,
                studentName: name,
                amount: initialPayment,
                mode: paymentMode,
                notes: 'Initial payment at admission',
                receiptNumber: receiptNum + '-001',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        showToast('Student added successfully!', 'success');
        closeModal('addStudentModal');
        loadStudents();

    } catch (error) {
        console.error('Error adding student:', error);
        showToast('Error adding student', 'error');
    }
});

// Add Payment Form Handler
document.getElementById('addPaymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const studentId = document.getElementById('paymentStudentId').value;
    const studentName = document.getElementById('paymentStudentName').value;
    const amount = parseInt(document.getElementById('paymentAmount').value) || 0;
    const mode = document.getElementById('paymentModeRecord').value;
    const notes = document.getElementById('paymentNotes').value.trim();

    if (amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    try {
        const studentDoc = await db.collection('students').doc(studentId).get();
        const student = studentDoc.data();

        const paymentsSnapshot = await db.collection('payments')
            .where('studentId', '==', studentId)
            .get();
        const paymentCount = paymentsSnapshot.size + 1;
        const receiptNumber = (student.receiptPrefix || 'CS-' + Date.now().toString().slice(-8)) + '-' + paymentCount.toString().padStart(3, '0');

        await db.collection('payments').add({
            studentId,
            studentName,
            amount,
            mode,
            notes,
            receiptNumber,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('students').doc(studentId).update({
            paidAmount: firebase.firestore.FieldValue.increment(amount),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Payment recorded!', 'success');
        closeModal('addPaymentModal');
        loadStudents();

    } catch (error) {
        console.error('Error recording payment:', error);
        showToast('Error recording payment', 'error');
    }
});

// Toast Notification
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

// Make functions global
window.openAddStudentModal = openAddStudentModal;
window.openPaymentModal = openPaymentModal;
window.closeModal = closeModal;
window.openPaymentHistory = openPaymentHistory;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareReceiptWhatsApp = shareReceiptWhatsApp;
window.deleteStudent = deleteStudent;
window.openEditStudentModal = openEditStudentModal;

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadStudents, 500);
});

// Phone input validation
document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
    });
});
