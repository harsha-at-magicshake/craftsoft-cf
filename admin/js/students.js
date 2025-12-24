// Students Page Logic - Migrated to Supabase
let allStudents = [];
let filteredStudents = [];
let allTutors = [];
let currentStudentData = null;

// Pagination
const ITEMS_PER_PAGE = 10;
let currentPage = 1;

// Helper: Map Supabase DB Row (snake_case) to JS Object (camelCase)
function mapStudentRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        course: row.course,
        originalFee: row.original_fee,
        discountAmount: row.discount_amount,
        discountReason: row.discount_reason,
        totalFee: row.total_fee,
        paidAmount: row.paid_amount,
        demoDate: row.demo_date,
        notes: row.notes,
        batchName: row.batch_name,
        batchTiming: row.batch_timing,
        batchMode: row.batch_mode,
        tutorName: row.tutor_name,
        status: row.status,
        joiningDate: row.joining_date,
        subjectCode: row.subject_code,
        initials: row.initials,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

// Toast Utility
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
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

// Load Tutors
async function loadTutors() {
    try {
        const { data, error } = await supabase.from('tutors').select('*').eq('status', 'active');
        if (error) throw error;
        allTutors = data;
        const tutorSelect = document.getElementById('tutorName');
        if (tutorSelect) {
            tutorSelect.innerHTML = '<option value="">Select Tutor (Optional)</option>';
            allTutors.forEach(tutor => {
                tutorSelect.innerHTML += `<option value="${tutor.name}">${tutor.name} - ${tutor.subject}</option>`;
            });
        }
    } catch (error) { console.error('Error loading tutors:', error); }
}

// Load Students
async function loadStudents() {
    try {
        if (typeof showTableSkeleton === 'function') showTableSkeleton('studentsTable');
        if (typeof showCardSkeleton === 'function') showCardSkeleton('studentsMobileCards');
        const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allStudents = data.map(mapStudentRow);
        filteredStudents = allStudents;
        currentPage = 1;
        renderStudentsPage();
    } catch (error) {
        console.error('Error loading students:', error);
        showToast(`Error loading students`, 'error');
    }
}

// Render Page
function renderStudentsPage() {
    const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageStudents = filteredStudents.slice(startIndex, endIndex);
    renderStudents(pageStudents);
    renderPagination(totalPages);
}

// Render Table & Cards
function renderStudents(students) {
    const tbody = document.getElementById('studentsTable');
    const mobileCards = document.getElementById('studentsMobileCards');
    if (!tbody || !mobileCards) return;

    if (students.length === 0) {
        const emptyHTML = `<div class="empty-state" style="padding: 40px; text-align: center;"><span class="material-icons" style="font-size: 40px; color: #cbd5e1;">group</span><h3>No students</h3></div>`;
        tbody.innerHTML = `<tr><td colspan="6">${emptyHTML}</td></tr>`;
        mobileCards.innerHTML = emptyHTML;
        return;
    }

    tbody.innerHTML = students.map(student => {
        const pending = (student.totalFee || 0) - (student.paidAmount || 0);
        let statusClass = pending <= 0 ? 'paid' : (student.paidAmount > 0 ? 'partial' : 'pending');
        return `
            <tr>
                <td><strong>${student.name}</strong><br><small>${student.phone || '-'}</small></td>
                <td>${student.course}</td>
                <td>${formatCurrency(student.totalFee)}</td>
                <td style="color:#10B981;">${formatCurrency(student.paidAmount)}</td>
                <td><span class="status-badge ${statusClass}">${statusClass.toUpperCase()}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-sm" onclick="openEditStudentModal('${student.id}')"><span class="material-icons">edit</span></button>
                        ${pending > 0 ? `<button class="btn btn-success btn-sm" onclick="openPaymentModal('${student.id}', '${student.name}', ${pending})"><span class="material-icons">add</span></button>` : ''}
                        <button class="btn btn-outline btn-sm" onclick="openPaymentHistory('${student.id}')"><span class="material-icons">receipt_long</span></button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    mobileCards.innerHTML = students.map(student => {
        const pending = (student.totalFee || 0) - (student.paidAmount || 0);
        let statusClass = pending <= 0 ? 'paid' : (student.paidAmount > 0 ? 'partial' : 'pending');
        return `
            <div class="mobile-card">
                <div class="mobile-card-header"><div><div class="mobile-card-name">${student.name}</div></div><span class="status-badge ${statusClass}">${statusClass.toUpperCase()}</span></div>
                <div class="mobile-card-row"><span>Course</span><span>${student.course}</span></div>
                <div class="mobile-card-row"><span>Balance</span><span style="color:${pending > 0 ? '#EF4444' : '#10B981'}">${formatCurrency(pending)}</span></div>
                <div class="mobile-card-actions">
                    <button class="btn btn-outline btn-sm" onclick="openEditStudentModal('${student.id}')"><span class="material-icons">edit</span></button>
                    <button class="btn btn-outline btn-sm" onclick="openPaymentHistory('${student.id}')"><span class="material-icons">receipt_long</span></button>
                </div>
            </div>`;
    }).join('');
}

// Add Student Handler
const addStudentForm = document.getElementById('addStudentForm');
if (addStudentForm) {
    addStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('studentName').value.trim();
        const phone = formatPhoneNumber(document.getElementById('studentPhone').value.trim());
        const selectedCourses = typeof getSelectedCourses === 'function' ? getSelectedCourses() : [];
        const totalFee = parseInt(document.getElementById('totalFee').value) || 0;
        const initialPayment = parseInt(document.getElementById('initialPayment').value) || 0;
        const paymentMode = document.getElementById('paymentMode').value;

        try {
            const nameParts = name.trim().split(/\s+/);
            const initials = nameParts.length >= 2 ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() : nameParts[0].substring(0, 2).toUpperCase();
            const subjectCode = subjectCodes[selectedCourses[0] || 'Other'] || '99';

            const { data: student, error } = await supabase.from('students').insert([{
                name, phone, course: selectedCourses.join(', '), total_fee: totalFee, paid_amount: initialPayment,
                initials, subject_code: subjectCode, created_at: new Date().toISOString()
            }]).select().single();
            if (error) throw error;

            if (initialPayment > 0) {
                const seq = await getNextReceiptSequence();
                await supabase.from('payments').insert([{
                    student_id: student.id, amount: initialPayment, mode: paymentMode,
                    date: new Date().toISOString().split('T')[0],
                    receipt_number: `${seq}-ACS-${initials}${subjectCode}01`,
                    created_at: new Date().toISOString()
                }]);
            }
            showToast('Student added!'); resetWizard(); closeModal('addStudentModal'); loadStudents();
        } catch (e) { showToast('Error adding student', 'error'); }
    });
}

// Add Payment Handler
const addPaymentForm = document.getElementById('addPaymentForm');
if (addPaymentForm) {
    addPaymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentId = document.getElementById('paymentStudentId').value;
        const amount = parseInt(document.getElementById('paymentAmount').value) || 0;
        const mode = document.getElementById('paymentModeRecord').value;
        try {
            const { data: student, error: sErr } = await supabase.from('students').select('*').eq('id', studentId).single();
            const s = mapStudentRow(student);
            const { count } = await supabase.from('payments').select('*', { count: 'exact', head: true }).eq('student_id', studentId);
            const seq = await getNextReceiptSequence();
            const receipt = `${seq}-ACS-${s.initials}${s.subjectCode}${(count + 1).toString().padStart(2, '0')}`;

            await supabase.from('payments').insert([{ student_id: studentId, amount, mode, date: new Date().toISOString().split('T')[0], receipt_number: receipt, created_at: new Date().toISOString() }]);
            await supabase.from('students').update({ paid_amount: (s.paidAmount || 0) + amount }).eq('id', studentId);
            showToast('Payment recorded!'); closeModal('addPaymentModal'); loadStudents();
        } catch (e) { showToast('Error recording payment', 'error'); }
    });
}

// Global Actions
async function openEditStudentModal(id) {
    const { data } = await supabase.from('students').select('*').eq('id', id).single();
    const s = mapStudentRow(data);
    document.getElementById('editStudentId').value = s.id;
    document.getElementById('editStudentName').value = s.name;
    document.getElementById('editStudentModal').classList.add('active');
}

async function openPaymentHistory(id) {
    const { data: s } = await supabase.from('students').select('*').eq('id', id).single();
    const { data: p } = await supabase.from('payments').select('*').eq('student_id', id).order('created_at', { ascending: false });
    const timeline = document.getElementById('paymentTimeline');
    timeline.innerHTML = p.map(pay => `<li>${formatCurrency(pay.amount)} - ${formatDate(pay.created_at)}</li>`).join('');
    document.getElementById('paymentHistoryModal').classList.add('active');
}

async function getNextReceiptSequence() {
    const { data } = await supabase.from('settings').select('metadata').eq('id', 'config').single();
    let seq = (data?.metadata?.receiptSequence || 0) + 1;
    await supabase.from('settings').upsert({ id: 'config', metadata: { receiptSequence: seq } });
    return seq;
}

function formatCurrency(a) { return '₹' + (a || 0).toLocaleString('en-IN'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function goToPage(p) { currentPage = p; renderStudentsPage(); }

window.loadStudents = loadStudents;
window.openEditStudentModal = openEditStudentModal;
window.openPaymentHistory = openPaymentHistory;
window.closeModal = closeModal;
window.goToPage = goToPage;

document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('studentsTable')) { loadStudents(); loadTutors(); } });
