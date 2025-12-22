// Payments Page Logic - Enhanced with Mobile Cards

let allPayments = [];

// Load Payments
async function loadPayments() {
    try {
        console.log('Loading payments...');
        if (typeof showTableSkeleton === 'function') showTableSkeleton('paymentsTable', 5, 5);
        if (typeof showCardSkeleton === 'function') showCardSkeleton('paymentsMobileCards', 3);

        // Query without orderBy to avoid index requirement
        const snapshot = await db.collection('payments').get();

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

        // Sort by createdAt (newest first)
        allPayments.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });

        console.log('Payments loaded:', allPayments.length);

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

// Render Payments Table + Mobile Cards
function renderPayments(payments) {
    const tbody = document.getElementById('paymentsTable');
    const mobileCards = document.getElementById('paymentsMobileCards');

    if (payments.length === 0) {
        const emptyHTML = `
            <div class="empty-state" style="padding: 40px; text-align: center;">
                <span class="material-icons" style="font-size: 48px; color: #94a3b8;">receipt</span>
                <h3 style="margin-top: 12px;">No payments found</h3>
                <p style="color: #64748b;">Payment records will appear here</p>
            </div>
        `;
        tbody.innerHTML = `<tr><td colspan="6">${emptyHTML}</td></tr>`;
        if (mobileCards) mobileCards.innerHTML = emptyHTML;
        return;
    }

    // Desktop Table
    tbody.innerHTML = payments.map(payment => {
        const paymentDate = formatDate(payment.createdAt);

        const modeIcons = {
            'cash': '<span class="material-icons" style="color: #10B981; font-size: 18px; vertical-align: middle;">payments</span> Cash',
            'razorpay': '<span class="material-icons" style="color: #3B82F6; font-size: 18px; vertical-align: middle;">credit_card</span> Razorpay',
            'upi': '<span class="material-icons" style="color: #6C5CE7; font-size: 18px; vertical-align: middle;">smartphone</span> UPI',
            'bank': '<span class="material-icons" style="color: #64748b; font-size: 18px; vertical-align: middle;">account_balance</span> Bank'
        };

        return `
            <tr>
                <td><strong style="font-size: 0.8rem;">${payment.receiptNumber || '-'}</strong></td>
                <td>${payment.studentName || '-'}</td>
                <td style="color: #10B981; font-weight: 700;">${formatCurrency(payment.amount)}</td>
                <td>${modeIcons[payment.mode] || payment.mode}</td>
                <td><small style="color: #64748b;">${paymentDate}</small></td>
                <td>
                    <button class="btn btn-icon btn-outline" onclick="showQuickView('${payment.id}')" title="View Details">
                        <span class="material-icons" style="font-size: 18px;">visibility</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Mobile Cards
    if (mobileCards) {
        mobileCards.innerHTML = payments.map(payment => {
            const paymentDate = formatDate(payment.createdAt);

            const modeLabels = {
                'cash': 'Cash',
                'razorpay': 'Razorpay',
                'upi': 'UPI',
                'bank': 'Bank'
            };

            return `
                <div class="mobile-card" onclick="showQuickView('${payment.id}')" style="cursor: pointer;">
                    <div class="mobile-card-header">
                        <div>
                            <div class="mobile-card-name">${payment.studentName || '-'}</div>
                            <div class="mobile-card-sub">${payment.receiptNumber || '-'}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.1rem; font-weight: 700; color: #10B981;">${formatCurrency(payment.amount)}</div>
                        </div>
                    </div>
                    <div class="mobile-card-row">
                        <span>Mode</span>
                        <span>${modeLabels[payment.mode] || payment.mode}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span>Date</span>
                        <span>${paymentDate}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Quick View Payment - using ID lookup
function showQuickView(paymentId) {
    const payment = allPayments.find(p => p.id === paymentId);
    if (!payment) {
        console.error('Payment not found:', paymentId);
        return;
    }

    const paymentDate = formatDate(payment.createdAt);

    const paymentTime = payment.createdAt?.toDate?.()
        ? payment.createdAt.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : '';

    const modeLabels = {
        'cash': '💵 Cash',
        'razorpay': '💳 Razorpay',
        'upi': '📱 UPI',
        'bank': '🏦 Bank Transfer'
    };

    const content = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 64px; height: 64px; background: rgba(16, 185, 129, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                <span class="material-icons" style="font-size: 28px; color: #10B981;">receipt</span>
            </div>
            <h3 style="margin: 0 0 4px; color: #10B981;">${formatCurrency(payment.amount)}</h3>
            <p style="color: #64748b; margin: 0; font-size: 0.85rem;">${payment.receiptNumber || '-'}</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b;">Student</span>
                <span style="font-weight: 600;">${payment.studentName || '-'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b;">Amount</span>
                <span style="font-weight: 700; color: #10B981;">${formatCurrency(payment.amount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b;">Payment Mode</span>
                <span style="font-weight: 500;">${modeLabels[payment.mode] || payment.mode}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; ${payment.notes ? 'border-bottom: 1px solid #e2e8f0;' : ''}">
                <span style="color: #64748b;">Date</span>
                <span style="font-weight: 500;">${paymentDate}</span>
            </div>
            ${payment.notes ? `
            <div style="padding: 10px 0;">
                <span style="color: #64748b; display: block; margin-bottom: 4px;">Notes</span>
                <span style="font-weight: 500; font-size: 0.9rem;">${payment.notes}</span>
            </div>
            ` : ''}
        </div>
    `;

    document.getElementById('quickViewContent').innerHTML = content;
    document.getElementById('quickViewModal').classList.add('active');
}

function closeQuickView() {
    document.getElementById('quickViewModal').classList.remove('active');
}

// Close modal on overlay click
document.getElementById('quickViewModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'quickViewModal') {
        closeQuickView();
    }
});


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

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadPayments, 500);
});
