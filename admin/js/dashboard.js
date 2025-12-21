// Dashboard Logic for Craft Soft Admin

// Set current date
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

// Update user info
auth.onAuthStateChanged((user) => {
    if (user) {
        const initial = user.email.charAt(0).toUpperCase();
        document.getElementById('userAvatar').textContent = initial;
        document.getElementById('userName').textContent = user.email.split('@')[0];
    }
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

        // Update stats
        document.getElementById('totalStudents').textContent = totalStudents;
        document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
        document.getElementById('pendingAmount').textContent = formatCurrency(totalPending);
        document.getElementById('paidStudents').textContent = fullyPaid;

        // Update recent students table (show last 5)
        updateRecentStudentsTable(students.slice(0, 5));

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading data', 'error');
    }
}

// Update Recent Students Table
function updateRecentStudentsTable(students) {
    const tbody = document.getElementById('recentStudentsTable');

    if (students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No students yet</h3>
                        <p>Click "New Admission" to add your first student</p>
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
                    <br><small style="color: var(--gray-500);">${student.phone || '-'}</small>
                </td>
                <td>${student.course}</td>
                <td>${formatCurrency(student.totalFee)}</td>
                <td>${formatCurrency(student.paidAmount)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    ${pending > 0 ? `<button class="btn btn-success btn-sm" onclick="openPaymentModal('${student.id}', '${student.name}', ${pending})">
                        <i class="fas fa-plus"></i> Pay
                    </button>` : ''}
                    <button class="btn btn-outline btn-sm" onclick="generateReceipt('${student.id}')">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                </td>
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

    } catch (error) {
        console.error('Error recording payment:', error);
        showToast('Error recording payment', 'error');
    }
});

// Generate Receipt (Simple version - opens print dialog)
async function generateReceipt(studentId) {
    try {
        const studentDoc = await db.collection('students').doc(studentId).get();
        const student = studentDoc.data();

        const paymentsSnapshot = await db.collection('payments')
            .where('studentId', '==', studentId)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        let lastPayment = null;
        paymentsSnapshot.forEach(doc => {
            lastPayment = doc.data();
        });

        const pending = student.totalFee - student.paidAmount;

        // Create receipt HTML
        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${student.name}</title>
                <style>
                    body { font-family: 'Inter', Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 2px solid #6C5CE7; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo { font-size: 24px; font-weight: 700; color: #6C5CE7; }
                    .receipt-title { font-size: 18px; color: #666; margin-top: 10px; }
                    .receipt-number { background: #f5f5f5; padding: 10px; border-radius: 5px; margin: 20px 0; text-align: center; }
                    .details { margin: 20px 0; }
                    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                    .row.total { border-top: 2px solid #333; border-bottom: none; font-weight: 700; font-size: 18px; }
                    .label { color: #666; }
                    .value { font-weight: 600; }
                    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
                    .status { padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 600; }
                    .status.paid { background: #d4edda; color: #155724; }
                    .status.partial { background: #fff3cd; color: #856404; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">🎓 Abhi's Craft Soft</div>
                    <div class="receipt-title">Payment Receipt</div>
                </div>
                
                <div class="receipt-number">
                    <strong>Receipt #:</strong> ${lastPayment?.receiptNumber || student.receiptPrefix || 'N/A'}
                </div>
                
                <div class="details">
                    <div class="row">
                        <span class="label">Student Name:</span>
                        <span class="value">${student.name}</span>
                    </div>
                    <div class="row">
                        <span class="label">Phone:</span>
                        <span class="value">${student.phone || '-'}</span>
                    </div>
                    <div class="row">
                        <span class="label">Course:</span>
                        <span class="value">${student.course}</span>
                    </div>
                    <div class="row">
                        <span class="label">Date:</span>
                        <span class="value">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                </div>
                
                <div class="details" style="margin-top: 30px;">
                    <div class="row">
                        <span class="label">Total Fee:</span>
                        <span class="value">₹${student.totalFee?.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="row">
                        <span class="label">Amount Paid:</span>
                        <span class="value" style="color: #00B894;">₹${student.paidAmount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="row">
                        <span class="label">Balance Due:</span>
                        <span class="value" style="color: ${pending > 0 ? '#E17055' : '#00B894'};">₹${pending?.toLocaleString('en-IN')}</span>
                    </div>
                    ${lastPayment ? `
                    <div class="row">
                        <span class="label">Last Payment:</span>
                        <span class="value">₹${lastPayment.amount?.toLocaleString('en-IN')} (${lastPayment.mode})</span>
                    </div>
                    ` : ''}
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <span class="status ${pending <= 0 ? 'paid' : 'partial'}">
                        ${pending <= 0 ? '✓ FULLY PAID' : 'PARTIAL PAYMENT'}
                    </span>
                </div>
                
                <div class="footer">
                    <p>Plot No. 163, Vijayasree Colony, Vanasthalipuram, Hyderabad 500070</p>
                    <p>Phone: +91 7842239090 | Email: team.craftsoft@gmail.com</p>
                    <p style="margin-top: 10px;">Thank you for choosing Craft Soft!</p>
                </div>
            </body>
            </html>
        `;

        // Open in new window and print
        const printWindow = window.open('', '_blank');
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);

    } catch (error) {
        console.error('Error generating receipt:', error);
        showToast('Error generating receipt', 'error');
    }
}

// Toast Notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
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

// Make functions global
window.openAddStudentModal = openAddStudentModal;
window.openPaymentModal = openPaymentModal;
window.closeModal = closeModal;
window.generateReceipt = generateReceipt;

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to be ready
    setTimeout(loadDashboardData, 500);
});
