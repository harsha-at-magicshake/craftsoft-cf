// Services Master Table Module
const websiteServices = [
    { code: 'S-WDEV', name: 'Website Development' },
    { code: 'S-GD', name: 'Graphic Design Services' },
    { code: 'S-BRND', name: 'Branding & Marketing' },
    { code: 'S-CLOUD', name: 'Cloud & DevOps Solutions' },
    { code: 'S-CAREER', name: 'Career & Placement Services' }
];

let allServices = [];
let currentPage = 1;
let defaultGstRate = 18;
const itemsPerPage = window.innerWidth <= 1250 ? 5 : 10;

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '/';
        return;
    }

    AdminSidebar.init('services', '/');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) headerContainer.innerHTML = AdminHeader.render('Services');

    const admin = await window.Auth.getCurrentAdmin();
    await AdminSidebar.renderAccountPanel(session, admin);

    // Fetch GST Rate
    try {
        const { data: gstSetting } = await window.supabaseClient
            .from('settings')
            .select('setting_value')
            .eq('setting_key', 'service_gst_rate')
            .single();
        if (gstSetting) defaultGstRate = parseFloat(gstSetting.setting_value) || 18;
    } catch (e) { console.warn('Using default service GST 18%'); }

    await loadServices();

    bindFormEvents();
    document.getElementById('sync-services-btn')?.addEventListener('click', syncServices);

    // Check for deep links (Spotlight Search)
    const params = new URLSearchParams(window.location.search);
    const deepLinkId = params.get('id');
    if (deepLinkId && allServices.length > 0) {
        const service = allServices.find(s => s.id == deepLinkId);
        if (service) {
            // Clear param
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);

            openFeeForm(service.id, service.service_code, service.name, service.base_fee, service.gst_amount, service.fee);
        }
    }
});

// =====================
// Data Loading
// =====================
async function loadServices() {
    const { Toast } = window.AdminUtils;
    const content = document.getElementById('services-content');

    try {
        const { data: services, error } = await window.supabaseClient
            .from('services')
            .select('*')
            .order('service_code', { ascending: true });

        if (error) throw error;
        allServices = services || [];
        renderServicesList(allServices);
    } catch (error) {
        console.error(error);
        const container = document.getElementById('services-grid-container');
        if (container) container.innerHTML = '<div class="error-state"><i class="fa-solid fa-exclamation-triangle"></i><p>Failed to load services.</p></div>';
    } finally {
        const spinners = document.querySelectorAll('.loading-spinner');
        spinners.forEach(s => s.style.display = 'none');
    }
}

function renderServicesList(services) {
    const gridContainer = document.getElementById('services-grid-container');

    if (!services || services.length === 0) {
        gridContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon"><i class="fa-solid fa-wrench"></i></div>
                    <h3>No services yet</h3>
                    <p>Click "Sync from Website" to populate services</p>
                </div>`;
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedServices = services.slice(start, start + itemsPerPage);

    gridContainer.innerHTML = paginatedServices.map(s => `
        <div class="premium-card">
            <div class="card-header">
                <span class="card-id-badge">${s.service_code}</span>
                <button class="btn-icon btn-edit-fee" data-id="${s.id}" data-code="${s.service_code}" data-name="${s.name}" 
                    data-base="${s.base_fee || 0}" data-gst="${s.gst_amount || 0}" data-total="${s.total_fee || 0}" title="Edit Pricing">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </div>
            <div class="card-body">
                <h3 class="card-title">${s.name || 'Unnamed Service'}</h3>
                
                <div class="card-pricing-list">
                    <div class="pricing-item">
                        <span class="label">Base Fee</span>
                        <span class="value">₹${formatNumber(s.base_fee || 0)}</span>
                    </div>
                    <div class="pricing-item">
                        <span class="label">GST (${defaultGstRate}%)</span>
                        <span class="value">₹${formatNumber(s.gst_amount || 0)}</span>
                    </div>
                    <div class="pricing-item total">
                        <span class="label">Total Fee</span>
                        <span class="value">₹${formatNumber(s.total_fee || 0)}</span>
                    </div>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn btn-primary btn-edit-pricing btn-edit-fee" data-id="${s.id}" data-code="${s.service_code}" data-name="${s.name}" 
                    data-base="${s.base_fee || 0}" data-gst="${s.gst_amount || 0}" data-total="${s.total_fee || 0}">
                    <i class="fa-solid fa-indian-rupee-sign"></i> Edit Pricing
                </button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.btn-edit-fee').forEach(btn => {
        btn.addEventListener('click', () => {
            openFeeForm(btn.dataset.id, btn.dataset.code, btn.dataset.name, btn.dataset.base, btn.dataset.gst, btn.dataset.total);
        });
    });

    // Common Footer
    const footerContainer = document.getElementById('pagination-container');
    const existingFooter = document.getElementById('services-footer');
    if (existingFooter) existingFooter.remove();

    const footer = document.createElement('div');
    footer.id = 'services-footer';
    footer.className = 'table-footer';
    footer.style.marginTop = '1rem';
    footer.innerHTML = `<span>${services.length} service${services.length !== 1 ? 's' : ''} synced</span>`;
    footerContainer.parentNode.insertBefore(footer, footerContainer);

    // Render pagination
    window.AdminUtils.Pagination.render('pagination-container', services.length, currentPage, itemsPerPage, (page) => {
        currentPage = page;
        renderServicesList(allServices);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// =====================
// Pricing Logic
// =====================
function bindFormEvents() {
    document.getElementById('save-fee-btn')?.addEventListener('click', saveFee);
    document.getElementById('cancel-fee-btn')?.addEventListener('click', closeFeeForm);
    document.getElementById('close-fee-form-btn')?.addEventListener('click', closeFeeForm);
}

function openFeeForm(id, code, name, baseFee, gstAmount, totalFee) {
    const container = document.getElementById('fee-form-container');
    document.getElementById('edit-service-db-id').value = id;
    document.getElementById('fee-service-name').value = `${code} - ${name}`;
    document.getElementById('fee-modal-title').innerText = `Edit Pricing (GST ${defaultGstRate}%)`;

    const baseInput = document.getElementById('base-fee-input');
    const gstInput = document.getElementById('gst-amount-input');
    const totalInput = document.getElementById('total-fee-input');

    baseInput.value = baseFee || 0;
    gstInput.value = gstAmount || 0;
    totalInput.value = totalFee || 0;

    // Attach real-time calculation listeners
    baseInput.oninput = () => calculateFromBase();
    totalInput.oninput = () => calculateFromTotal();

    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    baseInput.focus();
}

function calculateFromBase() {
    const base = parseFloat(document.getElementById('base-fee-input').value) || 0;
    const gst = (base * defaultGstRate) / 100;
    const total = base + gst;

    document.getElementById('gst-amount-input').value = gst.toFixed(2);
    document.getElementById('total-fee-input').value = total.toFixed(2);
}

function calculateFromTotal() {
    const total = parseFloat(document.getElementById('total-fee-input').value) || 0;
    const base = total / (1 + defaultGstRate / 100);
    const gst = total - base;

    document.getElementById('base-fee-input').value = base.toFixed(2);
    document.getElementById('gst-amount-input').value = gst.toFixed(2);
}

function closeFeeForm() {
    document.getElementById('fee-form-container').style.display = 'none';
}

async function saveFee() {
    const { Toast } = window.AdminUtils;
    const saveBtn = document.getElementById('save-fee-btn');
    const id = document.getElementById('edit-service-db-id').value;

    const baseFee = parseFloat(document.getElementById('base-fee-input').value) || 0;
    const gstAmount = parseFloat(document.getElementById('gst-amount-input').value) || 0;
    const totalFee = parseFloat(document.getElementById('total-fee-input').value) || 0;

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        const { error } = await window.supabaseClient.from('services').update({
            base_fee: baseFee,
            gst_amount: gstAmount,
            total_fee: totalFee
        }).eq('id', id);

        if (error) throw error;
        Toast.success('Saved', 'Pricing updated successfully');

        // Log activity
        const serviceName = document.getElementById('fee-service-name').value;
        if (window.DashboardActivities) {
            await window.DashboardActivities.add('fee_updated', serviceName, '../services/');
        }

        closeFeeForm();
        await loadServices();
    } catch (e) {
        Toast.error('Error', e.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Update Pricing';
    }
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return parseFloat(num).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// =====================
// Sync Services
// =====================
async function syncServices() {
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('sync-services-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';

    try {
        const { data: existing, error: fetchError } = await window.supabaseClient
            .from('services')
            .select('*');
        if (fetchError) throw fetchError;

        let synced = 0;
        let updated = 0;

        for (const svc of websiteServices) {
            const matches = existing.filter(ex =>
                ex.service_code === svc.code ||
                ex.name?.toLowerCase() === svc.name.toLowerCase()
            );

            if (matches.length > 0) {
                const primary = matches[0];
                await window.supabaseClient.from('services')
                    .update({
                        service_code: svc.code,
                        name: svc.name
                    })
                    .eq('id', primary.id);
                updated++;

                if (matches.length > 1) {
                    const extraIds = matches.slice(1).map(m => m.id);
                    await window.supabaseClient.from('services').delete().in('id', extraIds);
                }
            } else {
                await window.supabaseClient.from('services').insert({
                    service_code: svc.code,
                    name: svc.name
                });
                synced++;
            }
        }

        Toast.success('Synced', `${synced} new services, ${updated} updated`);
        await loadServices();
    } catch (e) {
        console.error('Sync error:', e);
        Toast.error('Error', e.message || 'Failed to sync services');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sync from Website';
    }
}
