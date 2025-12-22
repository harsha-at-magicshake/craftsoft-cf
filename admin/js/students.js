// Students Page Logic - Enhanced with Edit, Demo Date, and Mobile Cards

let allStudents = [];
let filteredStudents = [];
let allTutors = [];
let currentStudentData = null;

// Pagination
const ITEMS_PER_PAGE = 10;
let currentPage = 1;

// Subject codes for receipt numbers
const subjectCodes = {
    'Full Stack Development': '01',
    'UI/UX Design': '02',
    'Graphic Design': '03',
    'DevOps Engineering': '04',
    'AWS Cloud': '05',
    'Python Full Stack': '06',
    'Java Full Stack': '07',
    'Data Analytics': '08',
    'Salesforce': '09',
    'DSA Mastery': '10',
    'Soft Skills': '11',
    'Spoken English': '12',
    'Resume & Interview': '13',
    'Other': '99'
};

// Load Tutors for dropdown
async function loadTutors() {
    try {
        const snapshot = await db.collection('tutors').where('status', '==', 'active').get();
        allTutors = [];
        snapshot.forEach(doc => {
            allTutors.push({ id: doc.id, ...doc.data() });
        });

        // Populate tutor dropdown
        const tutorSelect = document.getElementById('tutorName');
        if (tutorSelect) {
            tutorSelect.innerHTML = '<option value="">Select Tutor (Optional)</option>';
            allTutors.forEach(tutor => {
                tutorSelect.innerHTML += `<option value="${tutor.name}">${tutor.name} - ${tutor.subject}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading tutors:', error);
    }
}

// Load Students
async function loadStudents() {
    try {
        console.log('Loading students...');
        if (typeof showTableSkeleton === 'function') showTableSkeleton('studentsTable');
        if (typeof showCardSkeleton === 'function') showCardSkeleton('studentsMobileCards');

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
        filteredStudents = allStudents;
        currentPage = 1;
        renderStudentsPage();

    } catch (error) {
        console.error('Error loading students:', error);
        showToast(`Error: ${error.message || 'Unknown error loading students'}`, 'error');
    }
}

// Render current page of students
function renderStudentsPage() {
    const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageStudents = filteredStudents.slice(startIndex, endIndex);

    renderStudents(pageStudents);
    renderPagination(totalPages);
}

// Render pagination controls
function renderPagination(totalPages) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <span class="material-icons">chevron_left</span>
        </button>
    `;

    // Show page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span class="pagination-info">...</span>`;
        }
    }

    html += `
        <button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <span class="material-icons">chevron_right</span>
        </button>
    `;

    container.innerHTML = html;
}

// Navigate to specific page
function goToPage(page) {
    const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderStudentsPage();
    // Scroll to top of table
    document.getElementById('studentsTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Render Students Table + Mobile Cards
function renderStudents(students) {
    const tbody = document.getElementById('studentsTable');
    const mobileCards = document.getElementById('studentsMobileCards');

    if (students.length === 0) {
        const emptyHTML = `
            <div class="empty-state" style="padding: 40px; text-align: center;">
                <span class="material-icons" style="font-size: 40px; color: #cbd5e1;">group</span>
                <h3 style="margin-top: 12px; font-size: 1rem; font-weight: 600;">No students found</h3>
                <p style="color: #94a3b8; font-size: 0.85rem;">Get started by adding your first student</p>
                <div class="empty-state-action">
                    <button class="btn" onclick="openAddStudentModal()">
                        <span class="material-icons">add</span> New Student
                    </button>
                </div>
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
            demoInfo = formatDate(student.demoDate);
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

    filteredStudents = filtered;
    currentPage = 1; // Reset to first page on filter
    renderStudentsPage();
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

        // Batch Info
        document.getElementById('editBatchName').value = student.batchName || '';
        document.getElementById('editBatchTiming').value = student.batchTiming || '';
        document.getElementById('editBatchMode').value = student.batchMode || 'offline';
        document.getElementById('editStudentStatus').value = student.status || 'active';

        // Populate edit tutor dropdown
        const tutorSelect = document.getElementById('editTutorName');
        if (tutorSelect && allTutors.length > 0) {
            tutorSelect.innerHTML = '<option value="">Select Tutor</option>';
            allTutors.forEach(tutor => {
                const selected = tutor.name === (student.tutorName || '') ? 'selected' : '';
                tutorSelect.innerHTML += `<option value="${tutor.name}" ${selected}>${tutor.name} - ${tutor.subject}</option>`;
            });
        }

        // Joining Date
        if (student.joiningDate) {
            document.getElementById('editJoiningDate').value = student.joiningDate;
        } else if (student.createdAt?.toDate) {
            document.getElementById('editJoiningDate').value = student.createdAt.toDate().toISOString().split('T')[0];
        } else {
            document.getElementById('editJoiningDate').value = '';
        }

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
    const phone = formatPhoneNumber(document.getElementById('editStudentPhone').value.trim());
    const email = document.getElementById('editStudentEmail').value.trim();
    const course = document.getElementById('editStudentCourse').value;
    const totalFee = parseInt(document.getElementById('editTotalFee').value) || 0;
    const demoDate = document.getElementById('editDemoDate').value;
    const notes = document.getElementById('editStudentNotes').value.trim();

    const batchName = document.getElementById('editBatchName').value.trim();
    const batchTiming = document.getElementById('editBatchTiming').value;
    const batchMode = document.getElementById('editBatchMode').value;
    const tutorName = document.getElementById('editTutorName').value;
    const status = document.getElementById('editStudentStatus').value;
    const joiningDate = document.getElementById('editJoiningDate').value;

    try {
        await db.collection('students').doc(studentId).update({
            name,
            phone,
            email,
            course,
            totalFee,
            demoDate: demoDate || null,
            notes,
            // Batch & Status updates
            batchName,
            batchTiming,
            batchMode,
            tutorName,
            status,
            joiningDate: joiningDate || null,
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
    const confirmed = await showConfirm({
        title: 'Delete Student?',
        message: 'Are you sure you want to delete this student? This will also delete all their payment records.',
        confirmText: 'Yes, Delete',
        type: 'danger'
    });

    if (!confirmed) return;

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
                const date = formatDate(payment.createdAt);

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
                            <div class="receipt-badge">
                                <span>${payment.receiptNumber || '-'}</span>
                                <button class="copy-btn" onclick="copyReceipt('${payment.receiptNumber || ''}')" title="Copy">
                                    <span class="material-icons">content_copy</span>
                                </button>
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
    const payments = student.payments || [];
    const pending = student.totalFee - student.paidAmount;

    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Theming Colors
    const primaryColor = [40, 150, 205]; // #2896cd
    const textColor = [15, 23, 42];
    const grayColor = [100, 116, 139];

    // Header Area
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 45, 'F');

    // Logo Placeholder/Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("ABHI'S CRAFT SOFT", 20, 22);

    // Dynamic Receipt Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`RECEIPT NO: ACS-${student.name?.substring(0, 2).toUpperCase()}-${new Date().getTime().toString().slice(-6)}`, 190, 20, { align: 'right' });
    doc.text(`DATE: ${formatDate(new Date())}`, 190, 28, { align: 'right' });

    // Company Address (Updated)
    doc.setFontSize(9);
    doc.text('Plot No. 163, Vijayasree Colony', 20, 30);
    doc.text('Vanasthalipuram, Hyderabad 500070', 20, 35);
    doc.text('+91 7842239090 | team.craftsoft@gmail.com', 20, 40);

    // Bill To Section
    let yPos = 65;
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 20, yPos);

    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${student.name || '-'}`, 20, yPos);
    yPos += 6;
    doc.text(`Phone: ${student.phone || '-'}`, 20, yPos);

    // Items Table Header
    yPos += 15;
    doc.setFillColor(248, 250, 252); // Light bg for header
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(20, yPos, 170, 10);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM #', 25, yPos + 7);
    doc.text('ITEM DESCRIPTION', 45, yPos + 7);
    doc.text('PAYMENT MODE', 125, yPos + 7);
    doc.text('AMOUNT (₹)', 185, yPos + 7, { align: 'right' });

    // Items Logic (All Payments)
    yPos += 10;
    doc.setFont('helvetica', 'normal');

    if (payments.length === 0) {
        doc.rect(20, yPos, 170, 10);
        doc.text('No payments recorded', 105, yPos + 7, { align: 'center' });
        yPos += 10;
    } else {
        payments.forEach((payment, index) => {
            const rowHeight = 10;
            doc.rect(20, yPos, 170, rowHeight);

            doc.text((index + 1).toString(), 28, yPos + 7, { align: 'center' });
            doc.text(`${student.course} (Paid on ${formatDate(payment.createdAt)})`, 45, yPos + 7);
            doc.text((payment.mode || 'N/A').toUpperCase(), 125, yPos + 7);
            doc.text(payment.amount.toLocaleString('en-IN'), 185, yPos + 7, { align: 'right' });

            yPos += rowHeight;
        });
    }

    // Totals Area
    yPos += 10;
    const totalsX = 130;

    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PAID:', totalsX, yPos);
    doc.text(`₹ ${student.paidAmount.toLocaleString('en-IN')}`, 190, yPos, { align: 'right' });

    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.text('COURSE FEE:', totalsX, yPos);
    doc.text(`₹ ${student.totalFee.toLocaleString('en-IN')}`, 190, yPos, { align: 'right' });

    yPos += 4;
    doc.setDrawColor(148, 163, 184);
    doc.line(totalsX, yPos, 190, yPos);

    yPos += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(pending > 0 ? 239 : 16, pending > 0 ? 68 : 185, pending > 0 ? 68 : 129);
    doc.text('BALANCE DUE:', totalsX, yPos);
    doc.text(`₹ ${pending.toLocaleString('en-IN')}`, 190, yPos, { align: 'right' });

    // Personalized Footer
    yPos = 270;
    doc.setTextColor(...grayColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Thank You for enrolling in Craftsoft', 105, yPos, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a computer-generated receipt. No signature required.', 105, yPos + 7, { align: 'center' });
    doc.text('Generated on: ' + formatDate(new Date()), 105, yPos + 12, { align: 'center' });

    // Save File
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
    document.getElementById('totalFee').value = '';
    // Reset course multi-select
    if (typeof resetCourseSelection === 'function') {
        resetCourseSelection();
    }
    // Reset wizard to step 1
    if (typeof resetWizard === 'function') {
        resetWizard();
    }
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

// Check if a form has any filled inputs (to detect unsaved changes)
function hasFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    const inputs = form.querySelectorAll('input:not([type="hidden"]), textarea, select');
    for (let input of inputs) {
        if (input.type === 'checkbox' || input.type === 'radio') {
            if (input.checked) return true;
        } else if (input.value && input.value.trim() !== '' && !input.readOnly) {
            // Skip readonly fields and fields with default values
            if (input.tagName === 'SELECT' && input.selectedIndex === 0) continue;
            return true;
        }
    }
    return false;
}

// Close modal with unsaved changes check
async function closeModalWithCheck(modalId, formId) {
    if (hasFormData(formId)) {
        const confirmed = await showConfirm({
            title: 'Unsaved Changes',
            message: 'You have unsaved changes. Are you sure you want to close?',
            confirmText: 'Yes, Discard',
            type: 'danger'
        });
        if (!confirmed) return;
    }
    closeModal(modalId);
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', async (e) => {
        if (e.target === overlay) {
            // Check for unsaved data in common forms
            const modalId = overlay.id;
            let formId = null;
            if (modalId === 'addStudentModal') formId = 'addStudentForm';
            else if (modalId === 'addPaymentModal') formId = 'addPaymentForm';
            else if (modalId === 'editStudentModal') formId = 'editStudentForm';

            if (formId && hasFormData(formId)) {
                const confirmed = await showConfirm({
                    title: 'Unsaved Changes',
                    message: 'You have unsaved data. Are you sure you want to close?',
                    confirmText: 'Yes, Discard',
                    type: 'danger'
                });
                if (!confirmed) return;
            }
            overlay.classList.remove('active');
        }
    });
});

// Calculate Final Fee
function calculateFinalFee() {
    const originalFee = parseInt(document.getElementById('originalFee')?.value) || 0;
    const discount = parseInt(document.getElementById('discountAmount')?.value) || 0;
    const finalFee = Math.max(0, originalFee - discount);
    document.getElementById('totalFee').value = finalFee;
}

// Make calculateFinalFee global
window.calculateFinalFee = calculateFinalFee;

// Wizard and Multi-select functions are now in student-wizard.js

// Add Student Form Handler
document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('studentName').value.trim();
    const phone = formatPhoneNumber(document.getElementById('studentPhone').value.trim());
    const email = document.getElementById('studentEmail').value.trim();

    // Get multiple courses
    const selectedCourses = getSelectedCourses();
    const course = selectedCourses.join(', ');

    // Fee with discount
    // ... rest of the logic remains same ...
    const originalFee = parseInt(document.getElementById('originalFee').value) || 0;
    const discountAmount = parseInt(document.getElementById('discountAmount').value) || 0;
    const discountReason = document.getElementById('discountReason').value;
    const totalFee = Math.max(0, originalFee - discountAmount);

    const initialPayment = parseInt(document.getElementById('initialPayment').value) || 0;
    const paymentMode = document.getElementById('paymentMode').value;
    const demoDate = document.getElementById('studentDemoDate').value;
    const notes = document.getElementById('studentNotes').value.trim();

    // New batch fields
    const batchName = document.getElementById('batchName')?.value?.trim() || '';
    const batchTiming = document.getElementById('batchTiming')?.value || '';
    const batchMode = document.getElementById('batchMode')?.value || 'offline';
    const tutorName = document.getElementById('tutorName')?.value?.trim() || '';
    const startDate = document.getElementById('startDate')?.value || null;
    const endDate = document.getElementById('endDate')?.value || null;
    const studentStatus = document.getElementById('studentStatus')?.value || 'active';
    const joiningDate = document.getElementById('studentJoiningDate')?.value || new Date().toISOString().split('T')[0];

    try {
        // ... (duplicate check)
        if (phone) {
            const duplicateCheck = await db.collection('students')
                .where('phone', '==', phone)
                .get();

            if (!duplicateCheck.empty) {
                const existingStudent = duplicateCheck.docs[0].data();
                const confirmed = await showConfirm({
                    title: 'Duplicate Phone Number',
                    message: `A student with this phone (${phone}) already exists:\n\n${existingStudent.name} - ${existingStudent.course}\n\nDo you still want to add this student?`,
                    confirmText: 'Yes, Add Anyway',
                    type: 'primary'
                });

                if (!confirmed) return;
            }
        }

        // Generate initials
        const nameParts = name.trim().split(/\s+/);
        const initials = nameParts.length >= 2
            ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
            : nameParts[0].substring(0, 2).toUpperCase();

        // Get subject code (use first selected course as primary)
        const primarySubject = selectedCourses[0] || 'Other';
        const subjectCode = subjectCodes[primarySubject] || '99';

        // Receipt format: ACS-{Initials}-{SubjectCode} (No Student Sequence)
        const receiptNum = `ACS-${initials}-${subjectCode}`;

        const studentRef = await db.collection('students').add({
            name,
            phone,
            email,
            course,
            // Fee & Discount
            originalFee,
            discountAmount,
            discountReason,
            totalFee,
            paidAmount: initialPayment,
            demoDate: demoDate || null,
            notes,
            // Batch info
            batchName,
            batchTiming,
            batchMode,
            tutorName,
            startDate: startDate || null,
            endDate: endDate || null,
            status: studentStatus,
            // System fields
            joiningDate: joiningDate,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (initialPayment > 0) {
            // Get next Global Receipt ID
            const metaRef = db.collection('settings').doc('metadata');
            let nextReceiptId = 1;

            await db.runTransaction(async (transaction) => {
                const metaDoc = await transaction.get(metaRef);
                if (!metaDoc.exists) {
                    transaction.set(metaRef, { receiptSequence: 1 });
                    nextReceiptId = 1;
                } else {
                    nextReceiptId = (metaDoc.data().receiptSequence || 0) + 1;
                    transaction.update(metaRef, { receiptSequence: nextReceiptId });
                }
            });

            // Receipt format: {GlobalID}-ACS-{Initials}{CourseCode}{PaymentCount(01)}
            const paymentCount = '01'; // Initial payment is always 01
            const receiptNumber = `${nextReceiptId}-ACS-${initials}${subjectCode}${paymentCount}`;

            await db.collection('payments').add({
                studentId: studentRef.id,
                studentName: name,
                amount: initialPayment,
                mode: paymentMode,
                notes: 'Initial payment at admission',
                receiptNumber: receiptNumber,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // If converted from inquiry, delete the inquiry
        const urlParams = new URLSearchParams(window.location.search);
        const fromInquiryId = urlParams.get('fromInquiry');
        if (fromInquiryId) {
            try {
                await db.collection('inquiries').doc(fromInquiryId).delete();
                console.log('Deleted inquiry:', fromInquiryId);
            } catch (err) {
                console.warn('Could not delete inquiry:', err);
            }
            // Clear URL params after handling
            window.history.replaceState({}, '', window.location.pathname);
        }

        showToast('Student added successfully!', 'success');
        closeModal('addStudentModal');
        document.getElementById('addStudentForm').reset();
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
        // 1. Get Initials & Subject Code from student
        const studentDoc = await db.collection('students').doc(studentId).get();
        const studentData = studentDoc.data();

        const nameParts = (studentData.name || 'Anonymous').trim().split(/\s+/);
        const initials = nameParts.length >= 2
            ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
            : nameParts[0].substring(0, 2).toUpperCase();

        const primarySubject = studentData.course || 'Other';
        const subjectCode = subjectCodes[primarySubject] || '99';

        // 2. Count existing payments for this student to determine Payment Count (01, 02...)
        const existingPayments = await db.collection('payments')
            .where('studentId', '==', studentId)
            .get();
        const nextPaymentCount = (existingPayments.size + 1).toString().padStart(2, '0');

        // 3. Get next Global Receipt ID
        const metaRef = db.collection('settings').doc('metadata');
        let nextReceiptId = 1;

        await db.runTransaction(async (transaction) => {
            const metaDoc = await transaction.get(metaRef);
            if (!metaDoc.exists) {
                transaction.set(metaRef, { receiptSequence: 1 });
                nextReceiptId = 1;
            } else {
                nextReceiptId = (metaDoc.data().receiptSequence || 0) + 1;
                transaction.update(metaRef, { receiptSequence: nextReceiptId });
            }
        });

        // Format: {GlobalID}-ACS-{Initials}{CourseCode}{PaymentCount}
        // Example: 1-ACS-KS0501
        const receiptNumber = `${nextReceiptId}-ACS-${initials}${subjectCode}${nextPaymentCount}`;

        // Prepare payment object
        const paymentDate = paymentDateInput ? new Date(paymentDateInput) : firebase.firestore.FieldValue.serverTimestamp();

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

        showToast(`Payment recorded!`, 'success');
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

// Receipt & Data Migration
async function migrateExistingData() {
    try {
        showToast('Starting migration (Global Receipt Sequence)...', 'info');
        console.log('Starting migration...');

        // 1. Fetch Students
        const snapshot = await db.collection('students').get();
        const students = [];
        snapshot.forEach(doc => students.push({ id: doc.id, ...doc.data() }));

        // 2. Fetch ALL Payments
        const paymentsSnapshot = await db.collection('payments').get();
        const payments = [];
        paymentsSnapshot.forEach(doc => payments.push({ id: doc.id, ...doc.data() }));

        // Sort payments by createdAt ASC to assign sequential global IDs based on historical order
        payments.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateA - dateB;
        });

        console.log(`Found ${students.length} students and ${payments.length} payments.`);

        const formatPhoneFn = window.formatPhoneNumber || (p => p);

        // Update Students Phones Only
        let updatedStudents = 0;
        for (let student of students) {
            const newPhone = formatPhoneFn(student.phone);
            if (newPhone !== student.phone) {
                await db.collection('students').doc(student.id).update({ phone: newPhone });
                updatedStudents++;
            }
        }

        // Global Receipt Counter Logic
        let globalReceiptCounter = 0;
        let updatedPayments = 0;
        const batch = db.batch();
        let batchCount = 0;

        // Track payment counts per student
        const studentPaymentCounts = {}; // { studentId: count }

        for (let payment of payments) {
            globalReceiptCounter++;
            const studentId = payment.studentId;
            // Handle case where student might have been deleted but payment exists
            const student = students.find(s => s.id === studentId);

            // Increment student's payment count (1-based)
            if (!studentPaymentCounts[studentId]) studentPaymentCounts[studentId] = 0;
            studentPaymentCounts[studentId]++;

            const paymentCount = studentPaymentCounts[studentId].toString().padStart(2, '0');

            // Generate Receipt String: {GlobalID}-ACS-{Initials}{CourseCode}{PaymentCount}
            // Example: 1-ACS-KS0501
            let receiptNumber = 'UNKNOWN';
            if (student) {
                const nameParts = (student.name || 'Anonymous').trim().split(/\s+/);
                const initials = nameParts.length >= 2
                    ? (nameParts[0][0] + (nameParts[1] ? nameParts[1][0] : '')).toUpperCase()
                    : (nameParts[0].substring(0, 2)).toUpperCase();

                const primarySubject = student.course || 'Other';
                const subjectCode = subjectCodes[primarySubject] || '99';

                receiptNumber = `${globalReceiptCounter}-ACS-${initials}${subjectCode}${paymentCount}`;
            } else {
                receiptNumber = `${globalReceiptCounter}-ACS-UNK99${paymentCount}`;
            }

            if (payment.receiptNumber !== receiptNumber) {
                const paymentRef = db.collection('payments').doc(payment.id);
                batch.update(paymentRef, { receiptNumber: receiptNumber });
                batchCount++;
                updatedPayments++;
            }

            if (batchCount >= 450) {
                await batch.commit();
                if (payments.length > 450) console.warn('Reached batch limit. Run again for remaining.');
                batchCount = 0;
                if (payments.length > 450) break;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        // Save the last receipt sequence to metadata
        await db.collection('settings').doc('metadata').set({
            receiptSequence: globalReceiptCounter
        }, { merge: true });

        const msg = `Done! Updated phones & ${updatedPayments} receipts. Max Receipt ID: ${globalReceiptCounter}`;
        console.log(msg);
        showToast(msg, 'success');

        if (document.getElementById('studentsTable')) {
            loadStudents();
        }

    } catch (error) {
        console.error('Migration error:', error);
        showToast('Migration failed. Check console.', 'error');
    }
}

// Copy Receipt Number to Clipboard
function copyReceipt(receiptNumber) {
    if (!receiptNumber) return;
    navigator.clipboard.writeText(receiptNumber).then(() => {
        showToast('Receipt number copied!', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
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
window.migrateExistingData = migrateExistingData;
window.copyReceipt = copyReceipt;
window.formatPhoneNumber = formatPhoneNumber;
window.goToPage = goToPage;

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    // Only load students if we are on the students page (table exists)
    if (document.getElementById('studentsTable')) {
        setTimeout(loadStudents, 500);
    }

    // Only load tutors if we are on the students page (tutor select exists)
    if (document.getElementById('tutorName') || document.getElementById('studentsTable')) {
        loadTutors();
    }
});

// Phone input validation
document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('input', function () {
        // Allow +, numbers and restrict length to 15 (standard international max)
        this.value = this.value.replace(/[^+0-9]/g, '').slice(0, 15);
    });
});
