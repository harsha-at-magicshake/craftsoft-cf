/* ============================================
   SETTINGS - JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', initSettingsPage);

async function initSettingsPage() {
    // Check auth
    const session = await requireAuth();
    if (!session) return;

    // Show layout
    document.getElementById('adminLayout').style.display = 'flex';

    // Setup UI
    setupSidebar();
    setupTabs();

    // Load Data
    await loadInstituteSettings();
    await loadDiscountSettings();

    // Setup Forms
    document.getElementById('instituteForm').addEventListener('submit', handleInstituteUpdate);
    document.getElementById('addDiscountBtn').addEventListener('click', () => showDiscountModal());
}

// ============================================
// SIDEBAR
// ============================================
function setupSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const toggle = document.getElementById('sidebarToggle');
    const close = document.getElementById('sidebarClose');
    const overlay = document.getElementById('sidebarOverlay');

    toggle.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.add('show');
    });

    close.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }
}

// ============================================
// TABS
// ============================================
function setupTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // Update tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update panels
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            document.getElementById(`${target}Panel`).classList.add('active');
        });
    });
}

// ============================================
// INSTITUTE SETTINGS
// ============================================
async function loadInstituteSettings() {
    try {
        const { data, error } = await supabase
            .from('institute_settings')
            .select('*');

        if (error) throw error;

        // Map settings to form
        data.forEach(setting => {
            const input = document.getElementById(`inst_${setting.key}`);
            if (input) input.value = setting.value;
        });

    } catch (error) {
        console.error('Error loading institute settings:', error);
        showToast('Failed to load institute settings', 'error');
    }
}

async function handleInstituteUpdate(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    try {
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner-sm"></div> Updating...';

        const keys = ['name', 'tagline', 'phone', 'email', 'website', 'address'];
        const updates = keys.map(key => {
            return supabase
                .from('institute_settings')
                .update({ value: document.getElementById(`inst_${key}`).value.trim() })
                .eq('key', key);
        });

        const results = await Promise.all(updates);
        const errors = results.filter(r => r.error);

        if (errors.length > 0) throw errors[0].error;

        showToast('Institute settings updated successfully!', 'success');

    } catch (error) {
        console.error('Error updating settings:', error);
        showToast('Failed to update settings', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ============================================
// DISCOUNT SETTINGS
// ============================================
async function loadDiscountSettings() {
    try {
        const { data, error } = await supabase
            .from('discount_settings')
            .select('*')
            .order('name');

        if (error) throw error;

        const tbody = document.getElementById('discountsTableBody');
        tbody.innerHTML = data.map(rule => `
            <tr>
                <td>
                    <div style="font-weight: 600;">${rule.display_name}</div>
                    <small style="color: var(--gray-400);">${rule.name}</small>
                </td>
                <td>${capitalizeFirst(rule.type)}</td>
                <td>${rule.type === 'percentage' ? rule.value + '%' : '₹' + formatCurrency(rule.value)}</td>
                <td>
                    <span class="status-badge ${rule.is_active ? 'status-active' : 'status-inactive'}">
                        ${rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="showDiscountModal('${rule.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading discounts:', error);
    }
}

let activeDiscountId = null;

window.showDiscountModal = async function (id = null) {
    activeDiscountId = id;
    const modal = document.getElementById('discountModal');
    const form = document.getElementById('discountForm');
    const title = document.getElementById('discountModalTitle');

    form.reset();

    if (id) {
        title.textContent = 'Edit Discount Rule';
        try {
            const { data, error } = await supabase
                .from('discount_settings')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            document.getElementById('disc_name').value = data.name;
            document.getElementById('disc_display_name').value = data.display_name;
            document.getElementById('disc_type').value = data.type;
            document.getElementById('disc_value').value = data.value;
            document.getElementById('disc_active').checked = data.is_active;
            document.getElementById('disc_name').disabled = true; // Key cannot be changed

        } catch (error) {
            showToast('Error loading rule', 'error');
            return;
        }
    } else {
        title.textContent = 'Add New Discount';
        document.getElementById('disc_name').disabled = false;
        document.getElementById('disc_active').checked = true;
    }

    modal.classList.add('show');
};

window.hideDiscountModal = function () {
    document.getElementById('discountModal').classList.remove('show');
};

window.handleDiscountSubmit = async function (e) {
    e.preventDefault();
    const formData = {
        name: document.getElementById('disc_name').value.trim().toLowerCase().replace(/\s+/g, '_'),
        display_name: document.getElementById('disc_display_name').value.trim(),
        type: document.getElementById('disc_type').value,
        value: parseFloat(document.getElementById('disc_value').value),
        is_active: document.getElementById('disc_active').checked
    };

    try {
        if (activeDiscountId) {
            const { error } = await supabase
                .from('discount_settings')
                .update(formData)
                .eq('id', activeDiscountId);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('discount_settings')
                .insert(formData);
            if (error) throw error;
        }

        showToast('Discount rule saved!', 'success');
        hideDiscountModal();
        loadDiscountSettings();
    } catch (error) {
        showToast('Error saving rule: ' + (error.message.includes('unique_violation') ? 'Name already exists' : error.message), 'error');
    }
};

// ============================================
// LOGOUT
// ============================================
function showLogoutModal() {
    document.getElementById('logoutModal').classList.add('show');
}

function hideLogoutModal() {
    document.getElementById('logoutModal').classList.remove('show');
}

async function confirmLogout() {
    await signOut();
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Global scope attachment
window.hideLogoutModal = hideLogoutModal;
window.confirmLogout = confirmLogout;
window.showLogoutModal = showLogoutModal;
