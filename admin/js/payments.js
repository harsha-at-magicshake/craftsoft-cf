// Payments Page Logic - Migrated to Supabase

let allPayments = [];

async function loadPayments() {
    try {
        if (typeof showTableSkeleton === 'function') showTableSkeleton('paymentsTable', 5, 5);

        // Fetch all payments with student names joined
        const { data, error } = await supabase
            .from('payments')
            .select('*, students(name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allPayments = data.map(p => ({
            id: p.id,
            amount: p.amount,
            mode: p.mode,
            receiptNumber: p.receipt_number,
            studentName: p.students?.name || 'Unknown Student',
            createdAt: p.created_at,
            notes: p.notes
        }));

        let total = 0, cash = 0, online = 0;
        allPayments.forEach(p => {
            total += p.amount;
            if (p.mode === 'cash') cash += p.amount;
            else online += p.amount;
        });

        document.getElementById('totalCollected').textContent = formatCurrency(total);
        document.getElementById('cashPayments').textContent = formatCurrency(cash);
        document.getElementById('onlinePayments').textContent = formatCurrency(online);

        renderPayments(allPayments);
    } catch (e) { console.error(e); showToast('Error loading payments', 'error'); }
}

function renderPayments(payments) {
    const tbody = document.getElementById('paymentsTable');
    if (!tbody) return;
    tbody.innerHTML = payments.map(p => `
        <tr>
            <td><strong>${p.receiptNumber || '-'}</strong></td>
            <td>${p.studentName}</td>
            <td style="color:#10B981; font-weight:700;">${formatCurrency(p.amount)}</td>
            <td>${p.mode}</td>
            <td><small>${formatDate(p.createdAt)}</small></td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="showQuickView('${p.id}')">
                    <span class="material-icons">visibility</span>
                </button>
            </td>
        </tr>`).join('');
}

function showQuickView(id) {
    const p = allPayments.find(pay => pay.id === id);
    if (!p) return;
    document.getElementById('quickViewContent').innerHTML = `
        <div style="text-align:center; padding:20px;">
            <h3>${formatCurrency(p.amount)}</h3>
            <p>${p.studentName}</p>
            <p style="color:#64748b;">${p.receiptNumber}</p>
            <hr style="margin:15px 0; border:0; border-top:1px solid #eee;">
            <p>Mode: ${p.mode}</p>
            <p>Date: ${formatDate(p.createdAt)}</p>
            ${p.notes ? `<p>Notes: ${p.notes}</p>` : ''}
        </div>`;
    document.getElementById('quickViewModal').classList.add('active');
}

function formatCurrency(a) { return '₹' + (a || 0).toLocaleString('en-IN'); }
function closeQuickView() { document.getElementById('quickViewModal').classList.remove('active'); }

window.showQuickView = showQuickView;
window.closeQuickView = closeQuickView;

document.addEventListener('DOMContentLoaded', loadPayments);
