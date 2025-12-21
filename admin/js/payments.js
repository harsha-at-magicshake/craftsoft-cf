// Payments Page Logic

let allPayments = [];

// Update user info
auth.onAuthStateChanged((user) => {
    if (user) {
        const initial = user.email.charAt(0).toUpperCase();
        document.getElementById('userAvatar').textContent = initial;
        document.getElementById('userName').textContent = user.email.split('@')[0];
    }
});

// Load Payments
async function loadPayments() {
    try {
        const snapshot = await db.collection('payments').orderBy('createdAt', 'desc').get();

        allPayments = [];
        let totalCollected = 0;
        let cashTotal = 0;
        let onlineTotal = 0;

        snapshot.forEach(doc => {
            const payment = { id: doc.id, ...doc.data() };
            allPayments.push(payment);

            totalCollected += payment.amount || 0;

            if (payment.mode === 'cash') {
                cashTotal += payment.amount || 0;
            } else {
                onlineTotal += payment.amount || 0;
            }
        });

        // Update stats
        document.getElementById('totalCollected').textContent = formatCurrency(totalCollected);
        document.getElementById('cashPayments').textContent = formatCurrency(cashTotal);
        document.getElementById('onlinePayments').textContent = formatCurrency(onlineTotal);

        renderPayments(allPayments);

    } catch (error) {
        console.error('Error loading payments:', error);
        showToast('Error loading payments', 'error');
    }
}

// Render Payments Table
function renderPayments(payments) {
    const tbody = document.getElementById('paymentsTable');

    if (payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <h3>No payments found</h3>
                        <p>Payment records will appear here</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = payments.map(payment => {
        const paymentDate = payment.createdAt?.toDate?.()
            ? payment.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '-';

        const modeIcons = {
            'cash': '<i class="fas fa-money-bill" style="color: var(--success);"></i> Cash',
            'razorpay': '<i class="fas fa-credit-card" style="color: var(--info);"></i> Razorpay',
            'upi': '<i class="fas fa-mobile-alt" style="color: var(--primary);"></i> UPI',
            'bank': '<i class="fas fa-university" style="color: var(--gray-600);"></i> Bank'
        };

        return `
            <tr>
                <td><strong>${payment.receiptNumber || '-'}</strong></td>
                <td>${payment.studentName || '-'}</td>
                <td style="color: var(--success); font-weight: 700;">${formatCurrency(payment.amount)}</td>
                <td>${modeIcons[payment.mode] || payment.mode}</td>
                <td><small>${paymentDate}</small></td>
                <td><small style="color: var(--gray-500);">${payment.notes || '-'}</small></td>
            </tr>
        `;
    }).join('');
}

// Filter Payments
function filterPayments() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const mode = document.getElementById('modeFilter').value;

    let filtered = allPayments.filter(payment => {
        const matchesSearch = !search ||
            (payment.studentName && payment.studentName.toLowerCase().includes(search)) ||
            (payment.receiptNumber && payment.receiptNumber.toLowerCase().includes(search));

        const matchesMode = !mode || payment.mode === mode;

        return matchesSearch && matchesMode;
    });

    renderPayments(filtered);
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', filterPayments);
document.getElementById('modeFilter').addEventListener('change', filterPayments);

// Format Currency
function formatCurrency(amount) {
    return '₹' + (amount || 0).toLocaleString('en-IN');
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

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadPayments, 500);
});
