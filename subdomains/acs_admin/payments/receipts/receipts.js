// Receipts List Module
let receipts = [];
let filteredReceipts = [];
let currentReceipt = null;
let currentPage = 1;
const itemsPerPage = window.innerWidth <= 768 ? 5 : 10;

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../../login.html';
        return;
    }

    // Initialize sidebar with correct page name
    AdminSidebar.init('receipts', '../../');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = window.AdminHeader.render('Receipts');
    }

    const currentAdmin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, currentAdmin);

    // Initial stats with count-up
    initializeStats();

    // Load receipts
    await loadReceipts();

    // Bind events
    bindEvents();
});

async function initializeStats() {
    window.AdminUtils.StatsHeader.render('stats-container', [
        { label: 'Total Receipts', value: 0, icon: 'fa-solid fa-file-invoice', color: 'var(--primary-500)' },
        { label: 'This Month Revenue', value: 0, icon: 'fa-solid fa-hand-holding-dollar', color: 'var(--success)', prefix: '₹' },
        { label: 'Today\'s Count', value: 0, icon: 'fa-regular fa-file-lines', color: 'var(--info)' }
    ]);

    try {
        const today = new Date().toISOString().split('T')[0];
        const monthStart = new Date();
        monthStart.setDate(1);
        const monthStartISO = monthStart.toISOString().split('T')[0];

        const [totalCount, monthData, todayCount] = await Promise.all([
            window.supabaseClient.from('receipts').select('receipt_id', { count: 'exact', head: true }),
            window.supabaseClient.from('receipts').select('amount_paid').gte('payment_date', monthStartISO),
            window.supabaseClient.from('receipts').select('receipt_id', { count: 'exact', head: true }).gte('payment_date', today)
        ]);

        const totalRevMonth = (monthData.data || []).reduce((sum, r) => sum + (r.amount_paid || 0), 0);

        window.AdminUtils.StatsHeader.render('stats-container', [
            { label: 'Total Receipts', value: totalCount.count || 0, icon: 'fa-solid fa-file-invoice', color: 'var(--primary-500)' },
            { label: 'This Month Rev', value: totalRevMonth, icon: 'fa-solid fa-hand-holding-dollar', color: 'var(--success)', prefix: '₹' },
            { label: 'Today\'s Receipts', value: todayCount.count || 0, icon: 'fa-regular fa-file-lines', color: 'var(--info)' }
        ]);
    } catch (err) {
        console.error('Stats load error:', err);
    }
}

// =====================
// Load Receipts
// =====================
async function loadReceipts() {
    try {
        const { data, error } = await window.supabaseClient
            .from('receipts')
            .select(`
                receipt_id,
                payment_id,
                amount_paid,
                payment_mode,
                reference_id,
                balance_due,
                payment_date,
                created_at,
                student:student_id (
                    id,
                    student_id,
                    first_name,
                    last_name,
                    phone
                ),
                client:client_id (
                    id,
                    client_id,
                    first_name,
                    last_name,
                    phone
                ),
                course:course_id (
                    id,
                    course_code,
                    course_name
                ),
                service:service_id (
                    id,
                    service_code,
                    name
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        receipts = data || [];
        filteredReceipts = receipts;

        renderReceipts();
    } catch (err) {
        console.error('Error loading receipts:', err);
        window.AdminUtils.Toast.error('Error', 'Failed to load receipts');
    } finally {
        document.getElementById('loading-state').style.display = 'none';
    }
}

// =====================
// Render Receipts
// =====================
function renderReceipts() {
    const cards = document.getElementById('receipts-cards');
    const emptyState = document.getElementById('empty-state');

    if (filteredReceipts.length === 0) {
        cards.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedReceipts = filteredReceipts.slice(start, start + itemsPerPage);

    // Desktop Table Rendering
    const tbody = document.getElementById('receipts-tbody');
    if (tbody) {
        tbody.innerHTML = paginatedReceipts.map(r => {
            const entity = r.student || r.client;
            const entityName = entity ? `${entity.first_name} ${entity.last_name || ''}` : 'Unknown';
            const displayId = entity ? (entity.student_id || entity.client_id || '-') : '-';
            const itemName = r.course?.course_name || r.service?.name || 'Unknown Item';
            return `
                <tr>
                    <td><span class="cell-badge">${r.receipt_id}</span></td>
                    <td>
                        <div class="student-cell">
                            <span class="cell-title">${entityName}</span>
                            <span class="cell-id-small">${displayId}</span>
                        </div>
                    </td>
                    <td><span class="cell-title">${itemName}</span></td>
                    <td><span class="cell-amount">${formatCurrency(r.amount_paid)}</span></td>
                    <td><span class="glass-tag ${r.payment_mode.toLowerCase()}">${r.payment_mode}</span></td>
                    <td class="text-right">
                        <div class="cell-actions">
                            <button class="action-btn" onclick="viewReceipt('${r.receipt_id}')" title="View"><i class="fa-solid fa-eye"></i></button>
                            <button class="action-btn" onclick="downloadReceipt('${r.receipt_id}')" title="Download"><i class="fa-solid fa-download"></i></button>
                            <button class="action-btn whatsapp" onclick="sendWhatsApp('${r.receipt_id}')" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Cards layout (Mobile/Tablet)
    cards.innerHTML = paginatedReceipts.map(r => {
        const entity = r.student || r.client;
        const entityName = entity ? `${entity.first_name} ${entity.last_name || ''}` : 'Unknown';
        const displayId = entity ? (entity.student_id || entity.client_id || '-') : '-';
        const itemName = r.course?.course_name || r.service?.name || 'Unknown Item';
        return `
        <div class="premium-card">
            <div class="card-header">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span class="card-id-badge">${r.receipt_id}</span>
                    <span style="font-size: 0.75rem; color: var(--admin-text-muted);">${formatDate(r.payment_date || r.created_at)}</span>
                </div>
                <div class="card-header-right">
                    <span class="glass-tag ${r.payment_mode.toLowerCase()}">${r.payment_mode}</span>
                    <span class="card-amount">${formatCurrency(r.amount_paid)}</span>
                </div>
            </div>
            <div class="card-body">
                <div class="card-info-row">
                    <span class="card-info-item">
                        <i class="fa-solid fa-user"></i> 
                        ${entityName} (${displayId})
                    </span>
                    <span class="card-info-item"><i class="fa-solid fa-book"></i> ${itemName}</span>
                    <span class="card-info-item ${r.balance_due <= 0 ? 'text-success' : 'text-danger'}">
                        <i class="fa-solid fa-coins"></i> ${r.balance_due <= 0 ? 'Fully Paid' : `Due: ${formatCurrency(r.balance_due)}`}
                    </span>
                </div>
            </div>
            <div class="card-actions">
                <button class="card-action-btn edit" onclick="viewReceipt('${r.receipt_id}')">
                    <i class="fa-solid fa-eye"></i> <span>View</span>
                </button>
                <button class="card-action-btn pdf" onclick="downloadReceipt('${r.receipt_id}')">
                    <i class="fa-solid fa-download"></i> <span>PDF</span>
                </button>
                <button class="card-action-btn whatsapp" onclick="sendWhatsApp('${r.receipt_id}')">
                    <i class="fa-brands fa-whatsapp"></i> <span>Chat</span>
                </button>
            </div>
        </div>
    `}).join('');

    // Update footer count
    const footer = document.getElementById('receipts-footer');
    if (footer) {
        footer.innerHTML = `<span>Total Receipts: <strong>${filteredReceipts.length}</strong></span>`;
        footer.style.display = 'block';
    }

    // Render pagination
    window.AdminUtils.Pagination.render('pagination-container', filteredReceipts.length, currentPage, itemsPerPage, (page) => {
        currentPage = page;
        renderReceipts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// =====================
// View Receipt - Professional Design
// =====================
async function viewReceipt(receiptId) {
    currentReceipt = receipts.find(r => r.receipt_id === receiptId);
    if (!currentReceipt) return;

    const { Toast } = window.AdminUtils;
    const isSrv = !!currentReceipt.service;
    const entity = currentReceipt.student || currentReceipt.client;
    const table = isSrv ? 'clients' : 'students';
    const idCol = isSrv ? 'client_id' : 'student_id';
    const itemIdCol = isSrv ? 'service_id' : 'course_id';
    const item = isSrv ? currentReceipt.service : currentReceipt.course;

    const content = document.getElementById('receipt-content');
    content.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
    document.getElementById('receipt-modal').classList.add('active');

    try {
        // Get payment history for this item
        const { data: history, error: hErr } = await window.supabaseClient
            .from('receipts')
            .select('amount_paid, payment_date, reference_id, payment_mode')
            .eq(idCol, entity?.id)
            .eq(itemIdCol, item?.id)
            .order('payment_date', { ascending: true });

        if (hErr) throw hErr;

        // Get fee info
        const { data: record } = await window.supabaseClient
            .from(table)
            .select(isSrv ? 'service_fees, total_fee' : 'course_discounts, final_fee')
            .eq('id', entity?.id)
            .single();

        let totalItemFee = 0;
        if (isSrv) {
            totalItemFee = (record?.service_fees || {})[item.service_code || item.code] || 0;
            if (!totalItemFee) totalItemFee = currentReceipt.amount_paid + (currentReceipt.balance_due || 0);
        } else {
            const { data: courseData } = await window.supabaseClient.from('courses').select('fee').eq('id', item.id).single();
            const discount = (record?.course_discounts || {})[item.course_code] || 0;
            totalItemFee = (courseData?.fee || 0) - discount;
        }

        const totalPaidForItem = history.reduce((sum, r) => sum + (r.amount_paid || 0), 0);
        const pendingForItem = Math.max(0, totalItemFee - totalPaidForItem);

        // Status calculation
        let statusText = 'Due';
        let statusClass = 'status-due';
        if (pendingForItem <= 0) {
            statusText = 'Fully Paid';
            statusClass = 'status-paid';
        } else if (totalPaidForItem > 0) {
            const pct = Math.round((totalPaidForItem / totalItemFee) * 100);
            statusText = `Partial (${pct}%)`;
            statusClass = 'status-partial';
        }

        // Global summary
        const { data: allReceipts } = await window.supabaseClient
            .from('receipts')
            .select('amount_paid')
            .eq(idCol, entity?.id);
        const globalPaid = (allReceipts || []).reduce((sum, r) => sum + (r.amount_paid || 0), 0);
        const globalTotal = isSrv ? (record?.total_fee || 0) : (record?.final_fee || 0);
        const globalPending = Math.max(0, globalTotal - globalPaid);

        const entityName = entity ? `${entity.first_name} ${entity.last_name || ''}` : 'Unknown';
        const entityId = entity?.student_id || entity?.client_id || '-';
        const itemName = item?.name || item?.course_name || 'Unknown Item';

        // Build history rows
        const historyRows = history.map((h, idx) => {
            const isLatest = idx === history.length - 1;
            return `<tr class="${isLatest ? 'latest' : ''}">
                <td>${formatDate(h.payment_date)}</td>
                <td>${h.payment_mode === 'CASH' ? 'Cash' : 'UPI'} - ${h.reference_id || '-'}</td>
                <td style="text-align:right">₹ ${h.amount_paid.toLocaleString('en-IN')}</td>
            </tr>`;
        }).join('');

        content.innerHTML = `
            <div class="receipt-view" id="receipt-printable">
                <div class="receipt-watermark"></div>
                <div class="receipt-content">
                    <div class="receipt-headline">Payment receipt</div>

                    <div class="receipt-brand-container">
                        <div class="receipt-accent-bar"></div>
                        <div class="receipt-header-main">
                            <div class="receipt-brand-info">
                                <h1>Abhi's Craftsoft</h1>
                                <p>Plot no. 163, Vijayasree Colony,<br>Vanasthalipuram, Hyderabad 500070</p>
                                <div class="receipt-contact-row">+91-7842239090 | https://www.craftsoft.co.in</div>
                            </div>
                            <div class="receipt-meta-info">
                                <p>Date: <strong>${formatDate(currentReceipt.payment_date || currentReceipt.created_at)}</strong></p>
                                <p>Receipt No: <strong>${currentReceipt.receipt_id}</strong></p>
                            </div>
                        </div>
                    </div>

                    <div class="receipt-customer-section">
                        <div class="receipt-issue-to">
                            <span>Issued To</span>
                            <h3>${entityName}</h3>
                        </div>
                        <div class="receipt-id-box">
                            <span>${isSrv ? 'Client ID' : 'Student ID'}</span>
                            <strong>${entityId}</strong>
                        </div>
                    </div>

                    <div class="receipt-section-header">Account & Payment Overview</div>
                    <table class="receipt-main-table">
                        <thead>
                            <tr>
                                <th width="50%">Item Description</th>
                                <th>Total Fee</th>
                                <th>Paid</th>
                                <th style="text-align:right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${itemName}</td>
                                <td>₹ ${totalItemFee.toLocaleString('en-IN')}</td>
                                <td>${totalPaidForItem > 0 ? '₹ ' + totalPaidForItem.toLocaleString('en-IN') : '--'}</td>
                                <td style="text-align:right"><span class="${statusClass}">${statusText}</span></td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="receipt-section-header">Payment History</div>
                    <table class="receipt-history-table">
                        <tbody>
                            ${historyRows || '<tr><td colspan="3">No history available</td></tr>'}
                        </tbody>
                    </table>

                    <div class="receipt-summary-box">
                        <div class="summary-row">
                            <span class="label">Item Total</span>
                            <span class="val">₹ ${totalItemFee.toLocaleString('en-IN')}</span>
                        </div>
                        <div class="summary-row accented">
                            <span class="label">Amount Paid</span>
                            <span class="val">₹ ${totalPaidForItem.toLocaleString('en-IN')}</span>
                        </div>
                        <div class="summary-divider"></div>
                        <div class="summary-row total-due">
                            <span class="label">Balance Due</span>
                            <span class="val">₹ ${pendingForItem.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    <div class="receipt-footer">
                        <p class="receipt-footer-note">This is a system-generated secure receipt and does not require a physical signature.</p>
                        <p class="receipt-footer-note">Abhi's Craftsoft © ${new Date().getFullYear()} | https://www.craftsoft.co.in</p>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        Toast.error('Load Error', 'Failed to fetch receipt details');
        closeReceiptModal();
    }
}

// =====================
// Download Receipt as PDF
// =====================
async function downloadReceipt(receiptId) {
    const receipt = receipts.find(r => r.receipt_id === receiptId);
    if (!receipt) return;

    const { Toast } = window.AdminUtils;
    Toast.info('Generating', 'Creating PDF...');

    try {
        viewReceipt(receiptId);
        await new Promise(resolve => setTimeout(resolve, 300));

        const element = document.getElementById('receipt-printable');
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        pdf.save(`Receipt-${receiptId}.pdf`);

        Toast.success('Downloaded', 'Receipt PDF saved');
        closeReceiptModal();
    } catch (err) {
        console.error('PDF generation error:', err);
        Toast.error('Error', 'Failed to generate PDF');
    }
}

// =====================
// Send WhatsApp Message
// =====================
function sendWhatsApp(receiptId) {
    const receipt = receipts.find(r => r.receipt_id === receiptId);
    if (!receipt) return;

    const entity = receipt.student || receipt.client;
    const phone = entity?.phone;
    if (!phone) {
        window.AdminUtils.Toast.error('No Phone', 'Representative phone number not available');
        return;
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('91')) formattedPhone = '91' + formattedPhone;

    const name = entity ? `${entity.first_name} ${entity.last_name || ''}`.trim() : 'Customer';
    const itemName = receipt.course?.course_name || receipt.service?.name || 'Item';
    const amount = formatCurrency(receipt.amount_paid);
    const balance = receipt.balance_due <= 0 ? 'Rs.0' : formatCurrency(receipt.balance_due);

    const message = `Hi ${name},

We have received ${amount} for ${itemName}.
Receipt ID: ${receipt.receipt_id}
Balance Due: ${balance}

â€“ Abhi's Craftsoft`;

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
}

function closeReceiptModal() {
    document.getElementById('receipt-modal').classList.remove('active');
    currentReceipt = null;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return 'â€”';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function bindEvents() {
    const handleFilter = () => {
        const searchInput = document.getElementById('search-input');
        const filterDateFrom = document.getElementById('filter-date-from');
        const filterDateTo = document.getElementById('filter-date-to');

        const query = searchInput ? searchInput.value.toLowerCase() : '';
        const dateFrom = filterDateFrom ? filterDateFrom.value : '';
        const dateTo = filterDateTo ? filterDateTo.value : '';

        filteredReceipts = receipts.filter(r => {
            // Search Match
            const entity = r.student || r.client;
            const entityName = entity ? `${entity.first_name} ${entity.last_name || ''}`.toLowerCase() : '';
            const displayId = (entity?.student_id || entity?.client_id || '').toLowerCase();
            const itemName = (r.course?.course_name || r.service?.name || '').toLowerCase();
            const receiptId = (r.receipt_id || '').toLowerCase();

            const matchSearch = !query ||
                entityName.includes(query) ||
                displayId.includes(query) ||
                itemName.includes(query) ||
                receiptId.includes(query);

            // Date Match
            const pDate = (r.payment_date || new Date(r.created_at).toISOString().split('T')[0]);
            const matchDate = (!dateFrom || pDate >= dateFrom) && (!dateTo || pDate <= dateTo);

            return matchSearch && matchDate;
        });

        currentPage = 1;
        renderReceipts();
    };

    document.getElementById('search-input')?.addEventListener('input', handleFilter);
    document.getElementById('filter-date-from')?.addEventListener('change', handleFilter);
    document.getElementById('filter-date-to')?.addEventListener('change', handleFilter);

    // Reset button
    document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        handleFilter();
    });

    document.getElementById('close-receipt-modal')?.addEventListener('click', closeReceiptModal);
    document.getElementById('receipt-cancel-btn')?.addEventListener('click', closeReceiptModal);
    document.getElementById('receipt-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'receipt-modal') closeReceiptModal();
    });

    document.getElementById('receipt-download-btn')?.addEventListener('click', () => {
        // Disabled for now
        // if (currentReceipt) downloadReceipt(currentReceipt.receipt_id);
    });
}

