// Dashboard Logic - Migrated to Supabase

let allStudents = [];

// Set current date
document.getElementById('currentDate').textContent = formatDate(new Date());

async function loadDashboardData() {
    try {
        const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        allStudents = data;
        let totalRevenue = 0, totalPending = 0, fullyPaid = 0;

        allStudents.forEach(s => {
            totalRevenue += s.paid_amount || 0;
            const pending = (s.total_fee || 0) - (s.paid_amount || 0);
            totalPending += pending;
            if (pending <= 0) fullyPaid++;
        });

        document.getElementById('totalStudents').textContent = allStudents.length;
        document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
        document.getElementById('pendingAmount').textContent = formatCurrency(totalPending);
        document.getElementById('paidStudents').textContent = fullyPaid;

        updateRecentStudentsTable(allStudents.slice(0, 5));
    } catch (e) { showToast('Error loading dashboard', 'error'); }
}

function updateRecentStudentsTable(students) {
    const tbody = document.getElementById('recentStudentsTable');
    if (!tbody) return;
    tbody.innerHTML = students.map(s => {
        const pending = (s.total_fee || 0) - (s.paid_amount || 0);
        const statusClass = pending <= 0 ? 'paid' : (s.paid_amount > 0 ? 'partial' : 'pending');
        return `
            <tr>
                <td><strong>${s.name}</strong><br><small>${s.phone}</small></td>
                <td>${s.course}</td>
                <td>${formatCurrency(s.total_fee)}</td>
                <td style="color:#10B981">${formatCurrency(s.paid_amount)}</td>
                <td><span class="status-badge ${statusClass}">${statusClass.toUpperCase()}</span></td>
                <td><button class="btn btn-outline btn-sm" onclick='showQuickView(${JSON.stringify(s)})'><span class="material-icons">visibility</span></button></td>
            </tr>`;
    }).join('');
}

function showQuickView(s) {
    const pending = (s.total_fee || 0) - (s.paid_amount || 0);
    document.getElementById('quickViewContent').innerHTML = `
        <div style="text-align:center;">
            <h3>${s.name}</h3>
            <p>${s.course}</p>
            <p>Balance: ${formatCurrency(pending)}</p>
        </div>`;
    document.getElementById('quickViewModal').classList.add('active');
}

function formatCurrency(a) { return '₹' + (a || 0).toLocaleString('en-IN'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

window.showQuickView = showQuickView;
window.closeModal = closeModal;

document.addEventListener('DOMContentLoaded', loadDashboardData);
