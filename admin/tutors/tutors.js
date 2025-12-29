// Tutors Module
let allTutors = [];
let allCoursesForTutors = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    const { NavigationSecurity } = window.AdminUtils || {};
    // NavigationSecurity.initProtectedPage();
    const session = await window.supabaseConfig.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }

    // Init Sidebar
    AdminSidebar.init('tutors');

    // Render Header
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = AdminHeader.render('Tutors');
        // Note: The Add button is inside content-card in HTML, so we don't need it in header actions
    }

    // Load Data
    await loadCoursesForTutors();
    await loadTutors();

    // Bind Add Button (in content area)
    document.getElementById('add-tutor-btn')?.addEventListener('click', () => openTutorModal());

    // Bind Search
    document.getElementById('tutor-search')?.addEventListener('input', (e) => {
        filterTutors(e.target.value);
    });
});

async function loadCoursesForTutors() {
    const { data, error } = await window.supabaseClient
        .from('courses')
        .select('course_code, course_name')
        .eq('status', 'ACTIVE')
        .order('course_code');

    if (!error && data) {
        allCoursesForTutors = data;
    }
}

async function loadTutors() {
    const { Toast } = window.AdminUtils;
    const tutorsContent = document.getElementById('tutors-content');

    try {
        const { data: tutors, error } = await window.supabaseClient
            .from('tutors')
            .select('*')
            .eq('status', 'ACTIVE')
            .order('tutor_id', { ascending: true });

        if (error) throw error;

        allTutors = tutors || [];
        renderTutorsList(allTutors);

    } catch (error) {
        console.error('Load tutors error:', error);
        tutorsContent.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-exclamation-triangle"></i>
                <p>Failed to load tutors. Please try again.</p>
            </div>
        `;
    }
}

function renderTutorsList(tutors) {
    const tutorsContent = document.getElementById('tutors-content');

    if (!tutors || tutors.length === 0) {
        tutorsContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fa-solid fa-chalkboard-user"></i>
                </div>
                <h3>No tutors yet</h3>
                <p>Click "Add Tutor" to add your first tutor</p>
            </div>
        `;
        return;
    }

    tutorsContent.innerHTML = `
        <div class="data-table-wrapper">
            <table class="data-table" id="tutors-table">
                <thead>
                    <tr>
                        <th>Tutor ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Courses</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tutors.map(tutor => `
                        <tr data-id="${tutor.id}">
                            <td><span class="badge badge-primary">${tutor.tutor_id}</span></td>
                            <td><strong>${tutor.full_name}</strong></td>
                            <td>${tutor.phone}</td>
                            <td>${(tutor.courses || []).join(', ') || '-'}</td>
                            <td class="actions-cell">
                                <button class="btn-icon btn-edit-tutor" data-id="${tutor.id}" title="Edit">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button class="btn-icon btn-delete-tutor" data-id="${tutor.id}" data-name="${tutor.full_name}" data-tutor-id="${tutor.tutor_id}" title="Delete">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                                <a href="https://wa.me/91${tutor.phone.replace(/\D/g, '')}" target="_blank" class="btn-icon btn-whatsapp-tutor" title="WhatsApp">
                                    <i class="fa-brands fa-whatsapp"></i>
                                </a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <!-- Mobile Cards -->
        <div class="data-cards" id="tutors-cards">
            ${tutors.map(tutor => `
                <div class="data-card" data-id="${tutor.id}">
                    <div class="data-card-header">
                        <span class="badge badge-primary">${tutor.tutor_id}</span>
                    </div>
                    <div class="data-card-body">
                        <h4>${tutor.full_name}</h4>
                        <p class="data-card-meta"><i class="fa-solid fa-phone"></i> ${tutor.phone}</p>
                        <p class="data-card-meta"><i class="fa-solid fa-book"></i> ${(tutor.courses || []).join(', ') || 'No courses'}</p>
                    </div>
                    <div class="data-card-actions">
                        <button class="btn btn-sm btn-outline btn-edit-tutor" data-id="${tutor.id}">
                            <i class="fa-solid fa-pen"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline btn-danger btn-delete-tutor" data-id="${tutor.id}" data-name="${tutor.full_name}" data-tutor-id="${tutor.tutor_id}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                        <a href="https://wa.me/91${tutor.phone.replace(/\D/g, '')}" target="_blank" class="btn btn-sm btn-whatsapp">
                            <i class="fa-brands fa-whatsapp"></i>
                        </a>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="table-footer">
            <span>${tutors.length} tutor${tutors.length !== 1 ? 's' : ''}</span>
        </div>
    `;

    // Bind action buttons
    document.querySelectorAll('.btn-edit-tutor').forEach(btn => {
        btn.addEventListener('click', () => openTutorModal(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete-tutor').forEach(btn => {
        btn.addEventListener('click', () => openDeleteTutorModal(btn.dataset.id, btn.dataset.name, btn.dataset.tutorId));
    });
}

function filterTutors(query) {
    const filtered = allTutors.filter(t =>
        t.full_name.toLowerCase().includes(query.toLowerCase()) ||
        t.phone.includes(query) ||
        t.tutor_id.toLowerCase().includes(query.toLowerCase())
    );
    renderTutorsList(filtered);
}

// Open add/edit tutor modal (with FIX for z-index/display issues via dynamic creation and setTimeout)
async function openTutorModal(tutorId = null) {
    const { Toast } = window.AdminUtils;
    const isEdit = !!tutorId;
    let tutor = null;

    // Reload courses for the select
    await loadCoursesForTutors();

    if (allCoursesForTutors.length === 0) {
        Toast.error('No Courses', 'Please sync courses first before adding tutors');
        return;
    }

    if (isEdit) {
        const { data, error } = await window.supabaseClient
            .from('tutors')
            .select('*')
            .eq('id', tutorId)
            .single();

        if (error || !data) {
            Toast.error('Error', 'Could not load tutor data');
            return;
        }
        tutor = data;
    }

    const coursesCheckboxes = allCoursesForTutors.map(c => `
        <label class="checkbox-item">
            <input type="checkbox" name="tutor-courses" value="${c.course_code}" 
                ${tutor && tutor.courses?.includes(c.course_code) ? 'checked' : ''}>
            <span>${c.course_code} - ${c.course_name}</span>
        </label>
    `).join('');

    const modalHTML = `
        <div class="modal-overlay active" id="tutor-modal">
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit Tutor' : 'Add Tutor'}</h3>
                    <button type="button" class="modal-close" id="close-tutor-modal">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${isEdit ? `
                        <div class="form-group">
                            <label>Tutor ID</label>
                            <input type="text" value="${tutor.tutor_id}" disabled class="input-locked">
                        </div>
                    ` : ''}
                    <div class="form-group">
                        <label>Name <span class="required">*</span></label>
                        <input type="text" id="tutor-name" value="${tutor?.full_name || ''}" placeholder="Enter full name" required>
                    </div>
                    <div class="form-group">
                        <label>Phone <span class="required">*</span></label>
                        <input type="tel" id="tutor-phone" value="${tutor?.phone || ''}" placeholder="10-digit mobile number" maxlength="10" required>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="tutor-email" value="${tutor?.email || ''}" placeholder="email@example.com">
                    </div>
                    <div class="form-group">
                        <label>LinkedIn URL</label>
                        <input type="url" id="tutor-linkedin" value="${tutor?.linkedin_url || ''}" placeholder="https://linkedin.com/in/...">
                    </div>
                    <div class="form-group">
                        <label>Courses <span class="required">*</span></label>
                        <div class="checkbox-list" id="tutor-courses-list">
                            ${coursesCheckboxes || '<p class="text-muted">No courses available. Sync courses first.</p>'}
                        </div>
                        <span class="input-hint">Select courses this tutor can teach</span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" id="cancel-tutor-btn">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-tutor-btn">
                        <i class="fa-solid fa-check"></i> ${isEdit ? 'Update Tutor' : 'Save Tutor'}
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    // Use setTimeout to ensure DOM is fully ready
    setTimeout(() => {
        const modal = document.getElementById('tutor-modal');
        if (!modal) return;

        const closeBtn = modal.querySelector('#close-tutor-modal');
        const cancelBtn = modal.querySelector('#cancel-tutor-btn');
        const saveBtn = modal.querySelector('#save-tutor-btn');

        const closeModal = () => {
            modal.remove();
            document.body.style.overflow = '';
        };

        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal();
        });
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        saveBtn.addEventListener('click', async () => {
            const name = document.getElementById('tutor-name').value.trim();
            const phone = document.getElementById('tutor-phone').value.trim();
            const email = document.getElementById('tutor-email').value.trim();
            const linkedin = document.getElementById('tutor-linkedin').value.trim();
            const selectedCourses = Array.from(document.querySelectorAll('input[name="tutor-courses"]:checked'))
                .map(cb => cb.value);

            // Validation
            if (!name) {
                Toast.error('Required', 'Please enter tutor name');
                return;
            }
            if (!phone || phone.length !== 10) {
                Toast.error('Required', 'Please enter valid 10-digit phone');
                return;
            }
            if (selectedCourses.length === 0) {
                Toast.error('Required', 'Please select at least one course');
                return;
            }

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            try {
                if (isEdit) {
                    // Update
                    const { error } = await window.supabaseClient
                        .from('tutors')
                        .update({
                            full_name: name,
                            phone: phone,
                            email: email || null,
                            linkedin_url: linkedin || null,
                            courses: selectedCourses
                        })
                        .eq('id', tutorId);

                    if (error) throw error;
                    Toast.success('Updated', 'Tutor updated successfully');
                } else {
                    // Generate new tutor ID
                    const { data: maxData } = await window.supabaseClient
                        .from('tutors')
                        .select('tutor_id')
                        .order('tutor_id', { ascending: false })
                        .limit(1);

                    let nextNum = 1;
                    if (maxData && maxData.length > 0) {
                        const match = maxData[0].tutor_id.match(/T-ACS-(\d+)/);
                        if (match) nextNum = parseInt(match[1]) + 1;
                    }
                    const newTutorId = `T-ACS-${String(nextNum).padStart(3, '0')}`;

                    // Insert
                    const { error } = await window.supabaseClient
                        .from('tutors')
                        .insert({
                            tutor_id: newTutorId,
                            full_name: name,
                            phone: phone,
                            email: email || null,
                            linkedin_url: linkedin || null,
                            courses: selectedCourses,
                            status: 'ACTIVE'
                        });

                    if (error) throw error;
                    Toast.success('Added', 'Tutor added successfully');
                }

                closeModal();
                await loadTutors();

            } catch (error) {
                console.error('Save tutor error:', error);
                Toast.error('Error', error.message || 'Failed to save tutor');
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Update Tutor' : 'Save Tutor'}`;
            }
        });
    }, 0);
}

function openDeleteTutorModal(tutorId, tutorName, tutorIdCode) {
    const { Toast } = window.AdminUtils;

    const modalHTML = `
        <div class="modal-overlay active" id="delete-tutor-modal">
            <div class="modal-container modal-sm">
                <div class="modal-header">
                    <h3>Delete Tutor</h3>
                    <button type="button" class="modal-close" id="close-delete-modal">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body text-center">
                    <div class="warning-icon">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <p>Are you sure you want to delete this tutor?</p>
                    <p class="text-strong">${tutorName} (${tutorIdCode})</p>
                    <p class="text-muted">This action cannot be undone.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" id="cancel-delete-btn">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirm-delete-btn">
                        <i class="fa-solid fa-trash"></i> Delete Tutor
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    // Timeout for safety
    setTimeout(() => {
        const modal = document.getElementById('delete-tutor-modal');
        const closeBtn = document.getElementById('close-delete-modal');
        const cancelBtn = document.getElementById('cancel-delete-btn');
        const confirmBtn = document.getElementById('confirm-delete-btn');

        const closeModal = () => {
            modal.remove();
            document.body.style.overflow = '';
        };

        closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
        cancelBtn.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        confirmBtn.addEventListener('click', async () => {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

            try {
                const { error } = await window.supabaseClient
                    .from('tutors')
                    .delete()
                    .eq('id', tutorId);

                if (error) throw error;

                Toast.success('Deleted', 'Tutor deleted successfully');
                closeModal();
                await loadTutors();

            } catch (error) {
                console.error('Delete tutor error:', error);
                Toast.error('Error', 'Failed to delete tutor');
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Tutor';
            }
        });
    }, 0);
}
