/**
 * Tutors Management Module
 * Phase 3: Tutor CRUD Operations
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ============================================
    // COURSES DATA (Synced with website order)
    // ============================================
    const COURSES = [
        { code: '01', name: 'Graphic Design', category: 'Design' },
        { code: '02', name: 'UI/UX Design', category: 'Design' },
        { code: '03', name: 'Full Stack Development (MERN)', category: 'Engineering' },
        { code: '04', name: 'Python Full Stack Development', category: 'Engineering' },
        { code: '05', name: 'Java Full Stack Development', category: 'Engineering' },
        { code: '06', name: 'DSA Mastery', category: 'Engineering' },
        { code: '07', name: 'Data Analytics', category: 'Engineering' },
        { code: '08', name: 'Salesforce Administration', category: 'Engineering' },
        { code: '09', name: 'Python Programming', category: 'Engineering' },
        { code: '10', name: 'React JS', category: 'Engineering' },
        { code: '11', name: 'Git & GitHub', category: 'Engineering' },
        { code: '12', name: 'DevOps Engineering', category: 'Cloud' },
        { code: '13', name: 'AWS Cloud Excellence', category: 'Cloud' },
        { code: '14', name: 'DevSecOps', category: 'Cloud' },
        { code: '15', name: 'Microsoft Azure', category: 'Cloud' },
        { code: '16', name: 'Automation with Python', category: 'Cloud' },
        { code: '17', name: 'Spoken English Mastery', category: 'Soft Skills' },
        { code: '18', name: 'Soft Skills Training', category: 'Soft Skills' },
        { code: '19', name: 'Resume Writing & Interview Prep', category: 'Soft Skills' },
        { code: '20', name: 'Handwriting Improvement', category: 'Soft Skills' }
    ];

    // Pagination Settings
    const ITEMS_PER_PAGE = 10;

    // ============================================
    // DOM Elements
    // ============================================
    const addTutorBtn = document.getElementById('addTutorBtn');
    const tutorModalOverlay = document.getElementById('tutorModalOverlay');
    const closeTutorModal = document.getElementById('closeTutorModal');
    const cancelTutorBtn = document.getElementById('cancelTutorBtn');
    const saveTutorBtn = document.getElementById('saveTutorBtn');
    const tutorForm = document.getElementById('tutorForm');
    const tutorsTableBody = document.getElementById('tutorsTableBody');
    const tutorsCards = document.getElementById('tutorsCards');
    const emptyState = document.getElementById('emptyState');
    const tutorSearch = document.getElementById('tutorSearch');

    // Form Elements
    const coursesTrigger = document.getElementById('tutorCoursesTrigger');
    const coursesOptions = document.getElementById('tutorCoursesOptions');
    const selectedCoursesContainer = document.getElementById('selectedTutorCourses');

    // Filter & Pagination Elements
    const courseFilter = document.getElementById('courseFilter');
    const modeFilter = document.getElementById('modeFilter');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const paginationInfo = document.getElementById('paginationInfo');

    // State
    let tutors = [];
    let selectedCourses = [];
    let editingTutorId = null;
    let currentPage = 1;
    let filteredTutors = [];

    // ============================================
    // Initialize
    // ============================================
    initCoursesDropdown();
    initCourseFilter();
    await loadTutors();

    // ============================================
    // Course Filter Dropdown
    // ============================================
    function initCourseFilter() {
        courseFilter.innerHTML = '<option value="">All Courses</option>' +
            COURSES.map(c => `<option value="${c.code}">${c.name}</option>`).join('');

        courseFilter.addEventListener('change', () => {
            currentPage = 1;
            applyFiltersAndSort();
        });

        modeFilter.addEventListener('change', () => {
            currentPage = 1;
            applyFiltersAndSort();
        });
    }

    // ============================================
    // Courses Multi-Select Dropdown
    // ============================================
    function initCoursesDropdown() {
        coursesOptions.innerHTML = COURSES.map(course => `
            <div class="multi-select-option" data-code="${course.code}">
                <input type="checkbox" id="tutor_course_${course.code}">
                <label for="tutor_course_${course.code}">${course.name}</label>
            </div>
        `).join('');

        coursesTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            coursesOptions.classList.toggle('active');
        });

        attachCourseOptionListeners();

        document.addEventListener('click', () => {
            coursesOptions.classList.remove('active');
        });
    }

    function attachCourseOptionListeners() {
        coursesOptions.querySelectorAll('.multi-select-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = option.dataset.code;
                const checkbox = option.querySelector('input');

                checkbox.checked = !checkbox.checked;
                option.classList.toggle('selected', checkbox.checked);

                if (checkbox.checked && !selectedCourses.includes(code)) {
                    selectedCourses.push(code);
                } else if (!checkbox.checked) {
                    selectedCourses = selectedCourses.filter(c => c !== code);
                }

                updateSelectedTags();
            });
        });
    }

    function updateSelectedTags() {
        if (selectedCourses.length === 0) {
            coursesTrigger.innerHTML = '<span class="placeholder">Select courses...</span><i class="fas fa-chevron-down"></i>';
            selectedCoursesContainer.innerHTML = '';
            return;
        }

        coursesTrigger.innerHTML = `<span>${selectedCourses.length} course(s) selected</span><i class="fas fa-chevron-down"></i>`;

        selectedCoursesContainer.innerHTML = selectedCourses.map(code => {
            const course = COURSES.find(c => c.code === code);
            return `
                <span class="selected-tag" data-code="${code}">
                    ${course.name}
                    <i class="fas fa-times remove-tag"></i>
                </span>
            `;
        }).join('');

        selectedCoursesContainer.querySelectorAll('.remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const code = e.target.closest('.selected-tag').dataset.code;
                selectedCourses = selectedCourses.filter(c => c !== code);

                const option = coursesOptions.querySelector(`[data-code="${code}"]`);
                if (option) {
                    option.classList.remove('selected');
                    option.querySelector('input').checked = false;
                }

                updateSelectedTags();
            });
        });
    }

    // ============================================
    // Modal Controls
    // ============================================
    function openModal(editing = false) {
        tutorModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (!editing) {
            document.getElementById('tutorModalTitle').textContent = 'Add New Tutor';
            saveTutorBtn.querySelector('span').textContent = 'Save Tutor';
            tutorForm.reset();
            document.getElementById('tutorCountryCode').value = '+91';
            resetCourseSelection();
        }
    }

    function closeModal() {
        tutorModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        editingTutorId = null;
        tutorForm.reset();
        resetCourseSelection();
    }

    function resetCourseSelection() {
        selectedCourses = [];
        coursesOptions.querySelectorAll('.multi-select-option').forEach(opt => {
            opt.classList.remove('selected');
            opt.querySelector('input').checked = false;
        });
        updateSelectedTags();
    }

    addTutorBtn.addEventListener('click', () => openModal(false));
    closeTutorModal.addEventListener('click', closeModal);
    cancelTutorBtn.addEventListener('click', closeModal);
    tutorModalOverlay.addEventListener('click', (e) => {
        if (e.target === tutorModalOverlay) closeModal();
    });

    // ============================================
    // Generate Tutor ID
    // ============================================
    function generateTutorId() {
        const sequence = (tutors.length + 1).toString().padStart(3, '0');
        return `T-ACS-${sequence}`;
    }

    // ============================================
    // Save Tutor
    // ============================================
    saveTutorBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value.trim();
        const phone = document.getElementById('tutorPhone').value.trim();
        const teachingMode = document.getElementById('teachingMode').value;
        const availability = document.getElementById('availability').value;

        if (!fullName) {
            window.toast.warning('Required', 'Please enter full name');
            return;
        }

        if (!phone || phone.length < 10) {
            window.toast.warning('Required', 'Please enter a valid phone number');
            return;
        }

        if (selectedCourses.length === 0) {
            window.toast.warning('Required', 'Please select at least one course');
            return;
        }

        if (!teachingMode) {
            window.toast.warning('Required', 'Please select teaching mode');
            return;
        }

        if (!availability) {
            window.toast.warning('Required', 'Please select availability');
            return;
        }

        const countryCode = document.getElementById('tutorCountryCode').value.trim() || '+91';
        const fullPhone = countryCode + phone.replace(/\D/g, '');

        // Supabase data (only fields in table)
        const tutorData = {
            id: editingTutorId || generateTutorId(),
            name: fullName,
            phone: fullPhone,
            email: document.getElementById('tutorEmail').value.trim() || null,
            courses: [...selectedCourses],
            status: 'active',
            notes: document.getElementById('tutorNotes').value.trim() || null
        };

        // Extra fields for localStorage (not in Supabase)
        const localExtraData = {
            linkedin: document.getElementById('linkedin').value.trim() || null,
            teaching_mode: teachingMode,
            availability: availability
        };

        saveTutorBtn.disabled = true;
        saveTutorBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            if (editingTutorId) {
                // Update in Supabase
                const { error } = await window.supabaseClient
                    .from('tutors')
                    .update(tutorData)
                    .eq('id', editingTutorId);

                if (error) throw error;

                const index = tutors.findIndex(t => t.id === editingTutorId);
                if (index !== -1) {
                    tutors[index] = { ...tutors[index], ...tutorData, ...localExtraData };
                }
                window.toast.success('Updated', 'Tutor updated successfully');
            } else {
                // Insert to Supabase
                const { error } = await window.supabaseClient
                    .from('tutors')
                    .insert([tutorData]);

                if (error) throw error;

                tutors.push({ ...tutorData, ...localExtraData, created_at: new Date().toISOString() });
                window.toast.success('Added', 'Tutor added successfully');
            }

            saveTutorsToStorage();
            applyFiltersAndSort();
            updateDashboardStats();
            closeModal();

        } catch (error) {
            console.error('Error saving tutor:', error);
            window.toast.error('Error', 'Failed to save tutor: ' + error.message);
        } finally {
            saveTutorBtn.disabled = false;
            saveTutorBtn.innerHTML = '<i class="fas fa-save"></i> <span>Save Tutor</span>';
        }
    });

    // ============================================
    // Load Tutors
    // ============================================
    async function loadTutors() {
        try {
            // Try loading from Supabase first
            const { data: supabaseTutors, error } = await window.supabaseClient
                .from('tutors')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Supabase load failed, using localStorage:', error.message);
                const stored = localStorage.getItem('craftsoft_tutors');
                tutors = stored ? JSON.parse(stored) : [];
            } else {
                // Supabase is source of truth - sync to localStorage
                tutors = supabaseTutors || [];
                saveTutorsToStorage();
            }

            // Seed mock data if empty
            if (tutors.length === 0) {
                const mockTutors = [
                    {
                        id: 'T-ACS-001',
                        name: 'Sneha Reddy',
                        phone: '+919876543210',
                        email: 'sneha@craftsoft.co.in',
                        courses: ['01', '02'],
                        linkedin: 'https://linkedin.com/in/snehareddy',
                        teaching_mode: 'both',
                        availability: 'flexible',
                        status: 'active',
                        notes: 'Design specialist with 5+ years experience',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'T-ACS-002',
                        name: 'Ravi Kumar',
                        phone: '+918765432109',
                        email: 'ravi@craftsoft.co.in',
                        courses: ['03', '04', '05', '09', '10'],
                        linkedin: 'https://linkedin.com/in/ravikumar',
                        teaching_mode: 'online',
                        availability: 'weekdays',
                        status: 'active',
                        notes: 'Full stack expert, MERN specialist',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'T-ACS-003',
                        name: 'Arun Mehta',
                        phone: '+919988776655',
                        email: 'arun@craftsoft.co.in',
                        courses: ['12', '13', '14', '15', '16'],
                        linkedin: 'https://linkedin.com/in/arunmehta',
                        teaching_mode: 'both',
                        availability: 'weekends',
                        status: 'active',
                        notes: 'DevOps & Cloud certified trainer',
                        created_at: new Date().toISOString()
                    }
                ];

                // Insert mock data to Supabase
                for (const tutor of mockTutors) {
                    const { id, name, phone, email, courses, status, notes } = tutor;
                    await window.supabaseClient
                        .from('tutors')
                        .insert([{ id, name, phone, email, courses, status, notes }])
                        .catch(e => console.warn('Mock insert skipped:', e.message));
                }

                tutors = mockTutors;
                saveTutorsToStorage();
            }

            applyFiltersAndSort();
            updateDashboardStats();

        } catch (error) {
            console.error('Error loading tutors:', error);
            const stored = localStorage.getItem('craftsoft_tutors');
            tutors = stored ? JSON.parse(stored) : [];
            applyFiltersAndSort();
        }
    }

    function saveTutorsToStorage() {
        localStorage.setItem('craftsoft_tutors', JSON.stringify(tutors));
    }

    // ============================================
    // Filtering & Sorting
    // ============================================
    function applyFiltersAndSort() {
        let result = [...tutors];

        // Search filter
        const searchQuery = tutorSearch.value.toLowerCase().trim();
        if (searchQuery) {
            result = result.filter(t =>
                t.name.toLowerCase().includes(searchQuery) ||
                t.id.toLowerCase().includes(searchQuery) ||
                t.phone.includes(searchQuery) ||
                (t.email && t.email.toLowerCase().includes(searchQuery))
            );
        }

        // Course filter
        const selectedCourse = courseFilter.value;
        if (selectedCourse) {
            result = result.filter(t => t.courses && t.courses.includes(selectedCourse));
        }

        // Mode filter
        const selectedMode = modeFilter.value;
        if (selectedMode) {
            result = result.filter(t => t.teaching_mode === selectedMode);
        }

        // Sort by newest
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        filteredTutors = result;
        renderTutors();
    }

    tutorSearch.addEventListener('input', () => {
        currentPage = 1;
        applyFiltersAndSort();
    });

    // ============================================
    // Pagination
    // ============================================
    function getTotalPages() {
        return Math.ceil(filteredTutors.length / ITEMS_PER_PAGE) || 1;
    }

    function getPageData() {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredTutors.slice(start, end);
    }

    function updatePagination() {
        const totalPages = getTotalPages();
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTutors();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage < getTotalPages()) {
            currentPage++;
            renderTutors();
        }
    });

    // ============================================
    // Render Tutors
    // ============================================
    function renderTutors() {
        const data = getPageData();

        // Hide skeletons
        const skeletonTable = document.getElementById('skeletonTable');
        const skeletonCards = document.getElementById('skeletonCards');
        if (skeletonTable) skeletonTable.style.display = 'none';
        if (skeletonCards) skeletonCards.style.display = 'none';

        if (filteredTutors.length === 0) {
            tutorsTableBody.innerHTML = '';
            tutorsCards.innerHTML = '';
            tutorsCards.style.display = 'none';
            emptyState.style.display = 'block';
            document.querySelector('.data-table').style.display = 'none';
            document.getElementById('pagination').style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        document.querySelector('.data-table').style.display = 'table';
        tutorsCards.style.display = '';
        document.getElementById('pagination').style.display = 'flex';
        updatePagination();

        const modeLabels = { offline: 'Offline', online: 'Online', both: 'Both' };
        const availLabels = { weekdays: 'Weekdays', weekends: 'Weekends', flexible: 'Flexible' };

        // Table View (Desktop)
        tutorsTableBody.innerHTML = data.map(tutor => `
            <tr data-id="${tutor.id}">
                <td><span class="student-id">${tutor.id}</span></td>
                <td><span class="student-name">${tutor.name}</span></td>
                <td>${tutor.phone}</td>
                <td>
                    <div class="course-tags">
                        ${tutor.courses.slice(0, 3).map(code => {
            const course = COURSES.find(c => c.code === code);
            return `<span class="course-tag">${course ? course.name.split(' ')[0] : code}</span>`;
        }).join('')}
                        ${tutor.courses.length > 3 ? `<span class="course-tag">+${tutor.courses.length - 3}</span>` : ''}
                    </div>
                </td>
                <td><span class="mode-badge mode-${tutor.teaching_mode}">${modeLabels[tutor.teaching_mode] || tutor.teaching_mode}</span></td>
                <td>${availLabels[tutor.availability] || tutor.availability}</td>
                <td>
                    <button class="action-btn whatsapp" title="WhatsApp" onclick="openWhatsApp('${tutor.phone}')">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </td>
                <td>
                    <div class="action-btns">
                        ${tutor.linkedin ? `
                            <a href="${tutor.linkedin}" target="_blank" class="action-btn linkedin" title="LinkedIn">
                                <i class="fab fa-linkedin-in"></i>
                            </a>
                        ` : ''}
                        <button class="action-btn edit" title="Edit" onclick="editTutor('${tutor.id}')">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="action-btn delete" title="Delete" onclick="deleteTutor('${tutor.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Card View (Mobile)
        tutorsCards.innerHTML = data.map(tutor => `
            <div class="data-card" data-id="${tutor.id}">
                <div class="data-card-header">
                    <span class="data-card-id">${tutor.id}</span>
                    <div class="action-btns">
                        <button class="action-btn whatsapp" title="WhatsApp" onclick="openWhatsApp('${tutor.phone}')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="action-btn edit" title="Edit" onclick="editTutor('${tutor.id}')">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="action-btn delete" title="Delete" onclick="deleteTutor('${tutor.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="data-card-name">${tutor.name}</div>
                <div class="data-card-row">
                    <i class="fas fa-phone"></i>
                    <span>${tutor.phone}</span>
                </div>
                <div class="data-card-row">
                    <i class="fas fa-book"></i>
                    <span>${tutor.courses.map(code => {
            const course = COURSES.find(c => c.code === code);
            return course ? course.name.split(' ')[0] : code;
        }).join(', ')}</span>
                </div>
                <div class="data-card-row">
                    <i class="fas fa-laptop"></i>
                    <span>${modeLabels[tutor.teaching_mode]} | ${availLabels[tutor.availability]}</span>
                </div>
            </div>
        `).join('');
    }

    // ============================================
    // WhatsApp Integration
    // ============================================
    window.openWhatsApp = function (phone) {
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    // ============================================
    // Edit Tutor
    // ============================================
    window.editTutor = function (id) {
        const tutor = tutors.find(t => t.id === id);
        if (!tutor) return;

        editingTutorId = id;
        document.getElementById('tutorModalTitle').textContent = 'Edit Tutor';
        saveTutorBtn.querySelector('span').textContent = 'Update Tutor';

        // Populate form
        document.getElementById('fullName').value = tutor.name || '';

        // Parse phone
        if (tutor.phone) {
            const phoneMatch = tutor.phone.match(/^(\+\d{1,4})(\d+)$/);
            if (phoneMatch) {
                document.getElementById('tutorCountryCode').value = phoneMatch[1];
                document.getElementById('tutorPhone').value = phoneMatch[2];
            } else {
                document.getElementById('tutorCountryCode').value = '+91';
                document.getElementById('tutorPhone').value = tutor.phone.replace(/[^0-9]/g, '');
            }
        }

        document.getElementById('tutorEmail').value = tutor.email || '';
        document.getElementById('linkedin').value = tutor.linkedin || '';
        document.getElementById('teachingMode').value = tutor.teaching_mode || '';
        document.getElementById('availability').value = tutor.availability || '';
        document.getElementById('tutorNotes').value = tutor.notes || '';

        // Restore course selection
        selectedCourses = [...(tutor.courses || [])];
        coursesOptions.querySelectorAll('.multi-select-option').forEach(opt => {
            const code = opt.dataset.code;
            const checkbox = opt.querySelector('input');
            if (selectedCourses.includes(code)) {
                opt.classList.add('selected');
                checkbox.checked = true;
            } else {
                opt.classList.remove('selected');
                checkbox.checked = false;
            }
        });
        updateSelectedTags();

        openModal(true);
    };

    // ============================================
    // Delete Tutor
    // ============================================
    window.deleteTutor = function (id) {
        const tutor = tutors.find(t => t.id === id);
        if (!tutor) return;

        if (window.modal) {
            window.modal.confirm(
                'Delete Tutor',
                `Are you sure you want to delete <strong>${tutor.name}</strong>?`,
                async () => {
                    try {
                        const { error } = await window.supabaseClient
                            .from('tutors')
                            .delete()
                            .eq('id', id);

                        if (error) throw error;

                        tutors = tutors.filter(t => t.id !== id);
                        saveTutorsToStorage();
                        applyFiltersAndSort();
                        updateDashboardStats();
                        window.toast.success('Deleted', 'Tutor removed successfully');
                    } catch (error) {
                        console.error('Delete error:', error);
                        window.toast.error('Error', 'Failed to delete: ' + error.message);
                    }
                }
            );
        }
    };

    // ============================================
    // Update Dashboard Stats
    // ============================================
    function updateDashboardStats() {
        localStorage.setItem('craftsoft_tutor_count', tutors.length);
    }
});
