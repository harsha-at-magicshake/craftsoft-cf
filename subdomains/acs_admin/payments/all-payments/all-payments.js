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

    // Bind events
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
                student_id,
                client_id,
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

        calculateStats();
        renderPayments();
    } catch (err) {
        console.error('Error loading payments:', err);
        window.AdminUtils.Toast.error('Error', 'Failed to load payments');
    } finally {
        document.getElementById('loading-state').style.display = 'none';
    }
}

// =====================
// Calculate Stats
// =====================
function calculateStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    let total = 0;
    let monthTotal = 0;
    let recentTotal = 0;

    payments.forEach(p => {
        const amount = parseFloat(p.amount_paid) || 0;
        const date = new Date(p.created_at);

        total += amount;
        if (date >= startOfMonth) monthTotal += amount;
        if (date >= sevenDaysAgo) recentTotal += amount;
    });

    document.getElementById('stats-total-revenue').innerHTML = `<i class="fa-solid fa-indian-rupee-sign"></i>${formatNumber(total)}`;
    document.getElementById('stats-month-revenue').innerHTML = `<i class="fa-solid fa-indian-rupee-sign"></i>${formatNumber(monthTotal)}`;
    document.getElementById('stats-recent-revenue').innerHTML = `<i class="fa-solid fa-indian-rupee-sign"></i>${formatNumber(recentTotal)}`;
}

// =====================
// Render Payments
// =====================
function renderPayments() {
    const cards = document.getElementById('payments-cards');
    const emptyState = document.getElementById('empty-state');
    const tableContainer = document.querySelector('.table-container');

    if (filteredPayments.length === 0) {
        cards.innerHTML = '';
        if (document.getElementById('payments-tbody')) document.getElementById('payments-tbody').innerHTML = '';
        emptyState.style.display = 'block';
        tableContainer.style.display = 'none';
        cards.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';

    // Check mobile state to toggle visibility correctly
    if (window.innerWidth <= 768) {
        tableContainer.style.display = 'none';
        cards.style.display = 'flex';
    } else {
        cards.style.display = 'none';
    }

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
                    <td><span class="cell-amount"><i class="fa-solid fa-indian-rupee-sign"></i>${formatNumber(p.amount_paid)}</span></td>
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
                <span class="card-amount"><i class="fa-solid fa-indian-rupee-sign"></i>${formatNumber(p.amount_paid)}</span>
            </div>
            <div class="card-body">
                <div class="card-info-row">
                    <span class="card-info-item">
                        <i class="fa-solid fa-user"></i> 
                        ${entityName} (${displayId})
                    </span>
                    <span class="card-info-item"><i class="fa-solid ${p.service_id ? 'fa-wrench' : 'fa-book'}"></i> ${itemName}</span>
                    <span class="card-info-item"><i class="fa-solid fa-hashtag"></i> ${p.reference_id || '-'}</span>
                </div>
            </div>
            <div class="card-footer">
                <span class="glass-tag ${p.payment_mode.toLowerCase()}">${p.payment_mode}</span>
                <span class="badge ${p.student_id ? 'badge-primary' : 'badge-info'}" style="font-size: 0.65rem;">${p.student_id ? 'COURSES' : 'SERVICES'}</span>
            </div>
        </div>
    `}).join('');

    // Update footer count
    const footer = document.getElementById('payments-footer');
    if (footer) {
        footer.innerHTML = `<span>Showing <strong>${paginatedPayments.length}</strong> of <strong>${filteredPayments.length}</strong> payments</span>`;
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
function formatNumber(num) {
    return (num || 0).toLocaleString('en-IN');
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
    const handleFilter = () => {
        const query = document.getElementById('search-input').value.toLowerCase();
        const mode = document.getElementById('filter-mode').value;
        const type = document.getElementById('filter-type').value;

        filteredPayments = payments.filter(p => {
            // Search match
            const entity = p.student || p.client;
            const entityName = entity ? `${entity.first_name} ${entity.last_name || ''}`.toLowerCase() : '';
            const displayId = (entity?.student_id || entity?.client_id || '').toLowerCase();
            const itemName = (p.course?.course_name || p.service?.name || '').toLowerCase();
            const ref = (p.reference_id || '').toLowerCase();

            const matchSearch = !query ||
                entityName.includes(query) ||
                displayId.includes(query) ||
                itemName.includes(query) ||
                ref.includes(query);

            // Mode match
            const matchMode = mode === 'all' || p.payment_mode === mode;

            // Type match
            const matchType = type === 'all' ||
                (type === 'course' && p.student_id) ||
                (type === 'service' && p.client_id);

            return matchSearch && matchMode && matchType;
        });

        currentPage = 1;
        renderPayments();
    };

    document.getElementById('search-input').addEventListener('input', handleFilter);
    document.getElementById('filter-mode').addEventListener('change', handleFilter);
    document.getElementById('filter-type').addEventListener('change', handleFilter);

    document.getElementById('filter-type').addEventListener('change', handleFilter);
}
