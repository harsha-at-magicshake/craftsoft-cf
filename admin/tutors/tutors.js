// Tutors Module
let allTutors = [];
let allCoursesForTutors = [];

document.addEventListener('DOMContentLoaded', async () => {
    const { NavigationSecurity, Toast } = window.AdminUtils || {};

    // Check auth
    NavigationSecurity?.initProtectedPage();
    const session = await window.supabaseConfig?.getSession();
    if (!session) {
        NavigationSecurity?.secureRedirect('../login.html');
        return;
    }

    // Init sidebar
    AdminSidebar.init('tutors');

    // Render header
    document.getElementById('header-container').innerHTML = AdminHeader.render('Tutors');

    // Load data
    await loadCoursesForTutors();
    await loadTutors();

    // Bind add button
    document.getElementById('add-tutor-btn')?.addEventListener('click', () => openTutorForm());

    // Bind search
    document.getElementById('tutor-search')?.addEventListener('input', (e) => {
        filterTutors(e.target.value);
    });

    // Global event delegation for modals
    document.addEventListener('click', handleModalClicks);
});

// Load courses for tutor form
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

// Load tutors from Supabase
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

// Render tutors list
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
        <!-- Desktop Table -->
        <div class="data-table-wrapper">
            <table class="data-table" id="tutors-table">
                <thead>
                    <tr>
                        <th>Tutor ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Course(s)</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tutors.map(tutor => `
                        <tr data-id="${tutor.id}">
                            <td><span class="badge badge-primary">${tutor.tutor_id}</span></td>
                            <td>${tutor.full_name}</td>
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
        btn.addEventListener('click', () => openTutorForm(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete-tutor').forEach(btn => {
        btn.addEventListener('click', () => openDeleteTutorModal(btn.dataset.id, btn.dataset.name, btn.dataset.tutorId));
    });
}

// Filter tutors
function filterTutors(query) {
    const filtered = allTutors.filter(t =>
        t.full_name.toLowerCase().includes(query.toLowerCase()) ||
        t.phone.includes(query) ||
        t.tutor_id.toLowerCase().includes(query.toLowerCase())
    );
    renderTutorsList(filtered);
}

// Open add/edit tutor form (using inline form in content area)
async function openTutorForm(tutorId = null) {
    const { Toast } = window.AdminUtils;
    const tutorsContent = document.getElementById('tutors-content');
    const sectionActions = document.querySelector('.section-actions');
    const isEdit = !!tutorId;
    let tutor = null;

    // Hide header actions
    if (sectionActions) sectionActions.style.display = 'none';

    // Show loading
    tutorsContent.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';

    // Reload courses
    await loadCoursesForTutors();

    if (allCoursesForTutors.length === 0) {
        Toast.error('No Courses', 'Please sync courses first before adding tutors');
        if (sectionActions) sectionActions.style.display = '';
        renderTutorsList(allTutors);
        return;
    }

    // Fetch tutor data for edit
    if (isEdit) {
        const { data, error } = await window.supabaseClient
            .from('tutors')
            .select('*')
            .eq('id', tutorId)
            .single();

        if (error || !data) {
            Toast.error('Error', 'Could not load tutor data');
            if (sectionActions) sectionActions.style.display = '';
            renderTutorsList(allTutors);
            return;
        }
        tutor = data;
    }

    // Render inline form
    tutorsContent.innerHTML = `
        <div class="inline-form-container">
            <div class="inline-form-header">
                <button type="button" class="btn btn-outline" id="back-to-list">
                    <i class="fa-solid fa-arrow-left"></i> Back
                </button>
                <h3>${isEdit ? 'Edit Tutor' : 'Add Tutor'}</h3>
            </div>
            
            <div class="inline-form-body">
                ${isEdit ? `
                    <div class="form-group">
                        <label>Tutor ID</label>
                        <input type="text" value="${tutor.tutor_id}" disabled style="opacity: 0.6;">
                    </div>
                ` : ''}
                
                <div class="form-group">
                    <label>Full Name <span class="required">*</span></label>
                    <input type="text" id="tutor-name" value="${tutor?.full_name || ''}" placeholder="Enter full name">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Phone <span class="required">*</span></label>
                        <input type="tel" id="tutor-phone" maxlength="10" value="${tutor?.phone || ''}" placeholder="10-digit phone">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="tutor-email" value="${tutor?.email || ''}" placeholder="Email address">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>LinkedIn URL</label>
                    <input type="url" id="tutor-linkedin" value="${tutor?.linkedin_url || ''}" placeholder="https://linkedin.com/in/...">
                </div>
                
                <div class="form-group">
                    <label>Courses <span class="required">*</span></label>
                    <div class="checkbox-list">
                        ${allCoursesForTutors.map(c => `
                            <label class="checkbox-item">
                                <input type="checkbox" name="tutor-courses" value="${c.course_code}" 
                                    ${tutor?.courses?.includes(c.course_code) ? 'checked' : ''}>
                                <span>${c.course_code} - ${c.course_name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="inline-form-footer">
                <button type="button" class="btn btn-outline" id="cancel-form">Cancel</button>
                <button type="button" class="btn btn-primary" id="save-tutor-btn">
                    <i class="fa-solid fa-check"></i> ${isEdit ? 'Update Tutor' : 'Save Tutor'}
                </button>
            </div>
        </div>
    `;

    // Bind back/cancel buttons
    const goBack = () => {
        if (sectionActions) sectionActions.style.display = '';
        renderTutorsList(allTutors);
    };
    document.getElementById('back-to-list').addEventListener('click', goBack);
    document.getElementById('cancel-form').addEventListener('click', goBack);

    // Bind save button
    document.getElementById('save-tutor-btn').addEventListener('click', async () => {
        const saveBtn = document.getElementById('save-tutor-btn');
        const name = document.getElementById('tutor-name').value.trim();
        const phone = document.getElementById('tutor-phone').value.trim();
        const email = document.getElementById('tutor-email').value.trim();
        const linkedin = document.getElementById('tutor-linkedin').value.trim();
        const selectedCourses = Array.from(document.querySelectorAll('input[name="tutor-courses"]:checked'))
            .map(cb => cb.value);

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

            if (sectionActions) sectionActions.style.display = '';
            await loadTutors();

        } catch (error) {
            console.error('Save tutor error:', error);
            Toast.error('Error', error.message || 'Failed to save tutor');
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${isEdit ? 'Update Tutor' : 'Save Tutor'}`;
        }
    });
}

// Open delete confirmation
function openDeleteTutorModal(tutorId, tutorName, tutorIdCode) {
    const { Toast } = window.AdminUtils;
    const tutorsContent = document.getElementById('tutors-content');
    const sectionActions = document.querySelector('.section-actions');

    if (sectionActions) sectionActions.style.display = 'none';

    tutorsContent.innerHTML = `
        <div class="inline-form-container inline-delete">
            <div class="inline-form-header">
                <button type="button" class="btn btn-outline" id="back-to-list">
                    <i class="fa-solid fa-arrow-left"></i> Back
                </button>
                <h3>Delete Tutor</h3>
            </div>
            
            <div class="inline-form-body" style="text-align: center;">
                <div class="warning-icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <p>Are you sure you want to delete this tutor?</p>
                <p class="text-strong">${tutorName} (${tutorIdCode})</p>
                <p class="text-muted">This action cannot be undone.</p>
            </div>
            
            <div class="inline-form-footer">
                <button type="button" class="btn btn-outline" id="cancel-delete">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirm-delete-btn">
                    <i class="fa-solid fa-trash"></i> Delete Tutor
                </button>
            </div>
        </div>
    `;

    const goBack = () => {
        if (sectionActions) sectionActions.style.display = '';
        renderTutorsList(allTutors);
    };
    document.getElementById('back-to-list').addEventListener('click', goBack);
    document.getElementById('cancel-delete').addEventListener('click', goBack);

    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
        const deleteBtn = document.getElementById('confirm-delete-btn');
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

        try {
            const { error } = await window.supabaseClient
                .from('tutors')
                .delete()
                .eq('id', tutorId);

            if (error) throw error;

            Toast.success('Deleted', 'Tutor deleted successfully');
            if (sectionActions) sectionActions.style.display = '';
            await loadTutors();

        } catch (error) {
            console.error('Delete tutor error:', error);
            Toast.error('Error', 'Failed to delete tutor');
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Tutor';
        }
    });
}

// Handle modal clicks (event delegation)
function handleModalClicks(e) {
    const target = e.target;

    if (target.closest('.modal-close')) {
        e.preventDefault();
        const modal = target.closest('.modal-overlay');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    }

    if (target.classList.contains('modal-overlay')) {
        target.remove();
        document.body.style.overflow = '';
    }
}
