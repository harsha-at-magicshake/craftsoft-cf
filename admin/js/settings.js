// Settings Page Logic

// Available navigation items
const availableNavItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Home', href: 'dashboard.html' },
    { id: 'inquiries', icon: 'contact_phone', label: 'Inquiries', href: 'inquiries.html' },
    { id: 'students', icon: 'people', label: 'Students', href: 'students.html' },
    { id: 'payments', icon: 'payments', label: 'Payments', href: 'payments.html' },
    { id: 'tutors', icon: 'person', label: 'Tutors', href: 'tutors.html' },
    { id: 'settings', icon: 'settings', label: 'Settings', href: 'settings.html' }
];

// Default nav items (first 4)
let selectedNavItems = ['dashboard', 'inquiries', 'students', 'payments'];

// Load settings on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    renderNavigationSettings();
});

// Load all settings from Firestore
async function loadSettings() {
    try {
        const doc = await db.collection('settings').doc('config').get();

        if (doc.exists) {
            const data = doc.data();

            // Payment settings - both input and display
            document.getElementById('bankName').value = data.bankName || '';
            document.getElementById('bankAccount').value = data.bankAccount || '';
            document.getElementById('bankIFSC').value = data.bankIFSC || '';
            document.getElementById('upiId').value = data.upiId || '';
            document.getElementById('razorpayLink').value = data.razorpayLink || '';

            // Update display values
            updatePaymentDisplayValues(data);
            updateBusinessDisplayValues(data);

            // Business settings
            document.getElementById('businessName').value = data.businessName || '';
            document.getElementById('businessPhone').value = data.businessPhone || '';
            document.getElementById('businessAddress').value = data.businessAddress || '';

            // Navigation settings
            if (data.mobileNavItems && data.mobileNavItems.length > 0) {
                selectedNavItems = data.mobileNavItems;
            }

            // Display last saved timestamp
            if (data.updatedAt) {
                const lastSaved = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
                updateLastSavedText('paymentLastSaved', lastSaved);
            }
        }

        renderNavigationSettings();

    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Update "Last saved" text
function updateLastSavedText(elementId, date) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let timeAgo = '';
    if (diffMins < 1) {
        timeAgo = 'Just now';
    } else if (diffMins < 60) {
        timeAgo = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
        timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    el.innerHTML = `<span class="material-icons">schedule</span> Last saved: ${timeAgo}`;
}

// Update display values for payment settings
function updatePaymentDisplayValues(data) {
    const setDisplayValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            if (value) {
                el.textContent = value;
                el.classList.remove('empty');
            } else {
                el.textContent = 'Not set';
                el.classList.add('empty');
            }
        }
    };

    setDisplayValue('bankNameDisplay', data.bankName);
    setDisplayValue('bankAccountDisplay', data.bankAccount ? '••••' + data.bankAccount.slice(-4) : '');
    setDisplayValue('bankIFSCDisplay', data.bankIFSC);
    setDisplayValue('upiIdDisplay', data.upiId);
    setDisplayValue('razorpayLinkDisplay', data.razorpayLink ? 'Configured ✓' : '');
}

// Update display values for business settings
function updateBusinessDisplayValues(data) {
    const setDisplayValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            if (value) {
                el.textContent = value;
                el.classList.remove('empty');
            } else {
                el.textContent = 'Not set';
                el.classList.add('empty');
            }
        }
    };

    setDisplayValue('businessNameDisplay', data.businessName);
    setDisplayValue('businessPhoneDisplay', data.businessPhone);
    setDisplayValue('businessAddressDisplay', data.businessAddress);
}

// Toggle edit mode for payment settings
let paymentEditMode = false;

function toggleEditPayment() {
    paymentEditMode = !paymentEditMode;

    const displayValues = document.querySelectorAll('#bankNameDisplay, #bankAccountDisplay, #bankIFSCDisplay, #upiIdDisplay, #razorpayLinkDisplay');
    const editInputs = document.querySelectorAll('#bankName, #bankAccount, #bankIFSC, #upiId, #razorpayLink');
    const editBtn = document.getElementById('editPaymentBtn');
    const actionsDiv = document.getElementById('paymentEditActions');

    if (paymentEditMode) {
        displayValues.forEach(el => el.style.display = 'none');
        editInputs.forEach(el => el.style.display = 'block');
        editBtn.style.display = 'none';
        actionsDiv.style.display = 'block';
    } else {
        displayValues.forEach(el => el.style.display = 'inline');
        editInputs.forEach(el => el.style.display = 'none');
        editBtn.style.display = 'inline-flex';
        actionsDiv.style.display = 'none';

        // Refresh display values from inputs
        updatePaymentDisplayValues({
            bankName: document.getElementById('bankName').value,
            bankAccount: document.getElementById('bankAccount').value,
            bankIFSC: document.getElementById('bankIFSC').value,
            upiId: document.getElementById('upiId').value,
            razorpayLink: document.getElementById('razorpayLink').value
        });
    }
}

function cancelEditPayment() {
    // We want to force a switch FROM Edit TO View.
    // toggleEditPayment flips the boolean. So if we want to end up in View (false),
    // we should ensure it starts as true before calling toggle.
    paymentEditMode = true;
    toggleEditPayment(); // This will flip it to false (View Mode)
    loadSettings(); // Reload original values from DB

    // Clear the extra branch display if visible
    const displayEl = document.getElementById('ifscBranchDisplay');
    if (displayEl) displayEl.style.display = 'none';
}

// Toggle edit mode for business settings
let businessEditMode = false;

function toggleEditBusiness() {
    businessEditMode = !businessEditMode;

    const displayValues = document.querySelectorAll('#businessNameDisplay, #businessPhoneDisplay, #businessAddressDisplay');
    const editInputs = document.querySelectorAll('#businessName, #businessPhone, #businessAddress');
    const editBtn = document.getElementById('editBusinessBtn');
    const actionsDiv = document.getElementById('businessEditActions');

    if (businessEditMode) {
        displayValues.forEach(el => el.style.display = 'none');
        editInputs.forEach(el => el.style.display = 'block');
        editBtn.style.display = 'none';
        actionsDiv.style.display = 'block';
    } else {
        displayValues.forEach(el => el.style.display = 'inline');
        editInputs.forEach(el => el.style.display = 'none');
        editBtn.style.display = 'inline-flex';
        actionsDiv.style.display = 'none';

        // Refresh display values from inputs
        updateBusinessDisplayValues({
            businessName: document.getElementById('businessName').value,
            businessPhone: document.getElementById('businessPhone').value,
            businessAddress: document.getElementById('businessAddress').value
        });
    }
}

function cancelEditBusiness() {
    // Same logic as payment cancel: Force state to true before toggling to false
    businessEditMode = true;
    toggleEditBusiness(); // Switch to View Mode
    loadSettings(); // Reload original data
}


// Validation patterns
const validationPatterns = {
    ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
    upi: /^[\w.-]+@[\w]{2,}$/, // Minimum 2 chars after @
    bankAccount: /^\d{9,18}$/,
    razorpayLink: /^https:\/\/(rzp\.io|razorpay\.me|razorpay\.com)\/.+$/
};

// Validate IFSC via Razorpay API
// Validate IFSC via Razorpay API
async function validateIFSC(ifsc) {
    try {
        const response = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
        if (response.ok) {
            const data = await response.json();
            return { valid: true, bank: data.BANK, branch: data.BRANCH };
        }
        return { valid: false };
    } catch {
        return { valid: false };
    }
}

// Check IFSC on blur and show branch
async function checkIFSC() {
    const ifsc = document.getElementById('bankIFSC').value.trim().toUpperCase();
    const displayEl = document.getElementById('ifscBranchDisplay');

    if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        displayEl.style.display = 'none';
        return;
    }

    displayEl.innerHTML = '<span class="loading-spinner" style="width: 12px; height: 12px; border-width: 2px;"></span> Verifying...';
    displayEl.style.color = '#64748b';
    displayEl.style.display = 'block';

    const result = await validateIFSC(ifsc);

    if (result.valid) {
        displayEl.innerHTML = `<span class="material-icons" style="font-size: 14px; vertical-align: text-bottom;">check_circle</span> ${result.bank}, ${result.branch}`;
        displayEl.style.color = '#10B981';
    } else {
        displayEl.innerHTML = `<span class="material-icons" style="font-size: 14px; vertical-align: text-bottom;">error</span> Invalid IFSC Code`;
        displayEl.style.color = '#EF4444';
    }
    displayEl.style.display = 'block';
}

// Verify UPI (Static check for now, can be extended with Razorpay API)
async function verifyUPI() {
    const upiId = document.getElementById('upiId').value.trim();
    if (!upiId) {
        showToast('Please enter a UPI ID', 'error');
        return;
    }

    if (!validationPatterns.upi.test(upiId)) {
        showToast('Invalid UPI format', 'error');
        return;
    }

    showToast('Validating UPI format...', 'success');
    // Note: True VPA validation requires API keys with basic auth.
    // For now, we perform a strict pattern check.
    setTimeout(() => {
        showToast(`✓ UPI format looks correct: ${upiId}`, 'success');
    }, 800);
}

// Save Payment Settings with validation
async function savePaymentSettings() {
    const bankName = document.getElementById('bankName').value.trim();
    const bankAccount = document.getElementById('bankAccount').value.trim();
    const bankIFSC = document.getElementById('bankIFSC').value.trim().toUpperCase();
    const upiId = document.getElementById('upiId').value.trim();
    const razorpayLink = document.getElementById('razorpayLink').value.trim();

    // Validate fields
    if (bankAccount && !validationPatterns.bankAccount.test(bankAccount)) {
        showToast('Bank account should be 9-18 digits', 'error');
        return;
    }

    if (bankIFSC && !validationPatterns.ifsc.test(bankIFSC)) {
        showToast('Invalid IFSC format (e.g., SBIN0001234)', 'error');
        return;
    }

    // Validate IFSC via API if provided
    if (bankIFSC) {
        showToast('Verifying IFSC...', 'success');
        const ifscResult = await validateIFSC(bankIFSC);
        if (!ifscResult.valid) {
            showToast('IFSC code not found. Please verify.', 'error');
            return;
        }
        showToast(`✓ ${ifscResult.bank}, ${ifscResult.branch}`, 'success');
    }

    if (upiId && !validationPatterns.upi.test(upiId)) {
        showToast('Invalid UPI format (e.g., name@upi)', 'error');
        return;
    }

    if (razorpayLink && !validationPatterns.razorpayLink.test(razorpayLink)) {
        showToast('Invalid Razorpay link (must start with https://rzp.io/)', 'error');
        return;
    }

    try {
        await db.collection('settings').doc('config').set({
            bankName,
            bankAccount,
            bankIFSC,
            upiId,
            razorpayLink,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showToast('Payment settings saved!', 'success');
        paymentEditMode = true; // Set to true so toggle flips it to false (view mode)
        toggleEditPayment();
        updateLastSavedText('paymentLastSaved', new Date()); // Show "Just now"
    } catch (error) {
        console.error('Error saving payment settings:', error);
        showToast('Error saving settings', 'error');
    }
}

// Save Business Settings
async function saveBusinessSettings() {
    const businessName = document.getElementById('businessName').value.trim();
    const businessPhone = document.getElementById('businessPhone').value.trim();
    const businessAddress = document.getElementById('businessAddress').value.trim();

    try {
        await db.collection('settings').doc('config').set({
            businessName,
            businessPhone,
            businessAddress,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showToast('Business settings saved!', 'success');
        businessEditMode = true; // Set to true so toggle flips it to false (view mode)
        toggleEditBusiness();
    } catch (error) {
        console.error('Error saving business settings:', error);
        showToast('Error saving settings', 'error');
    }
}

// Render Navigation Settings with Drag to Reorder
function renderNavigationSettings() {
    const selectedContainer = document.getElementById('selectedNavItems');
    const listContainer = document.getElementById('navItemsList');

    // Show selected items as draggable cards
    if (selectedNavItems.length === 0) {
        selectedContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #94a3b8;">
                <span class="material-icons" style="font-size: 32px;">add_circle_outline</span>
                <p style="margin: 8px 0 0; font-size: 0.85rem;">Add items from below</p>
            </div>
        `;
    } else {
        selectedContainer.innerHTML = selectedNavItems.map((id, index) => {
            const item = availableNavItems.find(n => n.id === id);
            if (!item) return '';
            return `
                <div class="sortable-nav-item" draggable="true" data-id="${item.id}" data-index="${index}">
                    <span class="material-icons drag-handle">drag_indicator</span>
                    <span class="material-icons nav-icon">${item.icon}</span>
                    <span class="nav-label">${item.label}</span>
                    <button class="remove-btn" onclick="removeNavItem('${item.id}')" title="Remove">
                        <span class="material-icons">close</span>
                    </button>
                </div>
            `;
        }).join('');

        // Initialize drag and drop
        initDragAndDrop();
    }

    // Show available items (not selected) with add buttons
    const unselectedItems = availableNavItems.filter(item => !selectedNavItems.includes(item.id));

    if (unselectedItems.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 16px; color: #94a3b8; font-size: 0.85rem;">
                All items selected
            </div>
        `;
    } else {
        listContainer.innerHTML = unselectedItems.map(item => {
            const canAdd = selectedNavItems.length < 4;

            return `
                <div class="nav-item-toggle">
                    <div class="nav-item-info">
                        <span class="material-icons">${item.icon}</span>
                        <span>${item.label}</span>
                    </div>
                    <button class="toggle-btn add ${canAdd ? '' : 'disabled'}" 
                            onclick="${canAdd ? `addNavItem('${item.id}')` : ''}" 
                            title="${canAdd ? 'Add' : 'Max 4 items'}"
                            ${canAdd ? '' : 'disabled style="opacity: 0.3; cursor: not-allowed;"'}>
                        <span class="material-icons">add</span>
                    </button>
                </div>
            `;
        }).join('');
    }
}

// Initialize Drag and Drop
function initDragAndDrop() {
    const container = document.getElementById('selectedNavItems');
    const items = container.querySelectorAll('.sortable-nav-item');

    let draggedItem = null;

    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            // Update selectedNavItems array based on new order
            updateNavOrder();
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedItem && draggedItem !== item) {
                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (e.clientY < midY) {
                    container.insertBefore(draggedItem, item);
                } else {
                    container.insertBefore(draggedItem, item.nextSibling);
                }
            }
        });
    });
}

// Update nav order after drag
function updateNavOrder() {
    const container = document.getElementById('selectedNavItems');
    const items = container.querySelectorAll('.sortable-nav-item');
    selectedNavItems = Array.from(items).map(item => item.dataset.id);
}

// Add nav item
function addNavItem(itemId) {
    if (selectedNavItems.length >= 4) {
        showToast('Maximum 4 items allowed', 'error');
        return;
    }
    if (!selectedNavItems.includes(itemId)) {
        selectedNavItems.push(itemId);
        renderNavigationSettings();
    }
}

// Remove nav item
function removeNavItem(itemId) {
    if (selectedNavItems.length <= 1) {
        showToast('At least 1 item required', 'error');
        return;
    }
    selectedNavItems = selectedNavItems.filter(id => id !== itemId);
    renderNavigationSettings();
}

// Save Navigation Settings
async function saveNavigationSettings() {
    try {
        await db.collection('settings').doc('config').set({
            mobileNavItems: selectedNavItems,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showToast('Navigation settings saved! Refresh other pages to see changes.', 'success');
    } catch (error) {
        console.error('Error saving navigation settings:', error);
        showToast('Error saving settings', 'error');
    }
}

// Toast Notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Make functions global
window.savePaymentSettings = savePaymentSettings;
window.saveBusinessSettings = saveBusinessSettings;
window.saveNavigationSettings = saveNavigationSettings;
window.addNavItem = addNavItem;
window.removeNavItem = removeNavItem;
window.toggleEditPayment = toggleEditPayment;
window.cancelEditPayment = cancelEditPayment;
window.toggleEditBusiness = toggleEditBusiness;
window.cancelEditBusiness = cancelEditBusiness;
window.verifyUPI = verifyUPI;
window.checkIFSC = checkIFSC;
