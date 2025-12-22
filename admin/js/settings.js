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

            // Payment settings
            document.getElementById('bankName').value = data.bankName || '';
            document.getElementById('bankAccount').value = data.bankAccount || '';
            document.getElementById('bankIFSC').value = data.bankIFSC || '';
            document.getElementById('upiId').value = data.upiId || '';
            document.getElementById('razorpayLink').value = data.razorpayLink || '';

            // Business settings
            document.getElementById('businessName').value = data.businessName || '';
            document.getElementById('businessPhone').value = data.businessPhone || '';
            document.getElementById('businessAddress').value = data.businessAddress || '';

            // Navigation settings
            if (data.mobileNavItems && data.mobileNavItems.length > 0) {
                selectedNavItems = data.mobileNavItems;
            }
        }

        renderNavigationSettings();

    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save Payment Settings
async function savePaymentSettings() {
    try {
        await db.collection('settings').doc('config').set({
            bankName: document.getElementById('bankName').value.trim(),
            bankAccount: document.getElementById('bankAccount').value.trim(),
            bankIFSC: document.getElementById('bankIFSC').value.trim().toUpperCase(),
            upiId: document.getElementById('upiId').value.trim(),
            razorpayLink: document.getElementById('razorpayLink').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showToast('Payment settings saved!', 'success');
    } catch (error) {
        console.error('Error saving payment settings:', error);
        showToast('Error saving settings', 'error');
    }
}

// Save Business Settings
async function saveBusinessSettings() {
    try {
        await db.collection('settings').doc('config').set({
            businessName: document.getElementById('businessName').value.trim(),
            businessPhone: document.getElementById('businessPhone').value.trim(),
            businessAddress: document.getElementById('businessAddress').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        showToast('Business info saved!', 'success');
    } catch (error) {
        console.error('Error saving business settings:', error);
        showToast('Error saving settings', 'error');
    }
}

// Render Navigation Settings
function renderNavigationSettings() {
    const selectedContainer = document.getElementById('selectedNavItems');
    const listContainer = document.getElementById('navItemsList');

    // Show selected items as chips
    selectedContainer.innerHTML = selectedNavItems.map(id => {
        const item = availableNavItems.find(n => n.id === id);
        if (!item) return '';
        return `
            <div class="chip">
                <span class="material-icons">${item.icon}</span>
                ${item.label}
            </div>
        `;
    }).join('');

    // Show all items with add/remove buttons
    listContainer.innerHTML = availableNavItems.map(item => {
        const isSelected = selectedNavItems.includes(item.id);
        const canAdd = !isSelected && selectedNavItems.length < 4;

        return `
            <div class="nav-item-toggle">
                <div class="nav-item-info">
                    <span class="material-icons">${item.icon}</span>
                    <span>${item.label}</span>
                </div>
                ${isSelected ? `
                    <button class="toggle-btn remove" onclick="removeNavItem('${item.id}')" title="Remove">
                        <span class="material-icons">remove</span>
                    </button>
                ` : `
                    <button class="toggle-btn add ${canAdd ? '' : 'disabled'}" 
                            onclick="${canAdd ? `addNavItem('${item.id}')` : ''}" 
                            title="${canAdd ? 'Add' : 'Max 4 items'}"
                            ${canAdd ? '' : 'disabled style="opacity: 0.3; cursor: not-allowed;"'}>
                        <span class="material-icons">add</span>
                    </button>
                `}
            </div>
        `;
    }).join('');
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
