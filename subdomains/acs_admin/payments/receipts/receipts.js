// Receipts List Module
let receipts = [];
let filteredReceipts = [];
let currentReceipt = null;
let currentPage = 1;
const itemsPerPage = window.innerWidth <= 1100 ? 5 : 10;

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
                <button class="card-action-btn pdf" onclick="showDownloadConfirm('${r.receipt_id}')">
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
// View Receipt - Simple Skeleton Design
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
        const { data: history } = await window.supabaseClient
            .from('receipts')
            .select('amount_paid')
            .eq(idCol, entity?.id)
            .eq(itemIdCol, item?.id);

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

        const totalPaidForItem = (history || []).reduce((sum, r) => sum + (r.amount_paid || 0), 0);
        const pendingForItem = Math.max(0, totalItemFee - totalPaidForItem);

        const entityName = entity ? `${entity.first_name} ${entity.last_name || ''}` : 'Unknown';
        const entityId = entity?.student_id || entity?.client_id || '-';
        const itemName = item?.name || item?.course_name || 'Unknown Item';

        content.innerHTML = `
            <div class="receipt-simple" id="receipt-printable">
                <div class="receipt-header-bar">
                    <h2>ABHI'S CRAFTSOFT</h2>
                </div>

                <div class="receipt-body">
                    <div class="receipt-row">
                        <span>Receipt</span>
                        <strong>${currentReceipt.receipt_id}</strong>
                    </div>
                    <div class="receipt-row">
                        <span>Date</span>
                        <strong>${formatDate(currentReceipt.payment_date || currentReceipt.created_at)}</strong>
                    </div>

                    <div class="receipt-divider"></div>

                    <div class="receipt-row">
                        <span>${isSrv ? 'Client' : 'Student'}</span>
                        <strong>${entityName} (${entityId})</strong>
                    </div>
                    <div class="receipt-row">
                        <span>${isSrv ? 'Service' : 'Course'}</span>
                        <strong>${itemName}</strong>
                    </div>

                    <div class="receipt-divider"></div>

                    <div class="receipt-row">
                        <span>Total</span>
                        <strong>₹ ${totalItemFee.toLocaleString('en-IN')}</strong>
                    </div>
                    <div class="receipt-row highlight">
                        <span>Paid</span>
                        <strong>₹ ${totalPaidForItem.toLocaleString('en-IN')}</strong>
                    </div>
                    <div class="receipt-row ${pendingForItem > 0 ? 'due' : 'paid'}">
                        <span>Balance</span>
                        <strong>₹ ${pendingForItem.toLocaleString('en-IN')}</strong>
                    </div>

                    <div class="receipt-divider"></div>

                    <div class="receipt-row">
                        <span>Mode</span>
                        <strong>${currentReceipt.payment_mode === 'CASH' ? 'CASH' : 'UPI'}</strong>
                    </div>
                    <div class="receipt-row">
                        <span>Ref ID</span>
                        <strong style="font-family: monospace; font-size: 0.85em;">${currentReceipt.reference_id || '-'}</strong>
                    </div>
                </div>

                <div class="receipt-footer-bar">
                    <p>-- System Generated --</p>
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
// Download Receipt as PDF - Professional Layout from EXECUTIVE_RECEIPT_DEMO
// =====================
async function downloadReceipt(receiptId) {
    const receipt = receipts.find(r => r.receipt_id === receiptId);
    if (!receipt) return;

    const { Toast } = window.AdminUtils;
    Toast.info('Generating', 'Creating PDF...');

    try {
        const isSrv = !!receipt.service;
        const entity = receipt.student || receipt.client;
        const item = isSrv ? receipt.service : receipt.course;
        const table = isSrv ? 'clients' : 'students';
        const idCol = isSrv ? 'client_id' : 'student_id';
        const itemIdCol = isSrv ? 'service_id' : 'course_id';

        // Get payment history
        const { data: history } = await window.supabaseClient
            .from('receipts')
            .select('amount_paid, payment_date, reference_id, payment_mode')
            .eq(idCol, entity?.id)
            .eq(itemIdCol, item?.id)
            .order('payment_date', { ascending: true });

        // Get fee info
        const { data: record } = await window.supabaseClient
            .from(table)
            .select(isSrv ? 'service_fees, total_fee' : 'course_discounts, final_fee')
            .eq('id', entity?.id)
            .single();

        let totalItemFee = 0;
        if (isSrv) {
            totalItemFee = (record?.service_fees || {})[item.service_code || item.code] || 0;
            if (!totalItemFee) totalItemFee = receipt.amount_paid + (receipt.balance_due || 0);
        } else {
            const { data: courseData } = await window.supabaseClient.from('courses').select('fee').eq('id', item.id).single();
            const discount = (record?.course_discounts || {})[item.course_code] || 0;
            totalItemFee = (courseData?.fee || 0) - discount;
        }

        const totalPaidForItem = (history || []).reduce((sum, r) => sum + (r.amount_paid || 0), 0);
        const pendingForItem = Math.max(0, totalItemFee - totalPaidForItem);

        const entityName = entity ? `${entity.first_name} ${entity.last_name || ''}` : 'Unknown';
        const entityId = entity?.student_id || entity?.client_id || '-';
        const itemName = item?.name || item?.course_name || 'Unknown Item';

        // Status
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

        // Build history rows
        const historyRows = (history || []).map((h, idx) => {
            const isLatest = idx === history.length - 1;
            return `<tr class="${isLatest ? 'latest' : ''}">
                <td>${formatDate(h.payment_date)}</td>
                <td>${h.payment_mode === 'CASH' ? 'Cash' : 'UPI'} - ${h.reference_id || '-'}</td>
                <td style="text-align:right">₹ ${h.amount_paid.toLocaleString('en-IN')}</td>
            </tr>`;
        }).join('');

        // Create hidden container with professional design
        const pdfContainer = document.createElement('div');
        pdfContainer.id = 'pdf-receipt-container';
        pdfContainer.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 800px; background: white;';
        pdfContainer.innerHTML = `
            <style>
                #pdf-receipt-container * { font-family: 'Tahoma', Arial, sans-serif; box-sizing: border-box; }
                .pdf-wrap { padding: 50px; padding-bottom: 100px; background: white; min-height: 1100px; position: relative; overflow: hidden; }
                .pdf-watermark { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 1; opacity: 0.03; background-image: url("data:image/svg+xml,%3Csvg width='200' height='120' viewBox='0 0 200 120' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' fill='%2364748b' font-family='monospace' font-size='10' text-anchor='middle' transform='rotate(-25 100 60)'%3ECRAFTSOFT SECURE CRAFTSOFT%3C/text%3E%3C/svg%3E"); background-repeat: repeat; }
                .pdf-content { position: relative; z-index: 2; }
                .pdf-headline { font-size: 22px; font-weight: bold; color: #2896cd; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 1.5px solid #f1f5f9; }
                .pdf-brand { position: relative; padding-left: 20px; margin-bottom: 50px; }
                .pdf-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: #e0f2fe; border-left: 3px solid #2896cd; }
                .pdf-header { display: flex; justify-content: space-between; }
                .pdf-brand h1 { font-size: 26px; margin: 0; color: #0f172a; }
                .pdf-brand p { font-size: 11px; margin: 6px 0; color: #64748b; }
                .pdf-contact { font-size: 11px; font-weight: bold; color: #2896cd; margin-top: 10px; }
                .pdf-meta { text-align: right; font-size: 13px; }
                .pdf-meta p { margin: 8px 0; }
                .pdf-meta strong { color: #0f172a; }
                .pdf-customer { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9; }
                .pdf-issue span { font-size: 10px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px; }
                .pdf-issue h3 { margin: 0; font-size: 20px; color: #0f172a; }
                .pdf-idbox { text-align: right; padding: 10px 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; }
                .pdf-idbox span { font-size: 9px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px; }
                .pdf-idbox strong { font-size: 14px; color: #2896cd; }
                .pdf-section { font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 15px; text-transform: uppercase; }
                .pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .pdf-table th { text-align: left; padding: 12px; font-size: 11px; color: #64748b; border-bottom: 2px solid #eee; text-transform: uppercase; }
                .pdf-table td { padding: 15px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
                .status-paid { color: #16a34a; font-weight: bold; font-size: 10px; text-transform: uppercase; }
                .status-partial { color: #2896cd; font-weight: bold; font-size: 10px; text-transform: uppercase; }
                .status-due { color: #ef4444; font-weight: bold; font-size: 10px; text-transform: uppercase; }
                .pdf-history td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #f9f9f9; }
                .pdf-history .latest { background: #fcfdfe; font-weight: bold; }
                .pdf-summary { margin-top: 30px; margin-left: auto; width: 320px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 25px; }
                .pdf-sum-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
                .pdf-sum-row .label { color: #0f172a; font-weight: bold; }
                .pdf-sum-row .val { color: #0f172a; font-weight: bold; }
                .pdf-sum-row.accented .label, .pdf-sum-row.accented .val { color: #2896cd; }
                .pdf-divider { height: 1px; background: #eee; margin: 15px 0; }
                .pdf-sum-row.due .label { font-size: 16px; }
                .pdf-sum-row.due .val { font-size: 18px; color: #2896cd; }
                .pdf-footer { position: absolute; bottom: 30px; left: 50px; right: 50px; text-align: center; padding-top: 20px; border-top: 1px dashed #ddd; z-index: 2; }
                .pdf-footer p { font-size: 10px; color: #64748b; margin: 3px 0; }
            </style>
            <div class="pdf-wrap">
                <div class="pdf-watermark"></div>
                <div class="pdf-content">
                <div class="pdf-headline">Payment receipt</div>
                <div class="pdf-brand">
                    <div class="pdf-accent"></div>
                    <div class="pdf-header">
                        <div>
                            <h1>Abhi's Craftsoft</h1>
                            <p>Plot no. 163, Vijayasree Colony,<br>Vanasthalipuram, Hyderabad 500070</p>
                            <div class="pdf-contact">+91-7842239090 | https://www.craftsoft.co.in</div>
                        </div>
                        <div class="pdf-meta">
                            <p>Date: <strong>${formatDate(receipt.payment_date || receipt.created_at)}</strong></p>
                            <p>Receipt No: <strong>${receipt.receipt_id}</strong></p>
                        </div>
                    </div>
                </div>
                <div class="pdf-customer">
                    <div class="pdf-issue">
                        <span>Issued To</span>
                        <h3>${entityName}</h3>
                    </div>
                    <div class="pdf-idbox">
                        <span>${isSrv ? 'Client ID' : 'Student ID'}</span>
                        <strong>${entityId}</strong>
                    </div>
                </div>
                <div class="pdf-section">Account & Payment Overview</div>
                <table class="pdf-table">
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
                <div class="pdf-section">Payment History</div>
                <table class="pdf-table pdf-history">
                    <tbody>
                        ${historyRows || '<tr><td colspan="3">No history</td></tr>'}
                    </tbody>
                </table>
                <div class="pdf-summary">
                    <div class="pdf-sum-row">
                        <span class="label">Total Fee</span>
                        <span class="val">₹ ${totalItemFee.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="pdf-sum-row accented">
                        <span class="label">Amount Paid</span>
                        <span class="val">₹ ${totalPaidForItem.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="pdf-divider"></div>
                    <div class="pdf-sum-row due">
                        <span class="label">Balance Due</span>
                        <span class="val">₹ ${pendingForItem.toLocaleString('en-IN')}</span>
                    </div>
                    </div>
                </div>
            </div>
            </div>
            <div class="pdf-footer">
                <p>This is a system-generated secure receipt and does not require a physical signature.</p>
                <p>Abhi's Craftsoft © ${new Date().getFullYear()} | https://www.craftsoft.co.in</p>
            </div>
        `;

        document.body.appendChild(pdfContainer);
        await new Promise(resolve => setTimeout(resolve, 200));

        const canvas = await html2canvas(pdfContainer, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        document.body.removeChild(pdfContainer);

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
        Toast.error('Error', 'Failed to generate PDF: ' + err.message);
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

    // Receipt View Modal
    document.getElementById('close-receipt-modal')?.addEventListener('click', closeReceiptModal);
    document.getElementById('receipt-cancel-btn')?.addEventListener('click', closeReceiptModal);
    document.getElementById('receipt-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'receipt-modal') closeReceiptModal();
    });

    // Download Confirmation Modal
    document.getElementById('close-download-modal')?.addEventListener('click', closeDownloadModal);
    document.getElementById('download-cancel-btn')?.addEventListener('click', closeDownloadModal);
    document.getElementById('download-confirm-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'download-confirm-modal') closeDownloadModal();
    });
    document.getElementById('download-confirm-btn')?.addEventListener('click', () => {
        const receiptId = document.getElementById('download-receipt-id').dataset.receiptId;
        if (receiptId) {
            closeDownloadModal();
            downloadReceipt(receiptId);
        }
    });
}

// Show download confirmation modal (mobile only to prevent mistouches)
function showDownloadConfirm(receiptId) {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Show confirmation modal on mobile
        document.getElementById('download-receipt-id').textContent = receiptId;
        document.getElementById('download-receipt-id').dataset.receiptId = receiptId;
        document.getElementById('download-confirm-modal').classList.add('active');
    } else {
        // Direct download on desktop/tablet
        downloadReceipt(receiptId);
    }
}

// Close download confirmation modal
function closeDownloadModal() {
    document.getElementById('download-confirm-modal').classList.remove('active');
}

