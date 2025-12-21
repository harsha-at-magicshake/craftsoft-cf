// Dashboard Logic for Craft Soft Admin
// Enhanced with WhatsApp, Payment Links, History, and Mobile features

// Current student for payment history
let currentStudentData = null;

// Set current date
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

// Load Dashboard Data
async function loadDashboardData() {
    try {
        const studentsSnapshot = await db.collection('students').orderBy('createdAt', 'desc').get();

        let totalStudents = 0;
        let totalRevenue = 0;
        let totalPending = 0;
        let fullyPaid = 0;

        const students = [];

        studentsSnapshot.forEach(doc => {
            const student = { id: doc.id, ...doc.data() };
            students.push(student);

            totalStudents++;
            totalRevenue += student.paidAmount || 0;
            const pending = (student.totalFee || 0) - (student.paidAmount || 0);
            totalPending += pending;

            if (pending <= 0) {
                fullyPaid++;
            }
        });

        // Update stats with animation
        animateValue('totalStudents', totalStudents);
        document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
        document.getElementById('pendingAmount').textContent = formatCurrency(totalPending);
        animateValue('paidStudents', fullyPaid);

        // Update recent students table (show last 5)
        updateRecentStudentsTable(students.slice(0, 5));

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading data', 'error');
    }
}

// Animate number values
function animateValue(elementId, value) {
    const element = document.getElementById(elementId);
    element.textContent = value;
}

// Update Recent Students Table (View-only, no actions)
function updateRecentStudentsTable(students) {
    const tbody = document.getElementById('recentStudentsTable');

    if (students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <span class="material-icons">group</span>
                        <h3>No students yet</h3>
                        <p>Add students from the Students page</p>
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

        return `
            <tr>
                <td>
                    <strong>${student.name}</strong>
                    <br><small style="color: #64748b;">${student.phone || '-'}</small>
                </td>
                <td>${student.course}</td>
                <td>${formatCurrency(student.totalFee)}</td>
                <td style="color: #10B981; font-weight: 600;">${formatCurrency(student.paidAmount)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
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

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

// Escape key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// ============================================
// PAYMENT HISTORY - New Feature
// ============================================
async function openPaymentHistory(studentId) {
    try {
        // Get student data
        const studentDoc = await db.collection('students').doc(studentId).get();
        const student = { id: studentDoc.id, ...studentDoc.data() };
        currentStudentData = student;

        const pending = student.totalFee - student.paidAmount;

        // Update student info header
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
            <div style="display: flex; gap: 16px; margin-top: 16px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 100px; background: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center;">
                    <p style="font-size: 0.75rem; color: #64748b;">Total Fee</p>
                    <p style="font-weight: 600;">${formatCurrency(student.totalFee)}</p>
                </div>
                <div style="flex: 1; min-width: 100px; background: #ECFDF5; padding: 12px; border-radius: 8px; text-align: center;">
                    <p style="font-size: 0.75rem; color: #64748b;">Paid</p>
                    <p style="font-weight: 600; color: #10B981;">${formatCurrency(student.paidAmount)}</p>
                </div>
            </div>
        `;

        // Get payment history
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
                    <p>Add a payment to see history</p>
                </div>
            `;
        } else {
            let timelineHTML = '';
            paymentsSnapshot.forEach(doc => {
                const payment = doc.data();
                const date = payment.createdAt?.toDate?.()
                    ? payment.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Unknown';
                const time = payment.createdAt?.toDate?.()
                    ? payment.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : '';

                const iconClass = payment.mode === 'cash' ? 'cash' : 'online';
                const modeIcon = payment.mode === 'cash' ? 'payments' : 'credit_card';

                timelineHTML += `
                    <li class="payment-timeline-item">
                        <div class="timeline-icon ${iconClass}">
                            <span class="material-icons">${modeIcon}</span>
                        </div>
                        <div class="timeline-content">
                            <div class="amount">${formatCurrency(payment.amount)}</div>
                            <div class="meta">
                                <span class="material-icons" style="font-size: 14px; vertical-align: middle;">calendar_today</span> ${date} at ${time}
                                • ${payment.mode?.toUpperCase() || 'N/A'}
                            </div>
                            ${payment.notes ? `<div style="font-size: 0.8rem; color: #475569; margin-top: 8px;">${payment.notes}</div>` : ''}
                            <div class="receipt-num">
                                <span class="material-icons" style="font-size: 12px; vertical-align: middle;">confirmation_number</span> ${payment.receiptNumber || '-'}
                            </div>
                        </div>
                    </li>
                `;
            });
            timeline.innerHTML = timelineHTML;
        }

        document.getElementById('paymentHistoryModal').classList.add('active');

    } catch (error) {
        console.error('Error loading payment history:', error);
        showToast('Error loading payment history', 'error');
    }
}

// ============================================
// WHATSAPP RECEIPT - New Feature
// ============================================
async function shareViaWhatsApp(studentId) {
    try {
        const studentDoc = await db.collection('students').doc(studentId).get();
        const student = studentDoc.data();

        const pending = student.totalFee - student.paidAmount;
        const status = pending <= 0 ? '✅ FULLY PAID' : '⏳ PARTIAL PAYMENT';

        // Get last payment
        const paymentsSnapshot = await db.collection('payments')
            .where('studentId', '==', studentId)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        let lastPaymentInfo = '';
        paymentsSnapshot.forEach(doc => {
            const p = doc.data();
            lastPaymentInfo = `\n💳 Last Payment: ₹${p.amount?.toLocaleString('en-IN')} (${p.mode})`;
        });

        const message = `🎓 *Abhi's Craft Soft*
━━━━━━━━━━━━━━━━━━
📋 *Payment Receipt*
━━━━━━━━━━━━━━━━━━

👤 *Student:* ${student.name}
📚 *Course:* ${student.course}
📱 *Phone:* ${student.phone || '-'}

💰 *Total Fee:* ₹${student.totalFee?.toLocaleString('en-IN')}
✅ *Paid:* ₹${student.paidAmount?.toLocaleString('en-IN')}
${pending > 0 ? `⏳ *Balance:* ₹${pending.toLocaleString('en-IN')}` : ''}
${lastPaymentInfo}

🏷️ *Status:* ${status}

━━━━━━━━━━━━━━━━━━
📍 Vanasthalipuram, Hyderabad
📞 +91 7842239090
🌐 www.craftsoft.co.in

Thank you for choosing Craft Soft! 🙏`;

        const phoneNumber = student.phone ? `91${student.phone}` : '';
        const whatsappUrl = phoneNumber
            ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
        showSnackbar('Opening WhatsApp...');

    } catch (error) {
        console.error('Error sharing via WhatsApp:', error);
        showToast('Error sharing receipt', 'error');
    }
}

// Share current student receipt via WhatsApp (from modal)
function shareReceiptWhatsApp() {
    if (currentStudentData) {
        shareViaWhatsApp(currentStudentData.id);
    }
}

// ============================================
// RAZORPAY PAYMENT LINK - New Feature
// ============================================
function generatePaymentLink() {
    const studentName = document.getElementById('paymentStudentName').value;
    const amount = document.getElementById('paymentAmount').value || document.getElementById('pendingDisplayAmount').value.replace(/[₹,]/g, '');
    const studentId = document.getElementById('paymentStudentId').value;

    // For now, create a pre-filled Razorpay payment link message
    // In production, you'd use Razorpay API with server-side integration

    const message = `💳 *Payment Link Request*

Hi ${studentName}!

Please use the following details to make your payment:

💰 Amount: ₹${parseInt(amount).toLocaleString('en-IN')}
🏦 UPI: craftsoft@upi
📱 Phone Pay / Google Pay: 7842239090

Or scan the QR code at our center.

After payment, please share the screenshot.

━━━━━━━━━━━━━━━━━━
*Abhi's Craft Soft*
📞 +91 7842239090`;

    // Get student phone from the form or storage
    db.collection('students').doc(studentId).get().then(doc => {
        const student = doc.data();
        const phoneNumber = student.phone ? `91${student.phone}` : '';
        const whatsappUrl = phoneNumber
            ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
        showSnackbar('Payment link sent via WhatsApp!');
    });
}

// ============================================
// FORM HANDLERS
// ============================================

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
    const notes = document.getElementById('studentNotes').value.trim();

    try {
        // Generate receipt number
        const receiptNum = 'CS-' + Date.now().toString().slice(-8);

        // Create student document
        const studentRef = await db.collection('students').add({
            name,
            phone,
            email,
            course,
            totalFee,
            paidAmount: initialPayment,
            notes,
            receiptPrefix: receiptNum,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // If initial payment, create payment record
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
        loadDashboardData();

        // Offer to share via WhatsApp
        if (phone) {
            setTimeout(() => {
                if (confirm('Send admission confirmation via WhatsApp?')) {
                    shareViaWhatsApp(studentRef.id);
                }
            }, 500);
        }

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
        // Get student data
        const studentDoc = await db.collection('students').doc(studentId).get();
        const student = studentDoc.data();

        // Count existing payments for this student to generate receipt number
        const paymentsSnapshot = await db.collection('payments')
            .where('studentId', '==', studentId)
            .get();
        const paymentCount = paymentsSnapshot.size + 1;
        const receiptNumber = (student.receiptPrefix || 'CS-' + Date.now().toString().slice(-8)) + '-' + paymentCount.toString().padStart(3, '0');

        // Create payment record
        await db.collection('payments').add({
            studentId,
            studentName,
            amount,
            mode,
            notes,
            receiptNumber,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update student paid amount
        await db.collection('students').doc(studentId).update({
            paidAmount: firebase.firestore.FieldValue.increment(amount),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Payment recorded successfully!', 'success');
        closeModal('addPaymentModal');
        loadDashboardData();

        // Offer to share receipt via WhatsApp
        setTimeout(() => {
            if (confirm('Send payment receipt via WhatsApp?')) {
                shareViaWhatsApp(studentId);
            }
        }, 500);

    } catch (error) {
        console.error('Error recording payment:', error);
        showToast('Error recording payment', 'error');
    }
});

// ============================================
// NOTIFICATIONS
// ============================================

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

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Snackbar Notification
function showSnackbar(message) {
    const snackbar = document.getElementById('snackbar');
    snackbar.textContent = message;
    snackbar.classList.add('show');

    setTimeout(() => {
        snackbar.classList.remove('show');
    }, 3000);
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================
window.openAddStudentModal = openAddStudentModal;
window.openPaymentModal = openPaymentModal;
window.closeModal = closeModal;
window.openPaymentHistory = openPaymentHistory;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareReceiptWhatsApp = shareReceiptWhatsApp;
window.generatePaymentLink = generatePaymentLink;

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to be ready
    setTimeout(loadDashboardData, 500);
});

// Phone input validation
document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
    });
});
