// Tutors Page Logic

let allTutors = [];

// Load Tutors
async function loadTutors() {
    try {
        console.log('Loading tutors...');
        const snapshot = await db.collection('tutors').get();

        allTutors = [];
        let totalActive = 0;
        let totalOnline = 0;

        snapshot.forEach(doc => {
            const tutor = { id: doc.id, ...doc.data() };
            allTutors.push(tutor);

            if (tutor.status === 'active') totalActive++;
            if (tutor.mode === 'online' || tutor.mode === 'both') totalOnline++;
        });

        // Sort by name
        allTutors.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        console.log('Tutors loaded:', allTutors.length);

        // Update stats
        document.getElementById('totalTutors').textContent = allTutors.length;
        document.getElementById('activeTutors').textContent = totalActive;
        document.getElementById('onlineTutors').textContent = totalOnline;

        renderTutors(allTutors);

    } catch (error) {
        console.error('Error loading tutors:', error);
        showToast('Error loading tutors', 'error');
    }
}

// Render Tutors Table + Mobile Cards
function renderTutors(tutors) {
    const tbody = document.getElementById('tutorsTable');
    const mobileCards = document.getElementById('tutorsMobileCards');

    if (tutors.length === 0) {
        const emptyHTML = `
            <div class="empty-state" style="padding: 40px; text-align: center;">
                <span class="material-icons" style="font-size: 40px; color: #cbd5e1;">person_outline</span>
                <h3 style="margin-top: 12px; font-size: 1rem; font-weight: 600;">No tutors found</h3>
                <p style="color: #94a3b8; font-size: 0.85rem;">Get started by adding your first tutor</p>
                <div class="empty-state-action">
                    <button class="btn" onclick="openAddTutorModal()">
                        <span class="material-icons">add</span> New Tutor
                    </button>
                </div>
            </div>
        `;
        tbody.innerHTML = `<tr><td colspan="6">${emptyHTML}</td></tr>`;
        mobileCards.innerHTML = emptyHTML;
        return;
    }

    // Desktop Table
    tbody.innerHTML = tutors.map(tutor => {
        const statusClass = tutor.status === 'active' ? 'paid' : 'pending';
        const statusText = tutor.status === 'active' ? 'Active' : 'Inactive';

        const modeLabels = {
            'online': '🌐 Online',
            'offline': '🏢 Offline',
            'both': '🔄 Both'
        };

        const availLabels = {
            'weekdays': 'Weekdays',
            'weekends': 'Weekends',
            'flexible': 'Flexible',
            'fulltime': 'Full Time'
        };

        return `
            <tr>
                <td>
                    <strong>${tutor.name}</strong>
                    <br><small style="color: #64748b;">${tutor.phone || '-'}</small>
                </td>
                <td style="font-size: 0.8rem;">${tutor.subject || '-'}</td>
                <td>${modeLabels[tutor.mode] || tutor.mode}</td>
                <td><small>${availLabels[tutor.availability] || tutor.availability || '-'}</small></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-outline btn-sm btn-icon" onclick="openEditTutorModal('${tutor.id}')" title="Edit">
                            <span class="material-icons">edit</span>
                        </button>
                        <button class="btn btn-outline btn-sm btn-icon" onclick="deleteTutor('${tutor.id}')" title="Delete" style="color: #EF4444;">
                            <span class="material-icons">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Mobile Cards
    mobileCards.innerHTML = tutors.map(tutor => {
        const statusClass = tutor.status === 'active' ? 'paid' : 'pending';
        const statusText = tutor.status === 'active' ? 'Active' : 'Inactive';

        const modeLabels = {
            'online': 'Online',
            'offline': 'Offline',
            'both': 'Both'
        };

        return `
            <div class="mobile-card">
                <div class="mobile-card-header">
                    <div>
                        <div class="mobile-card-name">${tutor.name}</div>
                        <div class="mobile-card-sub">${tutor.phone || '-'}</div>
                    </div>
                    <div class="mobile-card-badge">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="mobile-card-row">
                    <span>Subject</span>
                    <span>${tutor.subject || '-'}</span>
                </div>
                <div class="mobile-card-row">
                    <span>Mode</span>
                    <span>${modeLabels[tutor.mode] || '-'}</span>
                </div>
                <div class="mobile-card-row">
                    <span>Availability</span>
                    <span>${tutor.availability || '-'}</span>
                </div>
                <div class="mobile-card-actions">
                    <button class="btn btn-outline btn-sm" onclick="openEditTutorModal('${tutor.id}')">
                        <span class="material-icons">edit</span> Edit
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="deleteTutor('${tutor.id}')" style="color: #EF4444;">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Filter Tutors
function filterTutors() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const subject = document.getElementById('subjectFilter').value;
    const mode = document.getElementById('modeFilter').value;

    let filtered = allTutors.filter(tutor => {
        const matchesSearch = !search ||
            (tutor.name && tutor.name.toLowerCase().includes(search)) ||
            (tutor.phone && tutor.phone.includes(search));

        const matchesSubject = !subject || tutor.subject === subject;
        const matchesMode = !mode || tutor.mode === mode;

        return matchesSearch && matchesSubject && matchesMode;
    });

    renderTutors(filtered);
}

// Event listeners for filters
document.getElementById('searchInput').addEventListener('input', filterTutors);
document.getElementById('subjectFilter').addEventListener('change', filterTutors);
document.getElementById('modeFilter').addEventListener('change', filterTutors);

// Open Edit Modal
function openEditTutorModal(tutorId) {
    const tutor = allTutors.find(t => t.id === tutorId);
    if (!tutor) return;

    document.getElementById('editTutorId').value = tutorId;
    document.getElementById('editTutorName').value = tutor.name || '';
    document.getElementById('editTutorPhone').value = tutor.phone || '';
    document.getElementById('editTutorEmail').value = tutor.email || '';
    setSelectedSubjects('editTutorSubjectsDropdown', tutor.subject || '');
    document.getElementById('editTutorMode').value = tutor.mode || 'offline';
    document.getElementById('editTutorAvailability').value = tutor.availability || 'weekdays';
    document.getElementById('editTutorStatus').value = tutor.status || 'active';
    document.getElementById('editTutorRate').value = tutor.rate || '';
    document.getElementById('editTutorNotes').value = tutor.notes || '';

    document.getElementById('editTutorModal').classList.add('active');
}

// Delete Tutor
async function deleteTutor(tutorId) {
    const confirmed = await showConfirm({
        title: 'Delete Tutor?',
        message: 'Are you sure you want to delete this tutor record?',
        confirmText: 'Yes, Delete',
        type: 'danger'
    });

    if (!confirmed) return;

    try {
        await db.collection('tutors').doc(tutorId).delete();
        showToast('Tutor deleted', 'success');
        loadTutors();
    } catch (error) {
        console.error('Error deleting tutor:', error);
        showToast('Error deleting tutor', 'error');
    }
}

// Modal Functions
function openAddTutorModal() {
    document.getElementById('addTutorForm').reset();
    // Reset the multi-select dropdown
    setSelectedSubjects('tutorSubjectsDropdown', []);
    document.getElementById('addTutorModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Click outside modal to close
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

// Add Tutor Form Handler
document.getElementById('addTutorForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('tutorName').value.trim();
    const phone = formatPhoneNumber(document.getElementById('tutorPhone').value.trim());
    const email = document.getElementById('tutorEmail').value.trim();
    const selectedSubjects = getSelectedSubjects('tutorSubjectsDropdown');
    const subject = selectedSubjects.join(', ');

    if (selectedSubjects.length === 0) {
        showToast('Please select at least one subject', 'error');
        return;
    }
    const mode = document.getElementById('tutorMode').value;
    const availability = document.getElementById('tutorAvailability').value;
    const status = document.getElementById('tutorStatus').value;
    const rate = parseInt(document.getElementById('tutorRate').value) || 0;
    const notes = document.getElementById('tutorNotes').value.trim();

    try {
        await db.collection('tutors').add({
            name,
            phone,
            email,
            subject,
            mode,
            availability,
            status,
            rate,
            notes,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Tutor added successfully!', 'success');
        closeModal('addTutorModal');
        document.getElementById('addTutorForm').reset();
        loadTutors();

    } catch (error) {
        console.error('Error adding tutor:', error);
        showToast('Error adding tutor', 'error');
    }
});

// Edit Tutor Form Handler
document.getElementById('editTutorForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const tutorId = document.getElementById('editTutorId').value;
    const selectedSubjects = getSelectedSubjects('editTutorSubjectsDropdown');

    if (selectedSubjects.length === 0) {
        showToast('Please select at least one subject', 'error');
        return;
    }

    try {
        await db.collection('tutors').doc(tutorId).update({
            name: document.getElementById('editTutorName').value.trim(),
            phone: formatPhoneNumber(document.getElementById('editTutorPhone').value.trim()),
            email: document.getElementById('editTutorEmail').value.trim(),
            subject: selectedSubjects.join(', '),
            mode: document.getElementById('editTutorMode').value,
            availability: document.getElementById('editTutorAvailability').value,
            status: document.getElementById('editTutorStatus').value,
            rate: parseInt(document.getElementById('editTutorRate').value) || 0,
            notes: document.getElementById('editTutorNotes').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Tutor updated!', 'success');
        closeModal('editTutorModal');
        loadTutors();

    } catch (error) {
        console.error('Error updating tutor:', error);
        showToast('Error updating tutor', 'error');
    }
});

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
window.openAddTutorModal = openAddTutorModal;
window.openEditTutorModal = openEditTutorModal;
window.deleteTutor = deleteTutor;
window.closeModal = closeModal;

// Multi-Select Dropdown Functions
function toggleMultiSelect(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.classList.toggle('open');
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.multi-select-dropdown')) {
        document.querySelectorAll('.multi-select-dropdown.open').forEach(d => d.classList.remove('open'));
    }
});

// Get selected values from a multi-select dropdown
function getSelectedSubjects(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Set selected values in a multi-select dropdown
function setSelectedSubjects(dropdownId, subjects) {
    const dropdown = document.getElementById(dropdownId);
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');

    // First uncheck all
    checkboxes.forEach(cb => cb.checked = false);

    // Then check the matching ones
    if (subjects && Array.isArray(subjects)) {
        subjects.forEach(sub => {
            const cb = dropdown.querySelector(`input[value="${sub}"]`);
            if (cb) cb.checked = true;
        });
    } else if (typeof subjects === 'string') {
        // Handle comma-separated string (backward compat)
        subjects.split(',').map(s => s.trim()).forEach(sub => {
            const cb = dropdown.querySelector(`input[value="${sub}"]`);
            if (cb) cb.checked = true;
        });
    }

    updateMultiSelectLabel(dropdownId);
}

// Update the label to show selected items
function updateMultiSelectLabel(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    const selected = getSelectedSubjects(dropdownId);
    const label = dropdown.querySelector('.selected-text');

    if (selected.length === 0) {
        label.textContent = 'Select subjects...';
        label.classList.remove('has-value');
    } else if (selected.length <= 2) {
        label.textContent = selected.join(', ');
        label.classList.add('has-value');
    } else {
        label.textContent = `${selected.length} subjects selected`;
        label.classList.add('has-value');
    }
}

// Listen for checkbox changes to update label
document.querySelectorAll('.multi-select-dropdown input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
        const dropdown = cb.closest('.multi-select-dropdown');
        updateMultiSelectLabel(dropdown.id);
    });
});

window.toggleMultiSelect = toggleMultiSelect;

// Load tutors on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadTutors, 500);
});

// Phone input validation
document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('input', function () {
        this.value = this.value.replace(/[^+0-9]/g, '').slice(0, 15);
    });
});
