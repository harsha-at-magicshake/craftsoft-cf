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
                    student_id,
                    first_name,
                    last_name
                ),
                client:client_id (
                    id,
                    client_id,
                    first_name,
                    last_name
                ),
                course:course_id (
                    id,
                    course_name
                ),
                service:service_id (
                    id,
                    name
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
    const cards = document.getElementById('payments-cards');
    const emptyState = document.getElementById('empty-state');

    if (filteredPayments.length === 0) {
        cards.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedPayments = filteredPayments.slice(start, start + itemsPerPage);

    // Desktop Table Rendering
    const tbody = document.getElementById('payments-tbody');
    if (tbody) {
        tbody.innerHTML = paginatedPayments.map(p => {
            const entity = p.student || p.client;
            const entityName = entity ? `${entity.first_name} ${entity.last_name || ''}` : 'Unknown';
            const displayId = entity ? (entity.student_id || entity.client_id || '-') : '-';
            const itemName = p.course?.course_name || p.service?.name || 'Unknown';
            return `
                <tr>
                    <td><span class="cell-badge">${formatDate(p.created_at)}</span></td>
                    <td>
                        <div class="student-cell">
                            <span class="cell-title">${entityName}</span>
                            <span class="cell-id-small">${displayId}</span>
                        </div>
                    </td>
                    <td><span class="cell-title">${itemName}</span></td>
                    <td><span class="cell-amount">${formatCurrency(p.amount_paid)}</span></td>
                    <td class="text-right"><span class="cell-badge">${p.reference_id || '-'}</span></td>
                </tr>
            `;
        }).join('');
    }

    // Cards layout (Mobile/Tablet)
    cards.innerHTML = paginatedPayments.map(p => {
        const entity = p.student || p.client;
        const entityName = entity ? `${entity.first_name} ${entity.last_name || ''}` : 'Unknown';
        const displayId = entity ? (entity.student_id || entity.client_id || '-') : '-';
        const itemName = p.course?.course_name || p.service?.name || 'Unknown';
        return `
        <div class="premium-card">
            <div class="card-header">
                <span class="card-id-badge">${formatDate(p.created_at)}</span>
                <span class="card-amount">${formatCurrency(p.amount_paid)}</span>
            </div>
            <div class="card-body">
                <div class="card-info-row">
                    <span class="card-info-item">
                        <i class="fa-solid fa-user"></i> 
                        ${entityName} (${displayId})
                    </span>
                    <span class="card-info-item"><i class="fa-solid ${p.service_id ? 'fa-wrench' : 'fa-book'}"></i> ${itemName}</span>
                    <span class="card-info-item"><i class="fa-solid fa-hashtag"></i> ${p.reference_id}</span>
                </div>
            </div>
            <div class="card-footer">
                <span class="glass-tag ${p.payment_mode.toLowerCase()}">${p.payment_mode}</span>
            </div>
        </div>
    `}).join('');

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
            filteredPayments = payments.filter(p => {
                const entity = p.student || p.client;
                const entityName = entity ? `${entity.first_name} ${entity.last_name || ''}`.toLowerCase() : '';
                const displayId = (entity?.student_id || entity?.client_id || '').toLowerCase();
                const itemName = (p.course?.course_name || p.service?.name || '').toLowerCase();
                const ref = (p.reference_id || '').toLowerCase();

                return entityName.includes(query) ||
                    displayId.includes(query) ||
                    itemName.includes(query) ||
                    ref.includes(query);
            });
        }

        renderPayments();
    });
}
