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

    await loadEntities();

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

            const defaultPrompt = isServiceMode ? 'Select client first' : 'Select student first';
            document.getElementById('course-select').innerHTML = `<option value="">${defaultPrompt}</option>`;

            resetForm();
            loadEntities(); // Reload entities based on mode
        });
    });
}

function resetForm(keepEntity = false) {
    if (!keepEntity) {
        selectedStudent = null;
        const studentSelect = document.getElementById('student-select');
        if (studentSelect) studentSelect.value = '';
    }

    selectedItem = null;
    totalFee = 0;
    paidSoFar = 0;
    balanceDue = 0;

    const select = document.getElementById('course-select');
    const prompt = isServiceMode ? 'Select client first' : 'Select student first';
    select.innerHTML = `<option value="">${prompt}</option>`;
    select.disabled = true;

    document.getElementById('fee-summary').style.display = 'none';
    const amountInput = document.getElementById('amount-input');
    amountInput.value = '';
    amountInput.disabled = true;
    document.getElementById('utr-group').style.display = 'none';
    updateProceedButton();
}

async function loadEntities() {
    const select = document.getElementById('student-select');
    const entityLabel = document.getElementById('entity-label');
    const table = isServiceMode ? 'clients' : 'students';
    const label = isServiceMode ? 'Client' : 'Student';

    entityLabel.innerHTML = `${label} <span class="required">*</span>`;
    select.innerHTML = `<option value="">Loading ${label.toLowerCase()}s...</option>`;

    try {
        const { data, error } = await window.supabaseClient.from(table).select('id, first_name, last_name, phone').order('first_name');
        if (error) throw error;
        students = data || []; // Reusing 'students' array for simplicity
        select.innerHTML = `<option value="">Select a ${label.toLowerCase()}</option>` +
            students.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name || ''} (${s.phone || '-'})</option>`).join('');
    } catch (err) {
        console.error(err);
        select.innerHTML = `<option value="">Error loading ${label.toLowerCase()}s</option>`;
    }
}

async function loadStudentCourses(studentId) {
    const select = document.getElementById('course-select');
    select.disabled = true;
    select.innerHTML = '<option value="">Loading courses...</option>';

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

async function loadClientServices(clientId) {
    const select = document.getElementById('course-select');
    select.disabled = true;
    select.innerHTML = '<option value="">Loading services...</option>';

    try {
        const { data: client, error: cErr } = await window.supabaseClient.from('clients').select('services, service_fees').eq('id', clientId).single();
        if (cErr) throw cErr;

        const enrolled = client.services || [];
        const feesMap = client.service_fees || {};

        if (enrolled.length === 0) {
            select.innerHTML = '<option value="">No services found</option>';
            return;
        }

        const { data: details, error: sErr } = await window.supabaseClient.from('services').select('id, service_code, name').in('service_code', enrolled);
        if (sErr) throw sErr;

        masterItems = details.map(s => ({
            id: s.id,
            code: s.service_code,
            name: s.name,
            final_fee: parseFloat(feesMap[s.service_code]) || 0
        }));

        select.innerHTML = '<option value="">Select a service</option>' +
            masterItems.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('');
        select.disabled = false;
    } catch (err) {
        console.error(err);
    }
}

async function calculateFeeSummary(itemId) {
    const item = masterItems.find(i => i.id == itemId);
    if (!item) return;

    totalFee = item.final_fee;
    try {
        const query = window.supabaseClient
            .from('payments')
            .select('amount_paid')
            .eq(isServiceMode ? 'service_id' : 'course_id', item.id)
            .eq('status', 'SUCCESS');

        if (isServiceMode) {
            query.eq('client_id', selectedStudent);
        } else {
            query.eq('student_id', selectedStudent);
        }

        const { data: payments } = await query;
        paidSoFar = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
        balanceDue = totalFee - paidSoFar;

        document.getElementById('total-fee').textContent = formatCurrency(totalFee);
        document.getElementById('paid-so-far').textContent = formatCurrency(paidSoFar);
        document.getElementById('balance-due').textContent = formatCurrency(balanceDue);
        document.getElementById('fee-summary').style.display = 'block';

        const amountInput = document.getElementById('amount-input');
        amountInput.value = balanceDue > 0 ? balanceDue : '';
        amountInput.disabled = balanceDue <= 0 && !isServiceMode; // Let services overpay if needed
    } catch (err) { console.error(err); }

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
        resetForm(true); // Keep student, reset course info
        if (selectedStudent) {
            if (isServiceMode) await loadClientServices(selectedStudent);
            else await loadStudentCourses(selectedStudent);
        }
    });

    document.getElementById('course-select').addEventListener('change', async (e) => {
        selectedItem = e.target.value;
        if (selectedItem) await calculateFeeSummary(selectedItem);
        // If course unselected, we still have a student, so keepEntity = true
        else resetForm(true);
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
            [isServiceMode ? 'client_id' : 'student_id']: selectedStudent,
            [isServiceMode ? 'service_id' : 'course_id']: selectedItem,
            amount_paid: amount,
            payment_mode: mode === 'OFFLINE_UPI' ? 'ONLINE' : 'CASH',
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
        console.error(err);
        Toast.error('Error', err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Proceed';
    }
}

async function createReceipt(payment) {
    try {
        const table = isServiceMode ? 'clients' : 'students';
        const displayIdCol = isServiceMode ? 'client_id' : 'student_id';
        const { data: entity } = await window.supabaseClient.from(table).select(`first_name, last_name, ${displayIdCol}`).eq('id', selectedStudent).single();

        const itemName = masterItems.find(i => i.id == selectedItem)?.name || 'Unknown';
        const entityName = `${entity.first_name || ''} ${entity.last_name || ''}`.trim();
        const initials = entityName.split(' ').map(w => w[0]?.toUpperCase() || '').join('');

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

        const itemRef = masterItems.find(i => i.id == selectedItem);
        const itemCode = itemRef?.code || 'NA';
        const receiptId = `${String(seq).padStart(3, '0')}-ACS-${initials}-${itemCode}`;

        const receiptPayload = {
            receipt_id: receiptId || `${Date.now()}-ACS`,
            payment_id: payment.id,
            [isServiceMode ? 'client_id' : 'student_id']: selectedStudent,
            [isServiceMode ? 'service_id' : 'course_id']: selectedItem,
            amount_paid: payment.amount_paid,
            payment_mode: payment.payment_mode,
            reference_id: payment.reference_id,
            balance_due: isServiceMode ? (totalFee - paidSoFar - payment.amount_paid) : (balanceDue - payment.amount_paid),
            payment_date: payment.payment_date
        };

        await window.supabaseClient.from('receipts').insert(receiptPayload);

        // Record Activity
        await window.supabaseClient.from('activities').insert({
            activity_type: 'fee_recorded',
            activity_name: entityName,
            activity_link: '/admin/payments/receipts/',
            activity_time: new Date().toISOString()
        });
    } catch (err) {
        console.error('Receipt error:', err);
    }
}
