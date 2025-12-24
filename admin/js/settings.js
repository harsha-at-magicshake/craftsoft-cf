// Settings Page Logic - Migrated to Supabase

// Load settings on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    renderSubjectCodesBanner();
});

// Load all settings from Supabase
async function loadSettings() {
    try {
        if (typeof supabase === 'undefined') return;

        const { data, error } = await supabase.from('settings').select('*').eq('id', 'config').single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found

        if (data) {
            // Payment settings
            document.getElementById('bankName').value = data.bank_name || '';
            document.getElementById('bankAccount').value = data.bank_account || '';
            document.getElementById('bankIFSC').value = data.bank_ifsc || '';
            document.getElementById('upiId').value = data.upi_id || '';
            document.getElementById('razorpayLink').value = data.razorpay_link || '';

            // Update display
            updatePaymentDisplayValues(data);
            updateBusinessDisplayValues(data);

            // Business settings
            document.getElementById('businessName').value = data.business_name || '';
            document.getElementById('businessPhone').value = data.business_phone || '';
            document.getElementById('businessAddress').value = data.business_address || '';

            if (data.updated_at) {
                updateLastSavedText('paymentLastSaved', new Date(data.updated_at));
            }
        }

    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Update "Last saved" text
function updateLastSavedText(elementId, date) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const diffMins = Math.floor((new Date() - date) / 60000);
    let timeAgo = diffMins < 1 ? 'Just now' : `${diffMins} mins ago`;
    el.innerHTML = `<span class="material-icons">schedule</span> Last saved: ${timeAgo}`;
}

function updatePaymentDisplayValues(data) {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = val || 'Not set';
            el.classList.toggle('empty', !val);
        }
    };
    set('bankNameDisplay', data.bank_name);
    set('bankAccountDisplay', data.bank_account ? '••••' + data.bank_account.slice(-4) : '');
    set('bankIFSCDisplay', data.bank_ifsc);
    set('upiIdDisplay', data.upi_id);
    set('razorpayLinkDisplay', data.razorpay_link ? 'Configured ✓' : '');
}

function updateBusinessDisplayValues(data) {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = val || 'Not set';
            el.classList.toggle('empty', !val);
        }
    };
    set('businessNameDisplay', data.business_name);
    set('businessPhoneDisplay', data.business_phone);
    set('businessAddressDisplay', data.business_address);
}

// Save Payment Settings
async function savePaymentSettings() {
    const updates = {
        bank_name: document.getElementById('bankName').value.trim(),
        bank_account: document.getElementById('bankAccount').value.trim(),
        bank_ifsc: document.getElementById('bankIFSC').value.trim().toUpperCase(),
        upi_id: document.getElementById('upiId').value.trim(),
        razorpay_link: document.getElementById('razorpayLink').value.trim(),
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabase.from('settings').upsert({ id: 'config', ...updates });
        if (error) throw error;
        showToast('Payment settings saved!', 'success');
        loadSettings();
        if (typeof toggleEditPayment === 'function') toggleEditPayment();
    } catch (error) {
        console.error('Error saving:', error);
        showToast('Error saving settings', 'error');
    }
}

// Save Business Settings
async function saveBusinessSettings() {
    const updates = {
        business_name: document.getElementById('businessName').value.trim(),
        business_phone: document.getElementById('businessPhone').value.trim(),
        business_address: document.getElementById('businessAddress').value.trim(),
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabase.from('settings').upsert({ id: 'config', ...updates });
        if (error) throw error;
        showToast('Business settings saved!', 'success');
        loadSettings();
        if (typeof toggleEditBusiness === 'function') toggleEditBusiness();
    } catch (error) {
        showToast('Error saving settings', 'error');
    }
}

// Reuse existing UI logic (Toggles/Validation)
let paymentEditMode = false;
function toggleEditPayment() {
    paymentEditMode = !paymentEditMode;
    document.querySelectorAll('#bankNameDisplay, #bankAccountDisplay, #bankIFSCDisplay, #upiIdDisplay, #razorpayLinkDisplay').forEach(el => el.style.display = paymentEditMode ? 'none' : 'inline');
    document.querySelectorAll('#bankName, #bankAccount, #bankIFSC, #upiId, #razorpayLink').forEach(el => el.style.display = paymentEditMode ? 'block' : 'none');
    document.getElementById('editPaymentBtn').style.display = paymentEditMode ? 'none' : 'inline-flex';
    document.getElementById('paymentEditActions').style.display = paymentEditMode ? 'block' : 'none';
}

let businessEditMode = false;
function toggleEditBusiness() {
    businessEditMode = !businessEditMode;
    document.querySelectorAll('#businessNameDisplay, #businessPhoneDisplay, #businessAddressDisplay').forEach(el => el.style.display = businessEditMode ? 'none' : 'inline');
    document.querySelectorAll('#businessName, #businessPhone, #businessAddress').forEach(el => el.style.display = businessEditMode ? 'block' : 'none');
    document.getElementById('editBusinessBtn').style.display = businessEditMode ? 'none' : 'inline-flex';
    document.getElementById('businessEditActions').style.display = businessEditMode ? 'block' : 'none';
}

function renderSubjectCodesBanner() {
    const banner = document.getElementById('subjectCodesBanner');
    if (!banner || !window.subjectCodes) return;
    banner.innerHTML = Object.entries(window.subjectCodes).map(([n, c]) => `
        <div class="subject-code-item"><span>${n}</span> <strong>${c}</strong></div>
    `).join('');
}

// Globals
window.savePaymentSettings = savePaymentSettings;
window.saveBusinessSettings = saveBusinessSettings;
window.toggleEditPayment = toggleEditPayment;
window.toggleEditBusiness = toggleEditBusiness;
window.renderSubjectCodesBanner = renderSubjectCodesBanner;
