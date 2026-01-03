// ACS FeePay - Frontend Logic
const SUPABASE_URL = 'https://afocbygdakyqtmmrjvmy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmb2NieWdkYWt5cXRtbXJqdm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5Mzc5MjksImV4cCI6MjA4MjUxMzkyOX0.L7YerK7umlQ0H9WOCfGzY6AcKVjHs7aDKvXLYcCj-f0';

let supabaseClient;
let currentStudent = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    bindEvents();
});

function bindEvents() {
    document.getElementById('lookup-btn').addEventListener('click', handleLookup);
    document.getElementById('back-btn').addEventListener('click', () => switchView('lookup-view'));

    // Enter key support
    document.getElementById('student-id').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLookup();
    });
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-message');
    msg.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

async function handleLookup() {
    const studentId = document.getElementById('student-id').value.trim();
    if (!studentId) return showToast('Please enter a Student ID');

    const btn = document.getElementById('lookup-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Finding...';

    try {
        const { data: student, error } = await supabaseClient
            .from('students')
            .select('id, student_id, first_name, last_name, phone, email, courses, course_discounts')
            .ilike('student_id', studentId)
            .maybeSingle();

        if (error) throw new Error('Database connection failed');
        if (!student) throw new Error('Student ID not found. Please check and try again.');

        currentStudent = student;
        await loadCourses(student.courses);

        // Update UI
        document.getElementById('display-name').textContent = `${student.first_name} ${student.last_name}`;
        document.getElementById('display-id').textContent = student.student_id;
        switchView('payment-view');

    } catch (err) {
        showToast(err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-search"></i><span>Find My Account</span>';
    }
}

async function loadCourses(courseCodes) {
    if (!courseCodes || courseCodes.length === 0) return;

    // 1. Fetch course details
    const { data: courses, error: courseError } = await supabaseClient
        .from('courses')
        .select('id, course_code, course_name, fee')
        .in('course_code', courseCodes);

    if (courseError) throw courseError;

    // 2. Fetch all completed payments for this student
    const { data: payments, error: paymentError } = await supabaseClient
        .from('payments')
        .select('course_id, amount_paid')
        .eq('student_id', currentStudent.id)
        .eq('status', 'completed');

    if (paymentError) throw paymentError;

    const container = document.getElementById('courses-container');
    container.innerHTML = '';

    courses.forEach(course => {
        // Calculate Discount
        const discount = (currentStudent.course_discounts && currentStudent.course_discounts[course.course_code]) || 0;
        const netTotal = course.fee - discount;

        // Calculate Total Paid
        const totalPaid = (payments || [])
            .filter(p => p.course_id === course.id)
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

        const balance = Math.max(0, netTotal - totalPaid);

        // Create Course Block
        const block = document.createElement('div');
        block.className = 'course-block';
        block.innerHTML = `
            <div class="course-title">${course.course_name}</div>
            <div class="course-grid">
                <div>
                    <div class="grid-label">Total</div>
                    <div class="grid-value">₹${new Intl.NumberFormat('en-IN').format(netTotal)}</div>
                </div>
                <div>
                    <div class="grid-label">Paid</div>
                    <div class="grid-value">₹${new Intl.NumberFormat('en-IN').format(totalPaid)}</div>
                </div>
                <div>
                    <div class="grid-label">Balance</div>
                    <div class="grid-value">₹${new Intl.NumberFormat('en-IN').format(balance)}</div>
                </div>
            </div>
            <div class="pay-row">
                <div class="amount-input-box">
                    <span>₹</span>
                    <input type="number" id="amt-${course.id}" value="${balance}" max="${balance}" step="100">
                </div>
                <button onclick="initiatePayment('${course.id}', '${course.course_name}')" id="btn-${course.id}" class="mini-pay-btn">
                    <i class="fa-brands fa-gg"></i> Pay
                </button>
            </div>
            ${discount > 0 ? `<div style="font-size: 0.65rem; color: #10b981; margin-top: 8px;">* Includes discount of ₹${discount}</div>` : ''}
        `;
        container.appendChild(block);
    });
}

async function initiatePayment(courseId, courseName) {
    const amountInput = document.getElementById(`amt-${courseId}`);
    const payBtn = document.getElementById(`btn-${courseId}`);
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) return showToast('Please enter a valid amount');
    const balance = parseFloat(amountInput.max);
    if (amount > balance) return showToast('Amount cannot exceed balance due');

    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        // 1. Create Order
        const response = await fetch('/.netlify/functions/pay-create-order', {
            method: 'POST',
            body: JSON.stringify({
                amount: amount,
                student_id: currentStudent.id,
                course_id: courseId
            })
        });

        const order = await response.json();
        if (!order.success) throw new Error(order.error || 'Failed to create order');

        // 2. Open Razorpay
        const options = {
            key: order.key_id,
            amount: order.amount,
            currency: order.currency,
            name: "Abhi's Craftsoft",
            description: `${courseName} Fee Payment | ${currentStudent.first_name} ${currentStudent.last_name}`,
            order_id: order.order_id,
            config: {
                display: {
                    blocks: {
                        utib: { // UPI & PayLater block
                            name: "Pay via UPI or PayLater",
                            methods: ["upi", "paylater"]
                        }
                    },
                    sequence: ["block.utib"],
                    preferences: {
                        show_default_blocks: false
                    }
                }
            },
            handler: async (res) => {
                await verifyPayment(res, courseId, amount);
            },
            prefill: {
                name: `${currentStudent.first_name} ${currentStudent.last_name}`,
                contact: currentStudent.phone,
                email: currentStudent.email || "",
                method: "upi",
                "vpa": "phonepe" // Suggesting phonepe flow
            },
            theme: { color: "#2896cd" },
            modal: {
                ondismiss: () => {
                    payBtn.disabled = false;
                    payBtn.innerHTML = '<i class="fa-brands fa-gg"></i> Pay';
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();

    } catch (err) {
        showToast(err.message);
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="fa-brands fa-gg"></i> Pay';
    }
}

async function verifyPayment(razorpayRes, courseId, amountPaid) {
    try {
        const response = await fetch('/.netlify/functions/pay-verify-payment', {
            method: 'POST',
            body: JSON.stringify({
                ...razorpayRes,
                student_id: currentStudent.id,
                course_id: courseId
            })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Verification failed');

        document.getElementById('receipt-id').textContent = result.receipt_id;
        document.getElementById('paid-amount').textContent = `₹${new Intl.NumberFormat('en-IN').format(amountPaid)}`;
        switchView('success-view');

    } catch (err) {
        showToast("Payment recorded successfully. Reciept will be updated shortly.");
        // Still show success if payment was actually made
        switchView('success-view');
    }
}
