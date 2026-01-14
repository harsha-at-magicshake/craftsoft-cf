// Settings Module
let settingsData = {};
let currentAdmin = null;
let sessionsData = [];
let currentTabId = null;
let currentSettingsTab = 'institute'; // institute, bank, security, profile
let sessionsChannel = null;

// Format password last updated text
function formatPasswordLastUpdated(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Last updated just now';
    if (diffHours < 24) return `Last updated ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `Last updated ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    // Format as DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `Last updated on ${day}/${month}/${year}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '/';
        return;
    }

    AdminSidebar.init('settings', '/');

    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Settings');
    }

    currentAdmin = await window.Auth.getCurrentAdmin();
    currentTabId = sessionStorage.getItem('tab_id');
    await AdminSidebar.renderAccountPanel(session, currentAdmin);

    await loadSettings();
    await loadSessions();
    renderSettings();
    bindEvents();

    // Subscribe to realtime session updates
    subscribeToSessionUpdates();

    // Check for deep links (Spotlight Search)
    const params = new URLSearchParams(window.location.search);
    const targetTab = params.get('tab');
    if (targetTab) {
        // Clear param
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        currentSettingsTab = targetTab;
        renderSettings();
    }
});


// =====================
// Load Settings
// =====================
async function loadSettings() {
    try {
        const { data, error } = await window.supabaseClient
            .from('settings')
            .select('*');

        if (error) throw error;

        // Convert array to object
        settingsData = {};
        (data || []).forEach(row => {
            settingsData[row.setting_key] = row.setting_value || '';
        });
    } catch (err) {
        console.error('Error loading settings:', err);
        settingsData = {};
    }
}

// =====================
// Load Sessions
// =====================
async function loadSessions() {
    if (!currentAdmin) return;

    try {
        const allSessions = await window.Auth.getSessions(currentAdmin.id);

        // Group sessions by device_info, keep only the most recent one per device
        // This prevents duplicate entries when same browser has multiple tabs
        const deviceMap = new Map();

        for (const session of allSessions) {
            const deviceKey = session.device_info || 'Unknown Device';

            if (!deviceMap.has(deviceKey)) {
                deviceMap.set(deviceKey, session);
            } else {
                // Keep the most recently active one
                const existing = deviceMap.get(deviceKey);
                const existingTime = new Date(existing.last_active || existing.created_at);
                const currentTime = new Date(session.last_active || session.created_at);

                if (currentTime > existingTime) {
                    deviceMap.set(deviceKey, session);
                }
            }
        }

        // Convert back to array
        sessionsData = Array.from(deviceMap.values());
    } catch (err) {
        console.error('Error loading sessions:', err);
        sessionsData = [];
    }
}

// =====================
// Realtime Session Updates
// =====================
function subscribeToSessionUpdates() {
    if (!currentAdmin) return;

    const supabase = window.supabaseClient;

    // Subscribe to INSERT and DELETE events on user_sessions for this admin
    sessionsChannel = supabase
        .channel('settings-sessions')
        .on(
            'postgres_changes',
            {
                event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                schema: 'public',
                table: 'user_sessions',
                filter: `admin_id=eq.${currentAdmin.id}`
            },
            async (payload) => {
                console.log('Session change detected:', payload.eventType);

                // Reload sessions and re-render
                await loadSessions();

                // Only update the sessions list, not the whole page
                const sessionsList = document.getElementById('sessions-list');
                if (sessionsList) {
                    sessionsList.innerHTML = renderSessionsList();

                    // Re-bind session logout buttons
                    document.querySelectorAll('.session-logout-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            logoutSession(btn.dataset.sessionId);
                        });
                    });

                    // Re-bind register button if present
                    document.getElementById('register-session-btn')?.addEventListener('click', registerCurrentSession);
                }

                // Show toast for new sessions
                if (payload.eventType === 'INSERT' && payload.new.session_token !== currentTabId) {
                    const { Toast } = window.AdminUtils;
                    Toast.info('New Login', `New session detected: ${payload.new.device_info || 'Unknown device'}`);
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Realtime session updates active');
            }
        });
}

// =====================
// Render Settings
// =====================
function renderSettings() {
    const container = document.getElementById('settings-content');

    container.innerHTML = `
        <!-- Left Sidebar: Tabs -->
        <div class="settings-tabs">
            <button class="settings-tab-btn ${currentSettingsTab === 'institute' ? 'active' : ''}" data-tab="institute">
                <i class="fa-solid fa-building"></i> Institute Details
            </button>
            <button class="settings-tab-btn ${currentSettingsTab === 'bank' ? 'active' : ''}" data-tab="bank">
                <i class="fa-solid fa-credit-card"></i> Payment Settings
            </button>
            <button class="settings-tab-btn ${currentSettingsTab === 'security' ? 'active' : ''}" data-tab="security">
                <i class="fa-solid fa-shield-halved"></i> Security
            </button>
            <button class="settings-tab-btn ${currentSettingsTab === 'profile' ? 'active' : ''}" data-tab="profile">
                <i class="fa-solid fa-user-circle"></i> My Profile
            </button>
        </div>

        <!-- Right Content: Tab Body -->
        <div class="settings-tab-body">
            ${renderCurrentTabContent()}
        </div>
    `;

    // Bind tab clicks (need to do it after innerHTML)
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentSettingsTab = btn.dataset.tab;
            renderSettings();
            bindEvents();
        });
    });
}

function renderCurrentTabContent() {
    switch (currentSettingsTab) {
        case 'profile': return renderProfileTab();
        case 'institute': return renderInstituteTab();
        case 'bank': return renderBankTab();
        case 'security': return renderSecurityTab();
        default: return '';
    }
}

function renderProfileTab() {
    return `
        <div class="settings-section" id="section-profile">
            <div class="settings-section-header">
                <h3 class="settings-section-title">
                    <i class="fa-solid fa-user"></i>
                    Profile Information
                </h3>
            </div>
            <div class="settings-section-body">
                <div class="settings-display">
                    <div class="settings-field-row">
                        <span class="settings-field-label">Full Name</span>
                        <span class="settings-field-value">${currentAdmin?.full_name || '—'}</span>
                    </div>
                    <div class="settings-field-row">
                        <span class="settings-field-label">Email</span>
                        <span class="settings-field-value">${currentAdmin?.email || '—'}</span>
                    </div>
                    <div class="settings-field-row">
                        <span class="settings-field-label">Admin ID</span>
                        <span class="settings-field-value">${currentAdmin?.admin_id || '—'}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Contact Section Grouped with Profile -->
        <div class="settings-section" style="margin-top: 2rem;" id="section-contact">
            <div class="settings-section-header">
                <h3 class="settings-section-title">
                    <i class="fa-solid fa-phone"></i>
                    Contact Details
                </h3>
                <button class="settings-edit-btn" data-section="contact">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
            </div>
            <div class="settings-section-body">
                <div class="settings-display">
                    ${renderFieldRow('Primary Phone', settingsData.primary_phone ? `+91-${settingsData.primary_phone}` : '')}
                    ${renderFieldRow('Secondary Phone', settingsData.secondary_phone ? `+91-${settingsData.secondary_phone}` : '')}
                    ${renderFieldRow('Contact Email', settingsData.contact_email)}
                </div>
                <div class="settings-edit-form">
                    <div class="settings-form-group">
                        <label>Primary Phone</label>
                        <input type="tel" id="edit-primary_phone" value="${settingsData.primary_phone || ''}" maxlength="10" placeholder="10-digit number">
                    </div>
                    <div class="settings-form-group">
                        <label>Secondary Phone (optional)</label>
                        <input type="tel" id="edit-secondary_phone" value="${settingsData.secondary_phone || ''}" maxlength="10" placeholder="10-digit number">
                    </div>
                    <div class="settings-form-group">
                        <label>Contact Email</label>
                        <input type="email" id="edit-contact_email" value="${settingsData.contact_email || ''}" placeholder="info@example.com">
                    </div>
                    <div class="settings-form-actions">
                        <button class="btn btn-outline cancel-edit-btn" data-section="contact">Cancel</button>
                        <button class="btn btn-primary save-edit-btn" data-section="contact">
                            <i class="fa-solid fa-check"></i> Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderInstituteTab() {
    return `
        <div class="settings-section" id="section-institute">
            <div class="settings-section-header">
                <h3 class="settings-section-title">
                    <i class="fa-solid fa-building"></i>
                    Institute Details
                </h3>
                <button class="settings-edit-btn" data-section="institute">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
            </div>
            <div class="settings-section-body">
                <div class="settings-display">
                    ${renderFieldRow('Institute Name', settingsData.institute_name)}
                    ${renderFieldRow('Address Line 1', settingsData.address_line_1)}
                    ${renderFieldRow('Address Line 2', settingsData.address_line_2)}
                    ${renderFieldRow('Address Line 3', settingsData.address_line_3)}
                    ${renderFieldRow('Address Line 4', settingsData.address_line_4)}
                    ${renderFieldRow('Pincode', settingsData.pincode)}
                    ${renderFieldRow('State', settingsData.state)}
                    ${renderFieldRow('Country', settingsData.country)}
                </div>
                <div class="settings-edit-form">
                    <div class="settings-form-group">
                        <label>Institute Name</label>
                        <input type="text" id="edit-institute_name" value="${settingsData.institute_name || ''}" disabled class="readonly">
                    </div>
                    <div class="settings-form-group">
                        <label>Address Line 1</label>
                        <input type="text" id="edit-address_line_1" value="${settingsData.address_line_1 || ''}" placeholder="Building / Plot No.">
                    </div>
                    <div class="settings-form-group">
                        <label>Address Line 2</label>
                        <input type="text" id="edit-address_line_2" value="${settingsData.address_line_2 || ''}" placeholder="Street / Landmark">
                    </div>
                    <div class="settings-form-group">
                        <label>Address Line 3</label>
                        <input type="text" id="edit-address_line_3" value="${settingsData.address_line_3 || ''}" placeholder="Area / Locality">
                    </div>
                    <div class="settings-form-group">
                        <label>Address Line 4</label>
                        <input type="text" id="edit-address_line_4" value="${settingsData.address_line_4 || ''}" placeholder="City">
                    </div>
                    <div class="settings-form-row">
                        <div class="settings-form-group">
                            <label>Pincode</label>
                            <input type="text" id="edit-pincode" value="${settingsData.pincode || ''}" maxlength="6" placeholder="500072">
                        </div>
                        <div class="settings-form-group">
                            <label>State</label>
                            <input type="text" id="edit-state" value="${settingsData.state || ''}" placeholder="Telangana">
                        </div>
                    </div>
                    <div class="settings-form-group">
                        <label>Country</label>
                        <input type="text" id="edit-country" value="${settingsData.country || ''}" placeholder="India">
                    </div>
                    <div class="settings-form-actions">
                        <button class="btn btn-outline cancel-edit-btn" data-section="institute">Cancel</button>
                        <button class="btn btn-primary save-edit-btn" data-section="institute">
                            <i class="fa-solid fa-check"></i> Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderBankTab() {
    return `
        <div class="settings-section" id="section-bank">
            <div class="settings-section-header">
                <h3 class="settings-section-title">
                    <i class="fa-solid fa-building-columns"></i>
                    Bank Details
                </h3>
                <button class="settings-edit-btn" data-section="bank">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
            </div>
            <div class="settings-section-body">
                <div class="settings-display">
                    ${renderFieldRow('Account Number', maskValue(settingsData.bank_account_number, 4))}
                    ${renderFieldRow('IFSC Code', settingsData.bank_ifsc_code)}
                    ${renderFieldRow('Branch', settingsData.bank_branch_name)}
                    ${renderFieldRow('UPI ID', maskValue(settingsData.upi_id, 4, '@'))}
                </div>
                <div class="settings-edit-form">
                    <div class="settings-form-group">
                        <label>Account Number</label>
                        <input type="text" id="edit-bank_account_number" value="${settingsData.bank_account_number || ''}" placeholder="Enter account number">
                    </div>
                    <div class="settings-form-group">
                        <label>IFSC Code</label>
                        <input type="text" id="edit-bank_ifsc_code" value="${settingsData.bank_ifsc_code || ''}" maxlength="11" placeholder="e.g. SBIN0001234" style="text-transform: uppercase;">
                        <div class="ifsc-branch-info" id="ifsc-branch-info">
                            <i class="fa-solid fa-check-circle"></i>
                            <span id="ifsc-branch-text"></span>
                        </div>
                    </div>
                    <div class="settings-form-group">
                        <label>UPI ID</label>
                        <input type="text" id="edit-upi_id" value="${settingsData.upi_id || ''}" placeholder="yourname@upi">
                    </div>
                    <div class="settings-form-actions">
                        <button class="btn btn-outline cancel-edit-btn" data-section="bank">Cancel</button>
                        <button class="btn btn-primary save-edit-btn" data-section="bank">
                            <i class="fa-solid fa-check"></i> Save Bank Details
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="settings-section" id="section-gst" style="margin-top: 2rem;">
            <div class="settings-section-header">
                <h3 class="settings-section-title">
                    <i class="fa-solid fa-file-invoice"></i>
                    GST Details
                </h3>
                <button class="settings-edit-btn" data-section="gst">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
            </div>
            <div class="settings-section-body">
                <div class="settings-display">
                    ${renderFieldRow('Course GST Rate', settingsData.course_gst_rate ? `${settingsData.course_gst_rate}%` : '18%')}
                    ${renderFieldRow('Service GST Rate', settingsData.service_gst_rate ? `${settingsData.service_gst_rate}%` : '18%')}
                </div>
                <div class="settings-edit-form">
                    <div class="form-row">
                        <div class="settings-form-group">
                            <label>Course GST Rate (%)</label>
                            <input type="number" id="edit-course_gst_rate" value="${settingsData.course_gst_rate || '18'}" placeholder="e.g. 18" step="0.01">
                            <span class="input-hint">Tax rate for academic courses</span>
                        </div>
                        <div class="settings-form-group">
                            <label>Service GST Rate (%)</label>
                            <input type="number" id="edit-service_gst_rate" value="${settingsData.service_gst_rate || '18'}" placeholder="e.g. 18" step="0.01">
                            <span class="input-hint">Tax rate for consulting/services</span>
                        </div>
                    </div>
                    <div class="settings-form-actions">
                        <button class="btn btn-outline cancel-edit-btn" data-section="gst">Cancel</button>
                        <button class="btn btn-primary save-edit-btn" data-section="gst">
                            <i class="fa-solid fa-check"></i> Save GST Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderSecurityTab() {
    return `
        <!-- Change Password Section -->
        <div class="settings-section">
            <div class="settings-section-header">
                <h3 class="settings-section-title">
                    <i class="fa-solid fa-key"></i>
                    Change Password
                </h3>
            </div>
            <div class="settings-section-body">
                <p class="settings-section-description">
                    Update your password regularly to keep your account secure.
                </p>
                <div class="password-row" style="margin-top: 0; align-items: flex-start;">
                    <button class="profile-change-password-btn" id="change-password-btn" style="margin-top: 0.5rem;">
                        <i class="fa-solid fa-key"></i> Change Password
                    </button>
                    <div class="password-last-updated" style="margin-top: 0.75rem;">
                        ${formatPasswordLastUpdated(currentAdmin?.password_updated_at)}
                    </div>
                </div>
            </div>
        </div>

        <!-- Session Timeout Section -->
        <div class="settings-section" style="margin-top: 2rem;" id="section-timeout">
            <div class="settings-section-header">
                <h3 class="settings-section-title">
                    <i class="fa-regular fa-clock"></i>
                    Session Timeout
                </h3>
            </div>
            <div class="settings-section-body">
                <p class="settings-section-description">
                    Automatically lock your session after a period of inactivity for enhanced security.
                </p>
                
                <div class="timeout-display-row" id="timeout-display-row">
                    <div class="timeout-current">
                        <i class="fa-solid fa-stopwatch"></i>
                        <span id="timeout-display">${getTimeoutLabel(settingsData.inactivity_timeout || '30')}</span>
                    </div>
                    <button class="settings-edit-btn" data-section="timeout">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                </div>
                
                <div class="settings-edit-form" id="timeout-edit-form" style="display: none;">
                    <div class="timeout-options-grid" id="timeout-options">
                        ${['1', '2', '5', '10', '15', '0'].map(val => `
                            <button class="timeout-option ${settingsData.inactivity_timeout === val ? 'selected' : ''}" data-value="${val}">
                                ${getTimeoutLabel(val)}
                            </button>
                        `).join('')}
                    </div>
                    <div class="settings-form-actions">
                        <button class="btn btn-outline cancel-edit-btn" data-section="timeout">Cancel</button>
                        <button class="btn btn-primary save-edit-btn" data-section="timeout">
                            <i class="fa-solid fa-check"></i> Save
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Data Retention Section -->
        <div class="settings-section" style="margin-top: 2rem;" id="section-retention">
            <div class="settings-section-header">
                <h3 class="settings-section-title">
                    <i class="fa-regular fa-trash-can"></i>
                    Data Retention
                </h3>
            </div>
            <div class="settings-section-body">
                <p class="settings-section-description">
                    Automatically permanently delete items from the Recovery Center after a set period.
                </p>
                <div class="timeout-display-row">
                    <div class="timeout-current">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                        <span id="retention-display">${getRetentionLabel(settingsData.retention_period || '30')}</span>
                    </div>
                    <button class="settings-edit-btn" data-section="retention">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                </div>
                <div class="settings-edit-form" id="retention-edit-form" style="display: none;">
                    <div class="timeout-options-grid" id="retention-options">
                        ${['7', '15', '30', 'never'].map(val => `
                            <button class="timeout-option retention-option ${(settingsData.retention_period || '30') === val ? 'selected' : ''}" data-value="${val}">
                                ${getRetentionLabel(val)}
                            </button>
                        `).join('')}
                    </div>
                    <div class="settings-form-actions">
                        <button class="btn btn-outline cancel-edit-btn" data-section="retention">Cancel</button>
                        <button class="btn btn-primary save-edit-btn" data-section="retention">
                            <i class="fa-solid fa-check"></i> Save
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Global Recovery Section -->
        <div class="settings-section" style="margin-top: 2rem;" id="section-recovery">
             <div class="settings-section-header">
                <h3 class="settings-section-title">
                    <i class="fa-solid fa-trash-arrow-up"></i>
                    Global Recovery
                </h3>
            </div>
            <div class="settings-section-body">
                 <p class="settings-section-description">
                    Bulk restore all recently deleted items by category.
                </p>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn btn-outline" onclick="recoverAll('students')">Recover Students</button>
                    <button class="btn btn-outline" onclick="recoverAll('clients')">Recover Clients</button>
                    <button class="btn btn-outline" onclick="recoverAll('inquiries')">Recover Inquiries</button>
                </div>
            </div>
        </div>
    `;
}


function renderFieldRow(label, value) {
    const isEmpty = !value || value === '—';
    return `
        <div class="settings-field-row">
            <span class="settings-field-label">${label}</span>
            <span class="settings-field-value ${isEmpty ? 'empty' : ''}">${value || '—'}</span>
        </div>
    `;
}

function maskValue(value, showLast = 4, separator = '') {
    if (!value) return '';
    if (separator) {
        const parts = value.split(separator);
        if (parts.length > 1) {
            return '****' + separator + parts[parts.length - 1];
        }
    }
    if (value.length <= showLast) return value;
    return '*'.repeat(value.length - showLast) + value.slice(-showLast);
}

function getTimeoutLabel(val) {
    if (val === '0' || val === 'never') return 'Never';
    return `${val} minute${val === '1' ? '' : 's'}`;
}

function getRetentionLabel(val) {
    if (val === 'never') return 'Never (Manual Empty)';
    return `After ${val} Days`;
}

function getRetentionLabel(val) {
    if (val === 'never') return 'Never (Manual Empty)';
    return `After ${val} Days`;
}

function getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Browser';
}

function getOSName() {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
}

function renderSessionsList() {
    if (sessionsData.length === 0) {
        return `
            <div class="session-item current">
                <div class="session-info">
                    <div class="session-icon">
                        <i class="fa-solid fa-desktop"></i>
                    </div>
                    <div class="session-details">
                        <span class="session-device">
                            ${getBrowserName()} – ${getOSName()}
                            <span class="session-badge">This Device</span>
                        </span>
                        <span class="session-meta">Session not tracked yet</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-primary" id="register-session-btn">
                    <i class="fa-solid fa-plus"></i> Register
                </button>
            </div>
        `;
    }

    return sessionsData.map(session => {
        const isCurrent = session.session_token === currentTabId;
        const icon = session.device_info?.includes('Android') || session.device_info?.includes('iOS')
            ? 'fa-mobile' : 'fa-desktop';

        return `
            <div class="session-item ${isCurrent ? 'current' : ''}" data-session-id="${session.id}">
                <div class="session-info">
                    <div class="session-icon">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div class="session-details">
                        <span class="session-device">
                            ${session.device_info || 'Unknown Device'}
                            ${isCurrent ? '<span class="session-badge">This Device</span>' : ''}
                        </span>
                        <span class="session-meta">
                            ${isCurrent ? 'Current session' : formatTimeAgo(session.last_active)}
                            ${session.ip_address ? ` • ${session.ip_address}` : ''}
                        </span>
                    </div>
                </div>
                ${!isCurrent ? `
                    <button class="session-logout-btn" data-device-info="${encodeURIComponent(session.device_info || 'Unknown Device')}">
                        Logout
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

function formatTimeAgo(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// =====================
// Bind Events
// =====================
function bindEvents() {
    const { Toast } = window.AdminUtils;

    // Edit buttons
    document.querySelectorAll('.settings-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            if (section === 'timeout') {
                document.getElementById('timeout-edit-form').style.display = 'block';
                btn.style.display = 'none';
            } else if (section === 'retention') {
                document.getElementById('retention-edit-form').style.display = 'block';
                btn.style.display = 'none';
            } else {
                // Refresh data before editing to avoid "showing 0" UX issue
                loadSettings().then(() => {
                    renderSettings();
                    document.getElementById(`section-${section}`).classList.add('editing');
                    bindEvents();
                });
            }
        });
    });

    // Cancel buttons
    document.querySelectorAll('.cancel-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            if (section === 'timeout') {
                document.getElementById('timeout-edit-form').style.display = 'none';
                document.querySelector('.settings-edit-btn[data-section="timeout"]').style.display = 'flex';
            } else if (section === 'retention') {
                document.getElementById('retention-edit-form').style.display = 'none';
                document.querySelector('.settings-edit-btn[data-section="retention"]').style.display = 'flex';
            } else {
                document.getElementById(`section-${section}`).classList.remove('editing');
                renderSettings();
                bindEvents();
            }
        });
    });

    // Save buttons
    document.querySelectorAll('.save-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => saveSection(btn.dataset.section));
    });

    // Timeout options
    document.querySelectorAll('.timeout-option').forEach(opt => {
        if (opt.classList.contains('retention-option')) return; // handled separately
        opt.addEventListener('click', () => {
            document.querySelectorAll('.timeout-option:not(.retention-option)').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });

    // Retention options
    document.querySelectorAll('.retention-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.retention-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });

    // IFSC Code lookup
    const ifscInput = document.getElementById('edit-bank_ifsc_code');
    if (ifscInput) {
        ifscInput.addEventListener('input', debounce(lookupIFSC, 500));
    }

    // Change Password
    document.getElementById('change-password-btn')?.addEventListener('click', openPasswordModal);
    document.getElementById('close-password-modal')?.addEventListener('click', closePasswordModal);
    document.getElementById('cancel-password-btn')?.addEventListener('click', closePasswordModal);
    document.getElementById('save-password-btn')?.addEventListener('click', savePassword);

    // Password toggles
    document.querySelectorAll('.password-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (input.type === 'password') {
                input.type = 'text';
                btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
            } else {
                input.type = 'password';
                btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
            }
        });
    });

    // Logout all sessions
    document.getElementById('logout-all-sessions-btn')?.addEventListener('click', logoutAllSessions);

    // Individual session logout (by device)
    document.querySelectorAll('.session-logout-btn').forEach(btn => {
        btn.addEventListener('click', () => logoutSessionsByDevice(decodeURIComponent(btn.dataset.deviceInfo)));
    });

    // Register session button
    document.getElementById('register-session-btn')?.addEventListener('click', registerCurrentSession);
}

// =====================
// Save Section
// =====================
async function saveSection(section) {
    const { Toast } = window.AdminUtils;
    const btn = document.querySelector(`.save-edit-btn[data-section="${section}"]`);
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        let keysToSave = [];

        if (section === 'institute') {
            keysToSave = ['address_line_1', 'address_line_2', 'address_line_3', 'address_line_4', 'pincode', 'state', 'country'];
        } else if (section === 'contact') {
            keysToSave = ['primary_phone', 'secondary_phone', 'contact_email'];
        } else if (section === 'bank') {
            keysToSave = ['bank_account_number', 'bank_ifsc_code', 'bank_branch_name', 'upi_id'];
            // Get branch name from lookup
            const branchText = document.getElementById('ifsc-branch-text')?.textContent || '';
            if (branchText && !branchText.includes('Invalid')) {
                document.getElementById('edit-bank_branch_name') || (settingsData.bank_branch_name = branchText);
            }
        } else if (section === 'gst') {
            keysToSave = ['course_gst_rate', 'service_gst_rate'];
        } else if (section === 'timeout') {
            const selected = document.querySelector('.timeout-option.selected');
            if (selected) {
                await upsertSetting('inactivity_timeout', selected.dataset.value);
                settingsData.inactivity_timeout = selected.dataset.value;
            }
            Toast.success('Saved', 'Timeout setting updated');
            renderSettings();
            bindEvents();
            return;
        } else if (section === 'retention') {
            const selected = document.querySelector('.retention-option.selected');
            if (selected) {
                await upsertSetting('retention_period', selected.dataset.value);
                settingsData.retention_period = selected.dataset.value;
            }
            Toast.success('Saved', 'Retention policy updated');
            renderSettings();
            bindEvents();
            return;
        }

        for (const key of keysToSave) {
            let value = document.getElementById(`edit-${key}`)?.value?.trim() || '';
            if (key === 'bank_ifsc_code') {
                value = value.toUpperCase();
            }
            if (key === 'bank_branch_name') {
                const branchInfo = document.getElementById('ifsc-branch-info');
                if (branchInfo && branchInfo.classList.contains('show') && !branchInfo.classList.contains('error')) {
                    value = document.getElementById('ifsc-branch-text')?.textContent || '';
                }
            }
            await upsertSetting(key, value);
            settingsData[key] = value;
        }

        Toast.success('Saved', 'Settings updated successfully');
        renderSettings();
        bindEvents();
    } catch (err) {
        console.error(err);
        Toast.error('Error', err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Save';
    }
}

async function upsertSetting(key, value) {
    const { data: existing } = await window.supabaseClient
        .from('settings')
        .select('id')
        .eq('setting_key', key)
        .single();

    if (existing) {
        const { error } = await window.supabaseClient
            .from('settings')
            .update({ setting_value: value, updated_at: new Date().toISOString() })
            .eq('setting_key', key);
        if (error) throw error;
    } else {
        const { error } = await window.supabaseClient
            .from('settings')
            .insert({ setting_key: key, setting_value: value });
        if (error) throw error;
    }
}

// =====================
// IFSC Lookup
// =====================
async function lookupIFSC() {
    const input = document.getElementById('edit-bank_ifsc_code');
    const infoDiv = document.getElementById('ifsc-branch-info');
    const textSpan = document.getElementById('ifsc-branch-text');
    const ifsc = input.value.trim().toUpperCase();

    if (ifsc.length !== 11) {
        infoDiv.classList.remove('show', 'error');
        return;
    }

    try {
        const response = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
        if (!response.ok) throw new Error('Invalid IFSC');

        const data = await response.json();
        textSpan.textContent = `${data.BANK}, ${data.BRANCH}`;
        infoDiv.classList.remove('error');
        infoDiv.classList.add('show');
        infoDiv.querySelector('i').className = 'fa-solid fa-check-circle';
    } catch (err) {
        textSpan.textContent = 'Invalid IFSC Code';
        infoDiv.classList.add('show', 'error');
        infoDiv.querySelector('i').className = 'fa-solid fa-exclamation-circle';
    }
}

function debounce(fn, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

// =====================
// Password Modal
// =====================
function openPasswordModal() {
    document.getElementById('password-modal').classList.add('active');
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
}

function closePasswordModal() {
    document.getElementById('password-modal').classList.remove('active');
}

async function savePassword() {
    const { Toast } = window.AdminUtils;
    const currentPwd = document.getElementById('current-password').value;
    const newPwd = document.getElementById('new-password').value;
    const confirmPwd = document.getElementById('confirm-password').value;

    if (!currentPwd || !newPwd || !confirmPwd) {
        Toast.error('Required', 'All fields are required');
        return;
    }

    if (newPwd.length < 8) {
        Toast.error('Weak Password', 'Password must be at least 8 characters');
        return;
    }

    if (newPwd !== confirmPwd) {
        Toast.error('Mismatch', 'Passwords do not match');
        return;
    }

    const btn = document.getElementById('save-password-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        // Re-authenticate with current password
        const { error: signInError } = await window.supabaseClient.auth.signInWithPassword({
            email: currentAdmin.email,
            password: currentPwd
        });

        if (signInError) {
            Toast.error('Failed', 'Current password is incorrect');
            return;
        }

        // Update password
        const { error: updateError } = await window.supabaseClient.auth.updateUser({
            password: newPwd
        });

        if (updateError) throw updateError;

        // Update password_updated_at in admins table
        await window.supabaseClient
            .from('admins')
            .update({ password_updated_at: new Date().toISOString() })
            .eq('id', currentAdmin.id);

        // Update local data
        currentAdmin.password_updated_at = new Date().toISOString();

        Toast.success('Updated', 'Password changed successfully');
        closePasswordModal();
        renderSettings();
        bindEvents();
    } catch (err) {
        console.error(err);
        Toast.error('Error', err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Password';
    }
}

// =====================
// Logout All Sessions
// =====================
async function logoutAllSessions() {
    const { Toast, Modal } = window.AdminUtils;

    Modal.confirm(
        'Logout All Sessions',
        'Are you sure you want to logout from all sessions? This will log you out from all devices.',
        async () => {
            try {
                // Delete all sessions from database
                await window.Auth.deleteAllSessions(currentAdmin.id);

                // Sign out globally
                const { error } = await window.supabaseClient.auth.signOut({ scope: 'global' });
                if (error) throw error;

                Toast.success('Done', 'Logged out from all sessions');
                setTimeout(() => {
                    window.location.href = '../login.html';
                }, 1000);
            } catch (err) {
                console.error(err);
                Toast.error('Error', err.message);
            }
        }
    );
}

// =====================
// Logout All Sessions for a Device
// =====================
async function logoutSessionsByDevice(deviceInfo) {
    const { Toast, Modal } = window.AdminUtils;

    Modal.confirm(
        'Logout Device',
        `Are you sure you want to logout all "${deviceInfo}" sessions?`,
        async () => {
            try {
                // Get all sessions for this admin
                const allSessions = await window.Auth.getSessions(currentAdmin.id);

                // Filter sessions matching this device_info
                const sessionsToDelete = allSessions.filter(s =>
                    (s.device_info || 'Unknown Device') === deviceInfo
                );

                // Delete each session
                for (const session of sessionsToDelete) {
                    await window.Auth.deleteSession(session.id);
                }

                Toast.success('Done', `Logged out ${sessionsToDelete.length} session(s)`);

                // Refresh sessions list
                await loadSessions();
                renderSettings();
                bindEvents();
            } catch (err) {
                console.error(err);
                Toast.error('Error', err.message);
            }
        }
    );
}

// Legacy function (kept for compatibility)
async function logoutSession(sessionId) {
    const { Toast, Modal } = window.AdminUtils;

    Modal.confirm(
        'Logout Device',
        'Are you sure you want to logout this device?',
        async () => {
            try {
                const result = await window.Auth.deleteSession(sessionId);
                if (!result.success) throw new Error(result.error);

                Toast.success('Done', 'Session logged out');

                await loadSessions();
                renderSettings();
                bindEvents();
            } catch (err) {
                console.error(err);
                Toast.error('Error', err.message);
            }
        }
    );
}

// =====================
// Register Current Session
// =====================
async function registerCurrentSession() {
    const { Toast } = window.AdminUtils;
    const btn = document.getElementById('register-session-btn');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    try {
        // Create session for current device
        const session = await window.supabaseConfig.getSession();
        if (session) {
            await window.Auth.createSession(currentAdmin.id);
            currentTabId = sessionStorage.getItem('tab_id');
        }

        Toast.success('Registered', 'Session is now being tracked');

        // Refresh sessions list
        await loadSessions();
        renderSettings();
        bindEvents();
    } catch (err) {
        console.error(err);
        Toast.error('Error', err.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-plus"></i> Register';
        }
    }
}
async function recoverAll(category) {
    const table = category === 'students' ? 'students' :
        category === 'clients' ? 'clients' : 'inquiries';

    window.AdminUtils.Modal.confirm(
        `Recover All ${category}`,
        `Are you sure you want to restore all deleted ${category}? They will reappear in the active lists.`,
        async () => {
            try {
                const { error } = await window.supabaseClient
                    .from(table)
                    .update({ deleted_at: null })
                    .not('deleted_at', 'is', null);

                if (error) throw error;

                window.AdminUtils.Toast.success('Restored', `All deleted ${category} have been recovered.`);
            } catch (e) {
                console.error('Bulk recover error:', e);
                window.AdminUtils.Toast.error('Error', 'Failed to recover items');
            }
        }
    );
}

window.recoverAll = recoverAll;
