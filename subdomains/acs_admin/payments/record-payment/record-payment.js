// Record Payment Module
let students = [];
let masterItems = []; // Can be courses or services
let selectedStudent = null;
let selectedItem = null; // Can be course_id (UUID) or service_id (BigInt)
let isServiceMode = false;

let totalFee = 0;
let paidSoFar = 0;
let balanceDue = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../../login.html';
        return;
    }

    AdminSidebar.init('record-payment', '../../');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = window.AdminHeader.render('Record Payment');
    }

    const currentAdmin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, currentAdmin);

    await loadStudents();

    // Set default date
    const dateInput = document.getElementById('payment-date');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

    bindEvents();
    bindTypeToggle();
});

function bindTypeToggle() {
    document.querySelectorAll('input[name="payment-type"]').forEach(radio => {
        radio.addEventListener('change', () => {
            isServiceMode = radio.value === 'service';
            const label = document.getElementById('item-label');
            label.innerHTML = isServiceMode ? 'Service <span class="required">*</span>' : 'Course <span class="required">*</span>';

            resetForm();
            if (selectedStudent) {
                if (isServiceMode) loadMasterServices();
                else loadStudentCourses(selectedStudent);
            }
        });
    });
}

function resetForm() {
    selectedItem = null;
    document.getElementById('fee-summary').style.display = 'none';
    document.getElementById('amount-input').value = '';
    document.getElementById('amount-input').disabled = !isServiceMode; // Services allow manual entry
    document.getElementById('course-select').innerHTML = '<option value="">Select student first</option>';
    document.getElementById('course-select').disabled = true;
    updateProceedButton();
}

async function loadStudents() {
    try {
        const { data, error } = await window.supabaseClient.from('students').select('id, first_name, last_name, phone').order('first_name');
        if (error) throw error;
        students = data || [];
        const select = document.getElementById('student-select');
        select.innerHTML = '<option value="">Select a student</option>' +
            students.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name} (${s.phone || '-'})</option>`).join('');
    } catch (err) {
        console.error(err);
    }
}

async function loadStudentCourses(studentId) {
    const select = document.getElementById('course-select');
    select.disabled = true;
    select.innerHTML = '<option value="">Loading...</option>';

    try {
        const { data: student, error: sErr } = await window.supabaseClient.from('students').select('courses, course_discounts').eq('id', studentId).single();
        if (sErr) throw sErr;

        const enrolled = student.courses || [];
        const discounts = student.course_discounts || {};

        if (enrolled.length === 0) {
            select.innerHTML = '<option value="">No courses found</option>';
            return;
        }

        const { data: details, error: cErr } = await window.supabaseClient.from('courses').select('id, course_code, course_name, fee').in('course_code', enrolled);
        if (cErr) throw cErr;

        masterItems = details.map(c => ({
            id: c.id,
            code: c.course_code,
            name: c.course_name,
            final_fee: (parseFloat(c.fee) || 0) - (parseFloat(discounts[c.course_code]) || 0)
        }));

        select.innerHTML = '<option value="">Select a course</option>' +
            masterItems.map(c => `<option value="${c.id}">${c.name} (${c.code})</option>`).join('');
        select.disabled = false;
    } catch (err) {
        console.error(err);
    }
}

async function loadMasterServices() {
    const select = document.getElementById('course-select');
    select.disabled = true;
    select.innerHTML = '<option value="">Loading services...</option>';

    try {
        const { data, error } = await window.supabaseClient.from('services').select('id, service_code, name').order('service_code');
        if (error) throw error;

        masterItems = data.map(s => ({
            id: s.id,
            code: s.service_code,
            name: s.name,
            final_fee: 0 // Services have variable fees
        }));

        select.innerHTML = '<option value="">Select a service</option>' +
            masterItems.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('');
        select.disabled = false;
    } catch (err) {
        console.error(err);
    }
}

async function calculateFeeSummary(itemId) {
    const item = masterItems.find(i => i.id == itemId); // Using == for BigInt/String match
    if (!item) return;

    if (!isServiceMode) {
        totalFee = item.final_fee;
        try {
            const { data: payments } = await window.supabaseClient
                .from('payments')
                .select('amount_paid')
                .eq('student_id', selectedStudent)
                .eq('course_id', item.id)
                .eq('status', 'SUCCESS');
            paidSoFar = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
            balanceDue = totalFee - paidSoFar;

            document.getElementById('total-fee').textContent = formatCurrency(totalFee);
            document.getElementById('paid-so-far').textContent = formatCurrency(paidSoFar);
            document.getElementById('balance-due').textContent = formatCurrency(balanceDue);
            document.getElementById('fee-summary').style.display = 'block';

            const amountInput = document.getElementById('amount-input');
            amountInput.value = balanceDue > 0 ? balanceDue : '';
            amountInput.disabled = balanceDue <= 0;
        } catch (err) { console.error(err); }
    } else {
        // Service mode: No fixed fee summary
        document.getElementById('fee-summary').style.display = 'none';
        document.getElementById('amount-input').disabled = false;
        document.getElementById('amount-input').value = '';
    }
    updateProceedButton();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function updateProceedButton() {
    const btn = document.getElementById('proceed-btn');
    const amount = parseFloat(document.getElementById('amount-input').value) || 0;
    const mode = document.querySelector('input[name="payment-mode"]:checked')?.value;
    const utr = document.getElementById('utr-input')?.value?.trim() || '';
    const utrValid = mode === 'OFFLINE_UPI' ? utr.length > 5 : true;

    const isValid = selectedStudent && selectedItem && amount > 0 && mode && utrValid;
    btn.disabled = !isValid;
}

function bindEvents() {
    document.getElementById('student-select').addEventListener('change', async (e) => {
        selectedStudent = e.target.value;
        resetForm();
        if (selectedStudent) {
            if (isServiceMode) await loadMasterServices();
            else await loadStudentCourses(selectedStudent);
        }
    });

    document.getElementById('course-select').addEventListener('change', async (e) => {
        selectedItem = e.target.value;
        if (selectedItem) await calculateFeeSummary(selectedItem);
        else resetForm();
    });

    document.getElementById('amount-input').addEventListener('input', updateProceedButton);

    document.querySelectorAll('input[name="payment-mode"]').forEach(radio => {
        radio.onchange = () => {
            document.getElementById('utr-group').style.display = radio.value === 'OFFLINE_UPI' ? 'block' : 'none';
            if (radio.value !== 'OFFLINE_UPI') document.getElementById('utr-input').value = '';
            updateProceedButton();
        };
    });

    document.getElementById('utr-input').addEventListener('input', updateProceedButton);
    document.getElementById('payment-form').addEventListener('submit', handlePayment);
}

async function handlePayment(e) {
    e.preventDefault();
    const { Toast } = window.AdminUtils;
    const amount = parseFloat(document.getElementById('amount-input').value);
    const mode = document.querySelector('input[name="payment-mode"]:checked').value;
    const btn = document.getElementById('proceed-btn');

    if (!isServiceMode && amount > balanceDue) {
        Toast.error('Invalid', 'Amount cannot exceed balance due');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    try {
        const paymentDate = document.getElementById('payment-date').value;
        const utr = mode === 'OFFLINE_UPI' ? document.getElementById('utr-input').value.trim() : null;

        let referenceId = utr;
        if (mode === 'CASH') {
            const dateStr = paymentDate.replace(/-/g, '');
            const { count } = await window.supabaseClient.from('payments').select('*', { count: 'exact', head: true }).eq('payment_date', paymentDate).eq('payment_mode', 'CASH');
            referenceId = `PAY-CASH-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;
        }

        const payload = {
            student_id: selectedStudent,
            [isServiceMode ? 'service_id' : 'course_id']: selectedItem,
            amount_paid: amount,
            payment_mode: mode === 'OFFLINE_UPI' ? 'UPI' : 'CASH',
            reference_id: referenceId,
            status: 'SUCCESS',
            payment_date: paymentDate
        };

        const { data: payment, error } = await window.supabaseClient.from('payments').insert(payload).select().single();
        if (error) throw error;

        // Create Receipt
        await createReceipt(payment);

        Toast.success('Success', 'Payment recorded');
        setTimeout(() => window.location.href = '../receipts/', 1500);
    } catch (err) {
        Toast.error('Error', err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Proceed';
    }
}

async function createReceipt(payment) {
    try {
        const { data: student } = await window.supabaseClient.from('students').select('first_name, last_name').eq('id', payment.student_id).single();
        const itemName = masterItems.find(i => i.id == selectedItem)?.name || 'Unknown';

        // Generate consistent Receipt ID (Format: 001-ACS-NA-GD)
        const { data: lastReceipt } = await window.supabaseClient
            .from('receipts')
            .select('receipt_id')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        let seq = 1;
        if (lastReceipt && lastReceipt.receipt_id) {
            const match = lastReceipt.receipt_id.match(/^(\d+)-/);
            if (match) seq = parseInt(match[1]) + 1;
        }

        const initials = ((student.first_name?.charAt(0) || '') + (student.last_name?.charAt(0) || '')).toUpperCase();
        const courseCode = masterItems.find(i => i.id == selectedItem)?.code || 'NA';
        const receiptId = `${String(seq).padStart(3, '0')}-ACS-${initials}-${courseCode}`;

        const receiptPayload = {
            receipt_id: receiptId || `${Date.now()}-ACS`,
            payment_id: payment.id,
            student_id: payment.student_id,
            [isServiceMode ? 'service_id' : 'course_id']: selectedItem,
            amount_paid: payment.amount_paid,
            payment_mode: payment.payment_mode,
            reference_id: payment.reference_id,
            balance_due: isServiceMode ? 0 : (balanceDue - payment.amount_paid),
            payment_date: payment.payment_date
        };

        await window.supabaseClient.from('receipts').insert(receiptPayload);

        // Record Activity
        await window.supabaseClient.from('activities').insert({
            activity_type: 'fee_recorded',
            activity_name: `${student.first_name} ${student.last_name}`,
            activity_link: '/admin/payments/receipts/',
            activity_time: new Date().toISOString()
        });
    } catch (err) {
        console.error('Receipt error:', err);
    }
}
