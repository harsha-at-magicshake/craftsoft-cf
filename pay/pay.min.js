// Pay Your Fees - Public Payment Page
// Students enter Student ID, see balances, and pay via UPI

// Supabase config (public anon key only - for read-only lookups)
const SUPABASE_URL = 'https://afocbygdakyqtmmrjvmy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmb2NieWdkYWt5cXRtbXJqdm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5Mzc5MjksImV4cCI6MjA4MjUxMzkyOX0.L7YerK7umlQ0H9WOCfGzY6AcKVjHs7aDKvXLYcCj-f0';

let supabaseClient;
let currentStudent = null;
let coursesData = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    bindEvents();
    initSecurity();
});

// =====================
// Security Features
// =====================
function initSecurity() {
    // 1. Disable back/forward navigation
    history.pushState(null, null, location.href);
    window.addEventListener('popstate', () => {
        history.pushState(null, null, location.href);
    });

    // 2. Blur page when tab loses focus (screenshot protection)
    document.addEventListener('visibilitychange', () => {
        const overlay = document.getElementById('blur-overlay');
        if (document.hidden) {
            if (!overlay) {
                const div = document.createElement('div');
                div.id = 'blur-overlay';
                div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(245,247,250,0.98);backdrop-filter:blur(20px);z-index:9999;display:flex;align-items:center;justify-content:center;';
                div.innerHTML = '<div style="text-align:center;color:#1a1a2e;"><i class="fa-solid fa-lock" style="font-size:48px;margin-bottom:16px;color:#2896cd;"></i><p style="font-size:16px;">Switch back to continue</p></div>';
                document.body.appendChild(div);
            }
        } else {
            if (overlay) overlay.remove();
        }
    });

    // 3. Disable right-click context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // 4. Disable keyboard shortcuts for screenshots/dev tools
    document.addEventListener('keydown', (e) => {
        // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
            (e.ctrlKey && e.key === 'u')) {
            e.preventDefault();
        }
        // Disable Print Screen (limited browser support)
        if (e.key === 'PrintScreen') {
            navigator.clipboard.writeText('');
        }
    });

    // 5. Clear sensitive data on page unload
    window.addEventListener('beforeunload', () => {
        currentStudent = null;
        coursesData = [];
    });
}

// Bind Events
function bindEvents() {
    document.getElementById('lookup-btn').addEventListener('click', lookupStudent);
    document.getElementById('student-id-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') lookupStudent();
    });
    document.getElementById('back-btn').addEventListener('click', goBack);
    document.getElementById('done-btn').addEventListener('click', () => {
        window.location.reload();
    });
}

// Lookup Student by ID
async function lookupStudent() {
    const input = document.getElementById('student-id-input');
    const btn = document.getElementById('lookup-btn');
    const studentId = input.value.trim();

    if (!studentId) {
        showToast('Please enter your Student ID');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Looking up...';

    try {
        // Fetch student by student_id (case-insensitive)
        const { data: student, error } = await supabaseClient
            .from('students')
            .select('id, student_id, first_name, last_name, phone, courses, course_discounts')
            .ilike('student_id', studentId)
            .maybeSingle();

        if (error) throw error;

        if (!student) {
            showToast('Student ID not found. Please check and try again.');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-search"></i> Find My Account';
            return;
        }

        currentStudent = student;

        // Fetch course details and payments
        await loadStudentCourses(student);

        // Show step 2
        document.getElementById('step-lookup').style.display = 'none';
        document.getElementById('step-pay').style.display = 'block';
        document.getElementById('student-name').textContent = `${student.first_name} ${student.last_name}`;
        document.getElementById('student-id-display').textContent = student.student_id;

    } catch (err) {
        console.error('Lookup error:', err);
        showToast('Something went wrong. Please try again.');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-search"></i> Find My Account';
}

// Load Student Courses with Fee Details
async function loadStudentCourses(student) {
    const courseCodes = student.courses || [];

    if (courseCodes.length === 0) {
        document.getElementById('courses-list').innerHTML = `
            <div class="course-card">
                <p style="color: var(--text-muted); text-align: center;">No courses enrolled.</p>
            </div>
        `;
        return;
    }

    // Fetch course details
    const { data: courses, error: courseError } = await supabaseClient
        .from('courses')
        .select('id, course_code, course_name, fee')
        .in('course_code', courseCodes);

    if (courseError) throw courseError;

    // Fetch all payments for this student
    const { data: payments, error: paymentError } = await supabaseClient
        .from('payments')
        .select('course_id, amount_paid')
        .eq('student_id', student.id);

    if (paymentError) throw paymentError;

    // Calculate balances for each course
    const discounts = student.course_discounts || {};
    coursesData = courses.map(course => {
        const discount = parseFloat(discounts[course.course_code] || 0);
        const totalFee = parseFloat(course.fee || 0) - discount;
        const coursePayments = (payments || []).filter(p => p.course_id === course.id);
        const paidAmount = coursePayments.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
        const balance = totalFee - paidAmount;

        return {
            id: course.id,
            code: course.course_code,
            name: course.course_name,
            totalFee,
            paidAmount,
            balance: balance > 0 ? balance : 0,
            isPaid: balance <= 0
        };
    });

    renderCourses();
}

// Render Courses
function renderCourses() {
    const container = document.getElementById('courses-list');

    container.innerHTML = coursesData.map(course => `
        <div class="course-card ${course.isPaid ? 'paid' : ''}" data-course-id="${course.id}">
            <div class="course-name">${course.name}</div>
            <div class="course-fees">
                <div class="fee-item">
                    <span class="label">Total</span>
                    <span class="value">₹${formatNumber(course.totalFee)}</span>
                </div>
                <div class="fee-item">
                    <span class="label">Paid</span>
                    <span class="value">₹${formatNumber(course.paidAmount)}</span>
                </div>
                <div class="fee-item">
                    <span class="label">Balance</span>
                    <span class="value ${course.isPaid ? 'paid-full' : 'due'}">
                        ${course.isPaid ? '✓ Paid' : '₹' + formatNumber(course.balance)}
                    </span>
                </div>
            </div>
            ${course.isPaid ? `
                <div class="paid-badge">
                    <i class="fa-solid fa-check-circle"></i> Fully Paid
                </div>
            ` : `
                <div class="course-actions">
                    <div class="amount-input-wrapper">
                        <span class="currency">₹</span>
                        <input type="number" class="amount-input" 
                               id="amount-${course.id}" 
                               value="${course.balance}" 
                               min="1" 
                               max="${course.balance}"
                               placeholder="Amount">
                    </div>
                    <button class="btn-pay" onclick="payForCourse('${course.id}')">
                        <i class="fa-brands fa-gg"></i> Pay
                    </button>
                </div>
            `}
        </div>
    `).join('');
}

// Pay for Course
async function payForCourse(courseId) {
    const course = coursesData.find(c => c.id === courseId);
    if (!course) return;

    const amountInput = document.getElementById(`amount-${courseId}`);
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount');
        return;
    }

    if (amount > course.balance) {
        showToast('Amount cannot exceed balance due');
        return;
    }

    const payBtn = amountInput.parentElement.nextElementSibling;
    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        // Step 1: Create Razorpay order
        const orderResponse = await fetch('https://www.craftsoft.co.in/.netlify/functions/create-razorpay-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amount,
                student_id: currentStudent.id,
                course_id: courseId
            })
        });

        const orderData = await orderResponse.json();

        if (!orderResponse.ok || !orderData.success) {
            throw new Error(orderData.error || 'Failed to create order');
        }

        // Step 2: Open Razorpay Checkout (UPI only)
        const razorpayOptions = {
            key: orderData.key_id,
            amount: orderData.amount,
            currency: orderData.currency,
            order_id: orderData.order_id,
            name: 'Abhi\'s Craftsoft',
            description: `${course.name} Fee`,
            prefill: {
                name: `${currentStudent.first_name} ${currentStudent.last_name}`,
                contact: currentStudent.phone || ''
            },
            method: {
                upi: true,
                card: false,
                netbanking: false,
                wallet: false,
                emi: false
            },
            theme: {
                color: '#2896cd'
            },
            handler: async function (response) {
                await verifyPayment(response, courseId);
            },
            modal: {
                ondismiss: function () {
                    payBtn.disabled = false;
                    payBtn.innerHTML = '<i class="fa-brands fa-gg"></i> Pay';
                }
            }
        };

        const razorpay = new Razorpay(razorpayOptions);
        razorpay.on('payment.failed', function (response) {
            payBtn.disabled = false;
            payBtn.innerHTML = '<i class="fa-brands fa-gg"></i> Pay';
            showToast(response.error.description || 'Payment failed');
        });

        razorpay.open();

    } catch (err) {
        console.error('Payment error:', err);
        showToast(err.message || 'Failed to initiate payment');
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="fa-brands fa-gg"></i> Pay';
    }
}

// Verify Payment
async function verifyPayment(razorpayResponse, courseId) {
    try {
        const verifyResponse = await fetch('https://www.craftsoft.co.in/.netlify/functions/verify-razorpay-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
                student_id: currentStudent.id,
                course_id: courseId
            })
        });

        const result = await verifyResponse.json();

        if (!verifyResponse.ok || !result.success) {
            throw new Error(result.error || 'Payment verification failed');
        }

        // Show success
        document.getElementById('step-pay').style.display = 'none';
        document.getElementById('step-success').style.display = 'block';
        document.getElementById('receipt-id').textContent = result.receipt_id;
        document.getElementById('success-message').textContent =
            `₹${formatNumber(result.amount_paid)} paid successfully!`;

    } catch (err) {
        console.error('Verify error:', err);
        showToast(err.message || 'Verification failed. Please contact support.');
    }
}

// Go Back
function goBack() {
    document.getElementById('step-pay').style.display = 'none';
    document.getElementById('step-lookup').style.display = 'block';
    document.getElementById('student-id-input').value = '';
    currentStudent = null;
    coursesData = [];
}

// Show Toast
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.style.display = 'flex';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Format Number
function formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(num);
}
