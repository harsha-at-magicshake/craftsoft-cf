// All Payments List Module
let payments = [];
let filteredPayments = [];
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../../login.html';
        return;
    }

    // Initialize sidebar with correct page name
    AdminSidebar.init('all-payments', '../../');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('All Payments');
    }

    const currentAdmin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, currentAdmin);

    // Load payments
    await loadPayments();

    // Bind search
    bindEvents();
});

// =====================
// Load Payments
// =====================
async function loadPayments() {
    try {
        const { data, error } = await window.supabaseClient
            .from('payments')
            .select(`
                id,
                amount_paid,
                payment_mode,
                reference_id,
                status,
                created_at,
                student:student_id (
                    id,
                    first_name,
                    last_name
                ),
                course:course_id (
                    id,
                    course_name
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        payments = data || [];
        filteredPayments = payments;

        renderPayments();
    } catch (err) {
        console.error('Error loading payments:', err);
        window.AdminUtils.Toast.error('Error', 'Failed to load payments');
    } finally {
        document.getElementById('loading-state').style.display = 'none';
    }
}

// =====================
// Render Payments
// =====================
function renderPayments() {
    const tbody = document.getElementById('payments-tbody');
    const cards = document.getElementById('payments-cards');
    const emptyState = document.getElementById('empty-state');

    if (filteredPayments.length === 0) {
        tbody.innerHTML = '';
        cards.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedPayments = filteredPayments.slice(start, start + itemsPerPage);

    // Desktop table
    tbody.innerHTML = paginatedPayments.map(p => `
        <tr>
            <td>${formatDate(p.created_at)}</td>
            <td>${p.student ? `${p.student.first_name} ${p.student.last_name}` : 'Unknown'}</td>
            <td>${p.course?.course_name || 'Unknown'}</td>
            <td class="amount-cell">${formatCurrency(p.amount_paid)}</td>
            <td>
                <span class="mode-badge ${p.payment_mode.toLowerCase()}">
                    <i class="fa-solid ${p.payment_mode === 'CASH' ? 'fa-money-bill-wave' : 'fa-credit-card'}"></i>
                    ${p.payment_mode}
                </span>
            </td>
            <td class="reference-cell">${p.reference_id}</td>
        </tr>
    `).join('');

    // Mobile cards
    cards.innerHTML = paginatedPayments.map(p => `
        <div class="payment-card">
            <div class="payment-card-header">
                <span class="payment-card-student">${p.student ? `${p.student.first_name} ${p.student.last_name}` : 'Unknown'}</span>
                <span class="payment-card-amount">${formatCurrency(p.amount_paid)}</span>
            </div>
            <div class="payment-card-details">
                <span><i class="fa-solid fa-book"></i> ${p.course?.course_name || 'Unknown'}</span>
                <span class="reference-cell">${p.reference_id}</span>
            </div>
            <div class="payment-card-footer">
                <span class="payment-card-date">${formatDate(p.created_at)}</span>
                <span class="mode-badge ${p.payment_mode.toLowerCase()}">
                    ${p.payment_mode}
                </span>
            </div>
        </div>
    `).join('');

    // Update footer count
    const footer = document.getElementById('payments-footer');
    if (footer) {
        footer.innerHTML = `<span>Total Payments: <strong>${filteredPayments.length}</strong></span>`;
        footer.style.display = 'block';
    }

    // Render pagination
    window.AdminUtils.Pagination.render('pagination-container', filteredPayments.length, currentPage, itemsPerPage, (page) => {
        currentPage = page;
        renderPayments();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// =====================
// Format Helpers
// =====================
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// =====================
// Bind Events
// =====================
function bindEvents() {
    // Search
    document.getElementById('search-input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();

        if (!query) {
            filteredPayments = payments;
        } else {
            filteredPayments = payments.filter(p =>
                (p.student ? `${p.student.first_name} ${p.student.last_name}`.toLowerCase().includes(query) : false) ||
                p.course?.course_name?.toLowerCase().includes(query) ||
                p.reference_id?.toLowerCase().includes(query)
            );
        }

        renderPayments();
    });
}
