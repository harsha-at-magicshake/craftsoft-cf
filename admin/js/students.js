// Students Page Logic - Enhanced with Edit, Demo Date, and Mobile Cards

let allStudents = [];
let currentStudentData = null;

// Load Students
async function loadStudents() {
    try {
        console.log('Loading students...');
        // Query without orderBy to avoid index requirement
        const snapshot = await db.collection('students').get();

        allStudents = [];
        snapshot.forEach(doc => {
            allStudents.push({ id: doc.id, ...doc.data() });
        });

        // Sort by createdAt in JS (newest first)
        allStudents.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });

        console.log('Students loaded:', allStudents.length);
        renderStudents(allStudents);

    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Error loading students', 'error');
    }
}

// Render Students Table + Mobile Cards
function renderStudents(students) {
    const tbody = document.getElementById('studentsTable');
    const mobileCards = document.getElementById('studentsMobileCards');

    if (students.length === 0) {
        const emptyHTML = `
            <div class="empty-state" style="padding: 40px; text-align: center;">
                <span class="material-icons" style="font-size: 48px; color: #94a3b8;">group</span>
                <h3 style="margin-top: 12px;">No students found</h3>
                <p style="color: #64748b;">Click "+" to add a student</p>
            </div>
        `;
        tbody.innerHTML = `<tr><td colspan="6">${emptyHTML}</td></tr>`;
        mobileCards.innerHTML = emptyHTML;
        return;
    }

    // Desktop Table
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
                        <button class="btn btn-outline btn-sm btn-icon" onclick="deleteStudent('${student.id}')" title="Delete" style="color: #EF4444;">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Mobile Cards
    mobileCards.innerHTML = students.map(student => {
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
            <div class="mobile-card">
                <div class="mobile-card-header">
                    <div>
                        <div class="mobile-card-name">${student.name}</div>
                        <div class="mobile-card-sub">${student.phone || '-'}</div>
                    </div>
                    <div class="mobile-card-badge">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="mobile-card-row">
                    <span>Course</span>
                    <span>${student.course}</span>
                </div>
                <div class="mobile-card-row">
                    <span>Total Fee</span>
                    <span>${formatCurrency(student.totalFee)}</span>
                </div>
                <div class="mobile-card-row">
                    <span>Paid</span>
                    <span style="color: #10B981;">${formatCurrency(student.paidAmount)}</span>
                </div>
                <div class="mobile-card-row">
                    <span>Balance</span>
                    <span style="color: ${pending > 0 ? '#EF4444' : '#10B981'};">${formatCurrency(pending)}</span>
                </div>
                <div class="mobile-card-actions">
                    <button class="btn btn-outline btn-sm btn-icon" onclick="openEditStudentModal('${student.id}')" title="Edit">
                        <span class="material-icons">edit</span>
                    </button>
                    ${pending > 0 ? `<button class="btn btn-success btn-sm btn-icon" onclick="openPaymentModal('${student.id}', '${student.name}', ${pending})" title="Pay">
                        <span class="material-icons">add</span>
                    </button>` : ''}
                    <button class="btn btn-outline btn-sm btn-icon" onclick="openPaymentHistory('${student.id}')" title="History">
                        <span class="material-icons">receipt_long</span>
                    </button>
                    <button class="btn btn-outline btn-sm btn-icon" onclick="deleteStudent('${student.id}')" title="Delete" style="color: #EF4444;">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
            </div>
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

        // Query without orderBy to avoid index requirement, sort in JS
        const paymentsSnapshot = await db.collection('payments')
            .where('studentId', '==', studentId)
            .get();

        const timeline = document.getElementById('paymentTimeline');

        if (paymentsSnapshot.empty) {
            timeline.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px;">
                    <span class="material-icons">receipt</span>
                    <h3>No payments recorded</h3>
                </div>
            `;
            currentStudentData.payments = [];
        } else {
            // Get payments and sort by date (newest first)
            let payments = [];
            paymentsSnapshot.forEach(doc => {
                payments.push({ id: doc.id, ...doc.data() });
            });

            // Sort by createdAt descending
            payments.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            });

            currentStudentData.payments = payments;

            let timelineHTML = '';
            payments.forEach(payment => {
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

// ============================================
// PDF RECEIPT GENERATION
// ============================================
function downloadReceiptPDF() {
    if (!currentStudentData) {
        showToast('No student data available', 'error');
        return;
    }

    const student = currentStudentData;
    const pending = student.totalFee - student.paidAmount;
    const status = pending <= 0 ? 'FULLY PAID' : 'PARTIAL';

    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Colors
    const primaryColor = [40, 150, 205];
    const textColor = [15, 23, 42];
    const grayColor = [100, 116, 139];
    const successColor = [16, 185, 129];

    // Header background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 45, 'F');

    // Company Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("Abhi's Craft Soft", 105, 18, { align: 'center' });

    // Tagline
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Professional IT Training Institute', 105, 26, { align: 'center' });

    // Contact
    doc.setFontSize(9);
    doc.text('Vanasthalipuram, Hyderabad | +91 7842239090 | www.craftsoft.co.in', 105, 35, { align: 'center' });

    // Receipt Title
    doc.setTextColor(...textColor);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIPT', 105, 60, { align: 'center' });

    // Divider
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, 65, 190, 65);

    // Student Details Section
    let yPos = 80;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grayColor);
    doc.text('STUDENT DETAILS', 20, yPos);

    yPos += 10;
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Name:', 20, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(student.name || '-', 60, yPos);

    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.text('Phone:', 20, yPos);
    doc.text(student.phone || '-', 60, yPos);

    yPos += 8;
    doc.text('Course:', 20, yPos);
    doc.text(student.course || '-', 60, yPos);

    // Payment Summary Section
    yPos += 20;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grayColor);
    doc.text('PAYMENT SUMMARY', 20, yPos);

    yPos += 10;
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');

    // Total Fee
    doc.text('Total Fee:', 20, yPos);
    doc.text(formatCurrency(student.totalFee), 120, yPos);

    yPos += 8;
    // Amount Paid
    doc.text('Amount Paid:', 20, yPos);
    doc.setTextColor(...successColor);
    doc.text(formatCurrency(student.paidAmount), 120, yPos);

    yPos += 8;
    // Balance
    doc.setTextColor(...textColor);
    doc.text('Balance:', 20, yPos);
    doc.setTextColor(pending > 0 ? 239 : 16, pending > 0 ? 68 : 185, pending > 0 ? 68 : 129);
    doc.text(formatCurrency(pending), 120, yPos);

    yPos += 8;
    doc.setTextColor(...textColor);
    doc.text('Status:', 20, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(pending <= 0 ? 16 : 239, pending <= 0 ? 185 : 68, pending <= 0 ? 129 : 68);
    doc.text(status, 120, yPos);

    // Payment History
    if (student.payments && student.payments.length > 0) {
        yPos += 20;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...grayColor);
        doc.text('PAYMENT HISTORY', 20, yPos);

        yPos += 8;
        doc.setFontSize(9);
        doc.setTextColor(...textColor);
        doc.setFont('helvetica', 'bold');
        doc.text('Date', 20, yPos);
        doc.text('Amount', 70, yPos);
        doc.text('Mode', 110, yPos);
        doc.text('Receipt #', 140, yPos);

        doc.setFont('helvetica', 'normal');
        student.payments.forEach(payment => {
            yPos += 7;
            const date = payment.createdAt?.toDate?.()
                ? payment.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : '-';
            doc.text(date, 20, yPos);
            doc.text(formatCurrency(payment.amount), 70, yPos);
            doc.text((payment.mode || '-').toUpperCase(), 110, yPos);
            doc.text(payment.receiptNumber || '-', 140, yPos);
        });
    }

    // Footer
    yPos = 270;
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text('This is a computer-generated receipt.', 105, yPos, { align: 'center' });
    doc.text('Generated on: ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), 105, yPos + 6, { align: 'center' });

    // Save PDF
    const fileName = `Receipt_${student.name?.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    showToast('PDF downloaded!', 'success');
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
    document.getElementById('paymentNotes').value = '';
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('paymentDate').value = today;
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
    const paymentDateInput = document.getElementById('paymentDate').value;

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

        // Use selected date or current timestamp
        const paymentDate = paymentDateInput
            ? firebase.firestore.Timestamp.fromDate(new Date(paymentDateInput + 'T12:00:00'))
            : firebase.firestore.FieldValue.serverTimestamp();

        await db.collection('payments').add({
            studentId,
            studentName,
            amount,
            mode,
            notes,
            receiptNumber,
            paymentDate: paymentDateInput || null,
            createdAt: paymentDate
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
window.downloadReceiptPDF = downloadReceiptPDF;

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
