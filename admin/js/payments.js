/**
 * Payments Management Module
 * Phase 5: Payment CRUD Operations
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ============================================
    // DATA: Courses (with short codes)
    // ============================================
    const COURSES = [
        { code: '01', short: 'GD', name: 'Graphic Design' },
        { code: '02', short: 'UX', name: 'UI/UX Design' },
        { code: '03', short: 'MERN', name: 'Full Stack Development (MERN)' },
        { code: '04', short: 'PyFS', name: 'Python Full Stack Development' },
        { code: '05', short: 'JavaFS', name: 'Java Full Stack Development' },
        { code: '06', short: 'DSA', name: 'DSA Mastery' },
        { code: '07', short: 'DA', name: 'Data Analytics' },
        { code: '08', short: 'SF', name: 'Salesforce Administration' },
        { code: '09', short: 'Py', name: 'Python Programming' },
        { code: '10', short: 'React', name: 'React JS' },
        { code: '11', short: 'Git', name: 'Git & GitHub' },
        { code: '12', short: 'DevOps', name: 'DevOps Engineering' },
        { code: '13', short: 'AWS', name: 'AWS Cloud Excellence' },
        { code: '14', short: 'DevSec', name: 'DevSecOps' },
        { code: '15', short: 'Azure', name: 'Microsoft Azure' },
        { code: '16', short: 'AutoPy', name: 'Automation with Python' },
        { code: '17', short: 'Eng', name: 'Spoken English Mastery' },
        { code: '18', short: 'Soft', name: 'Soft Skills Training' },
        { code: '19', short: 'Resume', name: 'Resume Writing & Interview Prep' },
        { code: '20', short: 'HW', name: 'Handwriting Improvement' }
    ];

    const STATUS_CONFIG = {
        paid: { label: 'Paid', icon: 'fa-solid fa-circle-check', color: '#22c55e' },
        pending: { label: 'Pending', icon: 'fa-solid fa-clock', color: '#f59e0b' },
        failed: { label: 'Failed', icon: 'fa-solid fa-circle-xmark', color: '#ef4444' },
        refunded: { label: 'Refunded', icon: 'fa-solid fa-rotate-left', color: '#8b5cf6' }
    };

    const METHOD_CONFIG = {
        upi: { label: 'UPI', icon: 'fa-solid fa-mobile-screen' },
        cash: { label: 'Cash', icon: 'fa-solid fa-money-bill' },
        bank: { label: 'Bank', icon: 'fa-solid fa-building-columns' },
        cheque: { label: 'Cheque', icon: 'fa-solid fa-file-invoice' },
        card: { label: 'Card', icon: 'fa-solid fa-credit-card' }
    };

    // Pagination Settings
    const ITEMS_PER_PAGE = 10;

    // ============================================
    // DOM Elements
    // ============================================
    const addPaymentBtn = document.getElementById('addPaymentBtn');
    const paymentModalOverlay = document.getElementById('paymentModalOverlay');
    const closePaymentModal = document.getElementById('closePaymentModal');
    const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
    const savePaymentBtn = document.getElementById('savePaymentBtn');
    const paymentForm = document.getElementById('paymentForm');
    const paymentsTableBody = document.getElementById('paymentsTableBody');
    const paymentsCards = document.getElementById('paymentsCards');
    const emptyState = document.getElementById('emptyState');
    const paymentSearch = document.getElementById('paymentSearch');

    // Form Elements
    const studentSelect = document.getElementById('studentSelect');
    const courseSelect = document.getElementById('courseSelect');
    const studentInfoDisplay = document.getElementById('studentInfoDisplay');
    const paymentDateInput = document.getElementById('paymentDate');

    // Filter & Pagination Elements
    const statusFilter = document.getElementById('statusFilter');
    const methodFilter = document.getElementById('methodFilter');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const paginationInfo = document.getElementById('paginationInfo');

    // Stats Elements
    const statCollected = document.getElementById('statCollected');
    const statPending = document.getElementById('statPending');
    const statThisMonth = document.getElementById('statThisMonth');

    // State
    let payments = [];
    let students = [];
    let editingPaymentId = null;
    let currentPage = 1;
    let filteredPayments = [];

    // ============================================
    // Initialize
    // ============================================
    loadStudents();
    initFilters();
    initFormListeners();
    setDefaultDate();
    await loadPayments();

    // ============================================
    // Set Default Date to Today
    // ============================================
    function setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        paymentDateInput.value = today;
    }

    // ============================================
    // Load Students for Dropdown
    // ============================================
    function loadStudents() {
        const stored = localStorage.getItem('craftsoft_students');
        students = stored ? JSON.parse(stored) : [];

        studentSelect.innerHTML = '<option value="">Select student...</option>' +
            students.map(s => `<option value="${s.id}">${s.name} (${s.id})</option>`).join('');
    }

    // ============================================
    // Filters
    // ============================================
    function initFilters() {
        statusFilter.addEventListener('change', () => {
            currentPage = 1;
            applyFiltersAndSort();
        });

        methodFilter.addEventListener('change', () => {
            currentPage = 1;
            applyFiltersAndSort();
        });
    }

    // ============================================
    // Form Listeners
    // ============================================
    function initFormListeners() {
        // Student selection - show info and load courses
        studentSelect.addEventListener('change', () => {
            const studentId = studentSelect.value;
            const student = students.find(s => s.id === studentId);

            if (student) {
                studentInfoDisplay.style.display = 'flex';
                document.getElementById('displayStudentId').textContent = student.id;
                document.getElementById('displayStudentPhone').textContent = student.phone;

                // Populate courses dropdown
                const studentCourses = student.courses || [];
                courseSelect.innerHTML = '<option value="">Select course...</option>' +
                    studentCourses.map(code => {
                        const course = COURSES.find(c => c.code === code);
                        return `<option value="${code}">${course ? course.name : code}</option>`;
                    }).join('');
            } else {
                studentInfoDisplay.style.display = 'none';
                courseSelect.innerHTML = '<option value="">Select course...</option>';
            }
        });
    }

    // ============================================
    // Modal Controls
    // ============================================
    function openModal(editing = false) {
        paymentModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (!editing) {
            document.getElementById('paymentModalTitle').textContent = 'Add New Payment';
            savePaymentBtn.querySelector('span').textContent = 'Save Payment';
            paymentForm.reset();
            setDefaultDate();
            studentInfoDisplay.style.display = 'none';
            courseSelect.innerHTML = '<option value="">Select course...</option>';
            document.getElementById('paymentStatus').value = 'paid';
        }
    }

    function closeModal() {
        paymentModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        editingPaymentId = null;
        paymentForm.reset();
        studentInfoDisplay.style.display = 'none';
    }

    addPaymentBtn.addEventListener('click', () => openModal(false));
    closePaymentModal.addEventListener('click', closeModal);
    cancelPaymentBtn.addEventListener('click', closeModal);
    paymentModalOverlay.addEventListener('click', (e) => {
        if (e.target === paymentModalOverlay) closeModal();
    });

    // ============================================
    // Generate Payment ID
    // ============================================
    function generatePaymentId() {
        const sequence = (payments.length + 1).toString().padStart(3, '0');
        return `PAY-${sequence}`;
    }

    // ============================================
    // Save Payment
    // ============================================
    savePaymentBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const studentId = studentSelect.value;
        const courseCode = courseSelect.value;
        const amount = document.getElementById('paymentAmount').value;
        const method = document.getElementById('paymentMethod').value;
        const paymentDate = paymentDateInput.value;
        const status = document.getElementById('paymentStatus').value;

        if (!studentId) {
            window.toast.warning('Required', 'Please select a student');
            return;
        }

        if (!courseCode) {
            window.toast.warning('Required', 'Please select a course');
            return;
        }

        if (!amount || amount <= 0) {
            window.toast.warning('Required', 'Please enter a valid amount');
            return;
        }

        if (!method) {
            window.toast.warning('Required', 'Please select payment method');
            return;
        }

        if (!paymentDate) {
            window.toast.warning('Required', 'Please select payment date');
            return;
        }

        const student = students.find(s => s.id === studentId);

        const paymentData = {
            id: editingPaymentId || generatePaymentId(),
            student_id: studentId,
            student_name: student ? student.name : 'Unknown',
            student_phone: student ? student.phone : '',
            course_code: courseCode,
            amount: parseFloat(amount),
            method: method,
            payment_date: paymentDate,
            transaction_id: document.getElementById('transactionId').value.trim() || null,
            status: status,
            notes: document.getElementById('paymentNotes').value.trim() || null,
            created_at: editingPaymentId ? undefined : new Date().toISOString()
        };

        savePaymentBtn.disabled = true;
        savePaymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            if (editingPaymentId) {
                const index = payments.findIndex(p => p.id === editingPaymentId);
                if (index !== -1) {
                    payments[index] = { ...payments[index], ...paymentData };
                }
                window.toast.success('Updated', 'Payment updated successfully');
            } else {
                payments.push(paymentData);
                window.toast.success('Added', 'Payment added successfully');
            }

            savePaymentsToStorage();
            applyFiltersAndSort();
            updateStats();
            closeModal();

        } catch (error) {
            console.error('Error saving payment:', error);
            window.toast.error('Error', 'Failed to save payment');
        } finally {
            savePaymentBtn.disabled = false;
            savePaymentBtn.innerHTML = '<i class="fas fa-save"></i> <span>Save Payment</span>';
        }
    });

    // ============================================
    // Load Payments
    // ============================================
    async function loadPayments() {
        try {
            const stored = localStorage.getItem('craftsoft_payments');
            payments = stored ? JSON.parse(stored) : [];

            if (payments.length === 0) {
                payments = [
                    {
                        id: 'PAY-001',
                        student_id: 'S-ACS-001',
                        student_name: 'Ravi Kumar',
                        student_phone: '+919876543210',
                        course_code: '03',
                        amount: 15000,
                        method: 'upi',
                        payment_date: '2024-12-27',
                        transaction_id: 'UPI123456789',
                        status: 'paid',
                        notes: 'First installment',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'PAY-002',
                        student_id: 'S-ACS-002',
                        student_name: 'Sneha Reddy',
                        student_phone: '+918765432109',
                        course_code: '02',
                        amount: 10000,
                        method: 'cash',
                        payment_date: '2024-12-26',
                        transaction_id: null,
                        status: 'pending',
                        notes: 'Partial payment',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'PAY-003',
                        student_id: 'S-ACS-003',
                        student_name: 'Amit Sharma',
                        student_phone: '+919988776655',
                        course_code: '13',
                        amount: 20000,
                        method: 'bank',
                        payment_date: '2024-12-25',
                        transaction_id: 'NEFT98765432',
                        status: 'paid',
                        notes: 'Full payment',
                        created_at: new Date().toISOString()
                    }
                ];
                savePaymentsToStorage();
            }

            applyFiltersAndSort();
            updateStats();

        } catch (error) {
            console.error('Error loading payments:', error);
        }
    }

    function savePaymentsToStorage() {
        localStorage.setItem('craftsoft_payments', JSON.stringify(payments));
    }

    // ============================================
    // Update Stats
    // ============================================
    function updateStats() {
        const collected = payments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);

        const pending = payments
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + p.amount, 0);

        const now = new Date();
        const thisMonth = payments
            .filter(p => {
                const pDate = new Date(p.payment_date);
                return p.status === 'paid' &&
                    pDate.getMonth() === now.getMonth() &&
                    pDate.getFullYear() === now.getFullYear();
            })
            .reduce((sum, p) => sum + p.amount, 0);

        statCollected.textContent = formatCurrency(collected);
        statPending.textContent = formatCurrency(pending);
        statThisMonth.textContent = formatCurrency(thisMonth);

        // Update dashboard stats
        localStorage.setItem('craftsoft_revenue', collected);
    }

    function formatCurrency(amount) {
        return '₹' + amount.toLocaleString('en-IN');
    }

    // ============================================
    // Filtering & Sorting
    // ============================================
    function applyFiltersAndSort() {
        let result = [...payments];

        // Search filter
        const searchQuery = paymentSearch.value.toLowerCase().trim();
        if (searchQuery) {
            result = result.filter(p =>
                p.student_name.toLowerCase().includes(searchQuery) ||
                p.id.toLowerCase().includes(searchQuery) ||
                p.student_id.toLowerCase().includes(searchQuery)
            );
        }

        // Status filter
        const selectedStatus = statusFilter.value;
        if (selectedStatus) {
            result = result.filter(p => p.status === selectedStatus);
        }

        // Method filter
        const selectedMethod = methodFilter.value;
        if (selectedMethod) {
            result = result.filter(p => p.method === selectedMethod);
        }

        // Sort by newest
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        filteredPayments = result;
        renderPayments();
    }

    paymentSearch.addEventListener('input', () => {
        currentPage = 1;
        applyFiltersAndSort();
    });

    // ============================================
    // Pagination
    // ============================================
    function getTotalPages() {
        return Math.ceil(filteredPayments.length / ITEMS_PER_PAGE) || 1;
    }

    function getPageData() {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredPayments.slice(start, end);
    }

    function updatePagination() {
        const totalPages = getTotalPages();
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPayments();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage < getTotalPages()) {
            currentPage++;
            renderPayments();
        }
    });

    // ============================================
    // Helper: Get Course Short Code
    // ============================================
    function getCourseShortCode(code) {
        const course = COURSES.find(c => c.code === code);
        return course ? course.short : code;
    }

    // ============================================
    // Render Payments
    // ============================================
    function renderPayments() {
        const data = getPageData();

        // Hide skeletons
        const skeletonTable = document.getElementById('skeletonTable');
        const skeletonCards = document.getElementById('skeletonCards');
        if (skeletonTable) skeletonTable.style.display = 'none';
        if (skeletonCards) skeletonCards.style.display = 'none';

        if (filteredPayments.length === 0) {
            paymentsTableBody.innerHTML = '';
            paymentsCards.innerHTML = '';
            paymentsCards.style.display = 'none';
            emptyState.style.display = 'block';
            document.querySelector('.data-table').style.display = 'none';
            document.getElementById('pagination').style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        document.querySelector('.data-table').style.display = 'table';
        paymentsCards.style.display = '';
        document.getElementById('pagination').style.display = 'flex';
        updatePagination();

        // Table View (Desktop)
        paymentsTableBody.innerHTML = data.map(pay => {
            const statusCfg = STATUS_CONFIG[pay.status] || STATUS_CONFIG.pending;
            const methodCfg = METHOD_CONFIG[pay.method] || { label: pay.method, icon: 'fa-solid fa-money-bill' };

            return `
                <tr data-id="${pay.id}">
                    <td><span class="student-id">${pay.id}</span></td>
                    <td><span class="student-name">${pay.student_name}</span></td>
                    <td><strong>${formatCurrency(pay.amount)}</strong></td>
                    <td><span class="course-tag">${getCourseShortCode(pay.course_code)}</span></td>
                    <td>
                        <span class="method-badge">
                            <i class="${methodCfg.icon}"></i> ${methodCfg.label}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge" style="--status-color: ${statusCfg.color}">
                            <i class="${statusCfg.icon}"></i> ${statusCfg.label}
                        </span>
                    </td>
                    <td>${formatDate(pay.payment_date)}</td>
                    <td>
                        <div class="action-btns">
                            <button class="action-btn edit" title="Edit" onclick="editPayment('${pay.id}')">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="action-btn delete" title="Delete" onclick="deletePayment('${pay.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Card View (Mobile)
        paymentsCards.innerHTML = data.map(pay => {
            const statusCfg = STATUS_CONFIG[pay.status] || STATUS_CONFIG.pending;
            const methodCfg = METHOD_CONFIG[pay.method] || { label: pay.method, icon: 'fa-solid fa-money-bill' };

            return `
                <div class="data-card" data-id="${pay.id}">
                    <div class="data-card-header">
                        <span class="data-card-id">${pay.id}</span>
                        <div class="action-btns">
                            <button class="action-btn edit" title="Edit" onclick="editPayment('${pay.id}')">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="action-btn delete" title="Delete" onclick="deletePayment('${pay.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="data-card-name">${pay.student_name}</div>
                    <div class="data-card-row payment-amount">
                        <i class="fas fa-indian-rupee-sign"></i>
                        <strong>${formatCurrency(pay.amount)}</strong>
                    </div>
                    <div class="data-card-row">
                        <i class="fas fa-book"></i>
                        <span>${getCourseShortCode(pay.course_code)}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="status-badge" style="--status-color: ${statusCfg.color}">
                            <i class="${statusCfg.icon}"></i> ${statusCfg.label}
                        </span>
                        <span class="method-badge">
                            <i class="${methodCfg.icon}"></i> ${methodCfg.label}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}`;
    }

    // ============================================
    // Edit Payment
    // ============================================
    window.editPayment = function (id) {
        const pay = payments.find(p => p.id === id);
        if (!pay) return;

        editingPaymentId = id;
        document.getElementById('paymentModalTitle').textContent = 'Edit Payment';
        savePaymentBtn.querySelector('span').textContent = 'Update Payment';

        // Populate form
        studentSelect.value = pay.student_id || '';

        // Trigger student change to load courses
        const event = new Event('change');
        studentSelect.dispatchEvent(event);

        setTimeout(() => {
            courseSelect.value = pay.course_code || '';
        }, 100);

        document.getElementById('paymentAmount').value = pay.amount || '';
        document.getElementById('paymentMethod').value = pay.method || '';
        paymentDateInput.value = pay.payment_date || '';
        document.getElementById('transactionId').value = pay.transaction_id || '';
        document.getElementById('paymentStatus').value = pay.status || 'paid';
        document.getElementById('paymentNotes').value = pay.notes || '';

        openModal(true);
    };

    // ============================================
    // Delete Payment
    // ============================================
    window.deletePayment = function (id) {
        const pay = payments.find(p => p.id === id);
        if (!pay) return;

        if (window.modal) {
            window.modal.confirm(
                'Delete Payment',
                `Are you sure you want to delete payment <strong>${pay.id}</strong> (${formatCurrency(pay.amount)})?`,
                () => {
                    payments = payments.filter(p => p.id !== id);
                    savePaymentsToStorage();
                    applyFiltersAndSort();
                    updateStats();
                    window.toast.success('Deleted', 'Payment removed successfully');
                }
            );
        }
    };
});
