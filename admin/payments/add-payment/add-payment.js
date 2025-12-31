// Add Payment Module
let students = [];
let courses = [];
let selectedStudent = null;
let selectedCourse = null;
let totalFee = 0;
let paidSoFar = 0;
let balanceDue = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../../login.html';
        return;
    }

    // Initialize sidebar with correct page name
    AdminSidebar.init('add-payment', '../../');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Add Payment');
    }

    const currentAdmin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, currentAdmin);

    // Load data
    await loadStudents();

    // Bind events
    bindEvents();
});

// =====================
// Load Students
// =====================
async function loadStudents() {
    try {
        const { data, error } = await window.supabaseClient
            .from('students')
            .select('id, full_name, phone')
            .order('full_name');

        if (error) throw error;
        students = data || [];

        const select = document.getElementById('student-select');
        select.innerHTML = '<option value="">Select a student</option>';

        students.forEach(s => {
            select.innerHTML += `<option value="${s.id}">${s.full_name} (${s.phone || 'No phone'})</option>`;
        });
    } catch (err) {
        console.error('Error loading students:', err);
        window.AdminUtils.Toast.error('Error', 'Failed to load students');
    }
}

// =====================
// Load Student's Courses
// =====================
async function loadStudentCourses(studentId) {
    const courseSelect = document.getElementById('course-select');
    courseSelect.disabled = true;
    courseSelect.innerHTML = '<option value="">Loading...</option>';

    try {
        // Get courses the student is enrolled in
        const { data, error } = await window.supabaseClient
            .from('student_courses')
            .select(`
                id,
                fee,
                course:course_id (
                    id,
                    course_name
                )
            `)
            .eq('student_id', studentId);

        if (error) throw error;
        courses = data || [];

        if (courses.length === 0) {
            courseSelect.innerHTML = '<option value="">No courses found</option>';
            return;
        }

        courseSelect.innerHTML = '<option value="">Select a course</option>';
        courses.forEach(sc => {
            const courseName = sc.course?.course_name || 'Unknown Course';
            courseSelect.innerHTML += `<option value="${sc.id}" data-course-id="${sc.course?.id}">${courseName}</option>`;
        });

        courseSelect.disabled = false;
    } catch (err) {
        console.error('Error loading courses:', err);
        courseSelect.innerHTML = '<option value="">Error loading courses</option>';
    }
}

// =====================
// Calculate Fee Summary
// =====================
async function calculateFeeSummary(studentCourseId) {
    const studentCourse = courses.find(c => c.id === studentCourseId);
    if (!studentCourse) return;

    totalFee = parseFloat(studentCourse.fee) || 0;

    // Get total payments made for this student-course
    try {
        const { data: payments, error } = await window.supabaseClient
            .from('payments')
            .select('amount_paid')
            .eq('student_id', selectedStudent)
            .eq('course_id', studentCourse.course?.id);

        if (error) throw error;

        paidSoFar = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
        balanceDue = totalFee - paidSoFar;

        // Update UI
        document.getElementById('total-fee').textContent = formatCurrency(totalFee);
        document.getElementById('paid-so-far').textContent = formatCurrency(paidSoFar);
        document.getElementById('balance-due').textContent = formatCurrency(balanceDue);
        document.getElementById('fee-summary').style.display = 'block';

        // Set default amount to balance due
        const amountInput = document.getElementById('amount-input');
        amountInput.value = balanceDue > 0 ? balanceDue : '';
        amountInput.max = balanceDue;
        amountInput.disabled = balanceDue <= 0;

        // Enable proceed button if balance due
        updateProceedButton();

    } catch (err) {
        console.error('Error calculating fees:', err);
    }
}

// =====================
// Format Currency
// =====================
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

// =====================
// Update Proceed Button
// =====================
function updateProceedButton() {
    const btn = document.getElementById('proceed-btn');
    const amount = parseFloat(document.getElementById('amount-input').value) || 0;
    const mode = document.querySelector('input[name="payment-mode"]:checked')?.value;

    btn.disabled = !(selectedStudent && selectedCourse && amount > 0 && amount <= balanceDue && mode);
}

// =====================
// Bind Events
// =====================
function bindEvents() {
    // Student selection
    document.getElementById('student-select').addEventListener('change', async (e) => {
        selectedStudent = e.target.value;
        selectedCourse = null;

        // Reset fee summary
        document.getElementById('fee-summary').style.display = 'none';
        document.getElementById('amount-input').value = '';
        document.getElementById('amount-input').disabled = true;

        if (selectedStudent) {
            await loadStudentCourses(selectedStudent);
        } else {
            const courseSelect = document.getElementById('course-select');
            courseSelect.disabled = true;
            courseSelect.innerHTML = '<option value="">Select student first</option>';
        }

        updateProceedButton();
    });

    // Course selection
    document.getElementById('course-select').addEventListener('change', async (e) => {
        const studentCourseId = e.target.value;
        const option = e.target.selectedOptions[0];
        selectedCourse = option?.dataset.courseId || null;

        if (studentCourseId) {
            await calculateFeeSummary(studentCourseId);
        } else {
            document.getElementById('fee-summary').style.display = 'none';
            document.getElementById('amount-input').value = '';
            document.getElementById('amount-input').disabled = true;
        }

        updateProceedButton();
    });

    // Amount input
    document.getElementById('amount-input').addEventListener('input', updateProceedButton);

    // Payment mode change
    document.querySelectorAll('input[name="payment-mode"]').forEach(radio => {
        radio.addEventListener('change', updateProceedButton);
    });

    // Form submission
    document.getElementById('payment-form').addEventListener('submit', handlePayment);
}

// =====================
// Handle Payment
// =====================
async function handlePayment(e) {
    e.preventDefault();

    const { Toast, Modal } = window.AdminUtils;
    const amount = parseFloat(document.getElementById('amount-input').value);
    const mode = document.querySelector('input[name="payment-mode"]:checked').value;
    const btn = document.getElementById('proceed-btn');

    if (amount > balanceDue) {
        Toast.error('Invalid', 'Amount cannot exceed balance due');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    try {
        if (mode === 'CASH') {
            await processCashPayment(amount);
        } else {
            await processOnlinePayment(amount);
        }
    } catch (err) {
        console.error('Payment error:', err);
        Toast.error('Error', err.message || 'Payment failed');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Proceed';
    }
}

// =====================
// Process Cash Payment
// =====================
async function processCashPayment(amount) {
    const { Toast } = window.AdminUtils;

    // Generate reference ID: PAY-CASH-YYYYMMDD-XXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of cash payments today for sequence
    const { count } = await window.supabaseClient
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .like('reference_id', `PAY-CASH-${dateStr}%`);

    const seq = String((count || 0) + 1).padStart(3, '0');
    const referenceId = `PAY-CASH-${dateStr}-${seq}`;

    // Insert payment
    const { data: payment, error: paymentError } = await window.supabaseClient
        .from('payments')
        .insert({
            student_id: selectedStudent,
            course_id: selectedCourse,
            amount_paid: amount,
            payment_mode: 'CASH',
            reference_id: referenceId,
            status: 'SUCCESS'
        })
        .select()
        .single();

    if (paymentError) throw paymentError;

    // Auto-create receipt
    await createReceipt(payment);

    Toast.success('Success', 'Payment recorded successfully');

    // Redirect to receipts
    setTimeout(() => {
        window.location.href = '../receipts/';
    }, 1500);
}

// =====================
// Process Online Payment (Razorpay)
// =====================
async function processOnlinePayment(amount) {
    const { Toast } = window.AdminUtils;

    // TODO: Implement Razorpay integration
    // For now, show a placeholder
    Toast.info('Coming Soon', 'Online payment integration is in progress');

    const btn = document.getElementById('proceed-btn');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Proceed';
}

// =====================
// Create Receipt (Auto after payment success)
// =====================
async function createReceipt(payment) {
    try {
        // Get student and course info for receipt ID
        const { data: student } = await window.supabaseClient
            .from('students')
            .select('full_name')
            .eq('id', payment.student_id)
            .single();

        const { data: course } = await window.supabaseClient
            .from('courses')
            .select('course_name')
            .eq('id', payment.course_id)
            .single();

        // Generate receipt ID using the database function
        const { data: receiptIdData } = await window.supabaseClient
            .rpc('generate_receipt_id', {
                p_student_name: student?.full_name || 'Unknown',
                p_course_name: course?.course_name || 'Unknown'
            });

        const receiptId = receiptIdData || `${Date.now()}-ACS`;

        // Calculate new balance
        const newBalance = balanceDue - payment.amount_paid;

        // Insert receipt
        const { error } = await window.supabaseClient
            .from('receipts')
            .insert({
                receipt_id: receiptId,
                payment_id: payment.id,
                student_id: payment.student_id,
                course_id: payment.course_id,
                amount_paid: payment.amount_paid,
                payment_mode: payment.payment_mode,
                reference_id: payment.reference_id,
                balance_due: newBalance > 0 ? newBalance : 0
            });

        if (error) throw error;

    } catch (err) {
        console.error('Error creating receipt:', err);
        // Don't throw - payment is still successful even if receipt creation fails
    }
}
