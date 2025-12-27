/**
 * Students Management Module
 * Phase 2: Student CRUD Operations with Pagination, Sorting, Filtering
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ============================================
    // COURSES DATA (Synced with website order)
    // ============================================
    const COURSES = [
        { code: '01', name: 'Graphic Design', category: 'Design', fee: 15000 },
        { code: '02', name: 'UI/UX Design', category: 'Design', fee: 18000 },
        { code: '03', name: 'Full Stack Development (MERN)', category: 'Engineering', fee: 35000 },
        { code: '04', name: 'Python Full Stack Development', category: 'Engineering', fee: 35000 },
        { code: '05', name: 'Java Full Stack Development', category: 'Engineering', fee: 35000 },
        { code: '06', name: 'DSA Mastery', category: 'Engineering', fee: 12000 },
        { code: '07', name: 'Data Analytics', category: 'Engineering', fee: 25000 },
        { code: '08', name: 'Salesforce Administration', category: 'Engineering', fee: 20000 },
        { code: '09', name: 'Python Programming', category: 'Engineering', fee: 10000 },
        { code: '10', name: 'React JS', category: 'Engineering', fee: 15000 },
        { code: '11', name: 'Git & GitHub', category: 'Engineering', fee: 5000 },
        { code: '12', name: 'DevOps Engineering', category: 'Cloud', fee: 30000 },
        { code: '13', name: 'AWS Cloud Excellence', category: 'Cloud', fee: 25000 },
        { code: '14', name: 'DevSecOps', category: 'Cloud', fee: 28000 },
        { code: '15', name: 'Microsoft Azure', category: 'Cloud', fee: 22000 },
        { code: '16', name: 'Automation with Python', category: 'Cloud', fee: 12000 },
        { code: '17', name: 'Spoken English Mastery', category: 'Soft Skills', fee: 8000 },
        { code: '18', name: 'Soft Skills Training', category: 'Soft Skills', fee: 6000 },
        { code: '19', name: 'Resume Writing & Interview Prep', category: 'Soft Skills', fee: 5000 },
        { code: '20', name: 'Handwriting Improvement', category: 'Soft Skills', fee: 4000 }
    ];

    // Mock Tutors (will be dynamic in Phase 3)
    const TUTORS = [
        { id: 1, name: 'Sneha Reddy', courses: ['01', '02'] },
        { id: 2, name: 'Ravi Kumar', courses: ['03', '04', '05', '09', '10'] },
        { id: 3, name: 'Priya Sharma', courses: ['06', '07'] },
        { id: 4, name: 'Kiran Rao', courses: ['08'] },
        { id: 5, name: 'Arun Mehta', courses: ['12', '13', '14', '15', '16'] },
        { id: 6, name: 'Deepika Nair', courses: ['17', '18', '19', '20'] }
    ];

    // Pagination Settings
    const ITEMS_PER_PAGE = 10;

    // ============================================
    // DOM Elements
    // ============================================
    const addStudentBtn = document.getElementById('addStudentBtn');
    const studentModalOverlay = document.getElementById('studentModalOverlay');
    const studentModal = document.getElementById('studentModal');
    const closeStudentModal = document.getElementById('closeStudentModal');
    const cancelStudentBtn = document.getElementById('cancelStudentBtn');
    const saveStudentBtn = document.getElementById('saveStudentBtn');
    const studentForm = document.getElementById('studentForm');
    const studentsTableBody = document.getElementById('studentsTableBody');
    const studentsCards = document.getElementById('studentsCards');
    const emptyState = document.getElementById('emptyState');
    const studentSearch = document.getElementById('studentSearch');

    // Form Elements
    const coursesTrigger = document.getElementById('coursesTrigger');
    const coursesOptions = document.getElementById('coursesOptions');
    const selectedCoursesContainer = document.getElementById('selectedCourses');
    const tutorsGroup = document.getElementById('tutorsGroup');
    const tutorAssignments = document.getElementById('tutorAssignments');
    const feeInput = document.getElementById('fee');
    const discountInput = document.getElementById('discount');
    const finalFeeInput = document.getElementById('finalFee');

    // Filter & Pagination Elements
    const courseFilter = document.getElementById('courseFilter');
    const sortBy = document.getElementById('sortBy');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const paginationInfo = document.getElementById('paginationInfo');

    // State
    let students = [];
    let selectedCourses = [];
    let selectedTutors = {};
    let editingStudentId = null;
    let currentPage = 1;
    let filteredStudents = [];

    // ============================================
    // Initialize
    // ============================================
    initCoursesDropdown();
    initCourseFilter();
    await loadStudents();

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

        sortBy.addEventListener('change', () => {
            currentPage = 1;
            applyFiltersAndSort();
        });
    }

    // ============================================
    // Courses Multi-Select Dropdown
    // ============================================
    function initCoursesDropdown() {
        // Populate course options
        coursesOptions.innerHTML = COURSES.map(course => `
            <div class="multi-select-option" data-code="${course.code}">
                <input type="checkbox" id="course_${course.code}">
                <label for="course_${course.code}">${course.name}</label>
            </div>
        `).join('');

        // Toggle dropdown
        coursesTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            coursesOptions.classList.toggle('active');
        });

        // Select/Deselect options - attach listeners
        attachCourseOptionListeners();

        // Close on outside click
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

                // Toggle checkbox
                checkbox.checked = !checkbox.checked;
                option.classList.toggle('selected', checkbox.checked);

                // Update selectedCourses array
                if (checkbox.checked && !selectedCourses.includes(code)) {
                    selectedCourses.push(code);
                } else if (!checkbox.checked) {
                    selectedCourses = selectedCourses.filter(c => c !== code);
                    delete selectedTutors[code];
                }

                updateSelectedTags();
                updateTutorAssignments();
                updateFees();
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

        // Remove tag handler
        selectedCoursesContainer.querySelectorAll('.remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const code = e.target.closest('.selected-tag').dataset.code;
                selectedCourses = selectedCourses.filter(c => c !== code);
                delete selectedTutors[code];

                // Update checkbox
                const option = coursesOptions.querySelector(`[data-code="${code}"]`);
                if (option) {
                    option.classList.remove('selected');
                    option.querySelector('input').checked = false;
                }

                updateSelectedTags();
                updateTutorAssignments();
                updateFees();
            });
        });
    }

    function updateTutorAssignments() {
        if (selectedCourses.length === 0) {
            tutorsGroup.style.display = 'none';
            return;
        }

        tutorsGroup.style.display = 'block';
        tutorAssignments.innerHTML = selectedCourses.map(code => {
            const course = COURSES.find(c => c.code === code);
            const availableTutors = TUTORS.filter(t => t.courses.includes(code));
            const currentTutor = selectedTutors[code] || '';
            return `
                <div class="tutor-assignment">
                    <span class="tutor-assignment-course">${course.name}</span>
                    <select class="tutor-select" data-course="${code}">
                        <option value="">Select tutor...</option>
                        ${availableTutors.map(t => `
                            <option value="${t.id}" ${currentTutor == t.id ? 'selected' : ''}>${t.name}</option>
                        `).join('')}
                    </select>
                </div>
            `;
        }).join('');

        // Attach change listeners
        tutorAssignments.querySelectorAll('.tutor-select').forEach(select => {
            select.addEventListener('change', (e) => {
                selectedTutors[e.target.dataset.course] = e.target.value;
            });
        });
    }

    function updateFees() {
        const totalFee = selectedCourses.reduce((sum, code) => {
            const course = COURSES.find(c => c.code === code);
            return sum + (course ? course.fee : 0);
        }, 0);

        feeInput.value = totalFee;
        const discount = parseInt(discountInput.value) || 0;
        finalFeeInput.value = Math.max(0, totalFee - discount);
    }

    discountInput.addEventListener('input', updateFees);

    // ============================================
    // Modal Controls
    // ============================================
    function openModal(editing = false) {
        studentModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (!editing) {
            document.getElementById('studentModalTitle').textContent = 'Add New Student';
            saveStudentBtn.querySelector('span').textContent = 'Save Student';
            studentForm.reset();
            resetCourseSelection();
        }
    }

    function closeModal() {
        studentModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        editingStudentId = null;
        studentForm.reset();
        resetCourseSelection();
    }

    function resetCourseSelection() {
        selectedCourses = [];
        selectedTutors = {};
        coursesOptions.querySelectorAll('.multi-select-option').forEach(opt => {
            opt.classList.remove('selected');
            opt.querySelector('input').checked = false;
        });
        updateSelectedTags();
        updateTutorAssignments();
        updateFees();
    }

    addStudentBtn.addEventListener('click', () => openModal(false));
    closeStudentModal.addEventListener('click', closeModal);
    cancelStudentBtn.addEventListener('click', closeModal);
    studentModalOverlay.addEventListener('click', (e) => {
        if (e.target === studentModalOverlay) closeModal();
    });

    // ============================================
    // Generate Student ID
    // ============================================
    function generateStudentId(courseCode) {
        const courseStudents = students.filter(s =>
            s.courses && s.courses.includes(courseCode)
        );
        const sequence = (courseStudents.length + 1).toString().padStart(3, '0');
        return `ACS-${courseCode}-${sequence}`;
    }

    // ============================================
    // Save Student
    // ============================================
    saveStudentBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const firstName = document.getElementById('firstName').value.trim();
        const surname = document.getElementById('surname').value.trim();
        const phone = document.getElementById('phone').value.trim();

        if (!firstName || !surname) {
            window.toast.warning('Required', 'Please enter first name and surname');
            return;
        }

        if (!phone || phone.length < 10) {
            window.toast.warning('Required', 'Please enter a valid 10-digit phone number');
            return;
        }

        if (selectedCourses.length === 0) {
            window.toast.warning('Required', 'Please select at least one course');
            return;
        }

        // Get country code and phone
        const countryCode = document.getElementById('countryCode').value.trim() || '+91';
        const fullPhone = countryCode + phone.replace(/\D/g, '');

        const studentData = {
            id: editingStudentId || generateStudentId(selectedCourses[0]),
            name: `${firstName} ${surname}`,
            phone: fullPhone,
            email: document.getElementById('email').value.trim() || null,
            courses: [...selectedCourses],
            join_date: document.getElementById('joiningDate').value || null,
            status: 'active',
            notes: document.getElementById('notes').value.trim() || null
        };

        // Extra fields for localStorage (not in Supabase)
        const localExtraData = {
            first_name: firstName,
            surname: surname,
            tutors: { ...selectedTutors },
            fee: parseInt(feeInput.value) || 0,
            discount: parseInt(discountInput.value) || 0,
            final_fee: parseInt(finalFeeInput.value) || 0,
            demo_date: document.getElementById('demoDate').value || null,
            batch_time: document.getElementById('batchTime').value || null,
            lead_source: document.getElementById('leadSource').value || null,
            occupation: document.getElementById('occupation').value || null,
            address: document.getElementById('address').value.trim() || null
        };

        saveStudentBtn.disabled = true;
        saveStudentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            if (editingStudentId) {
                // Update in Supabase
                const { error } = await window.supabaseClient
                    .from('students')
                    .update(studentData)
                    .eq('id', editingStudentId);

                if (error) throw error;

                // Update local array
                const index = students.findIndex(s => s.id === editingStudentId);
                if (index !== -1) {
                    students[index] = { ...students[index], ...studentData, ...localExtraData };
                }
                window.toast.success('Updated', 'Student updated successfully');
            } else {
                // Insert to Supabase
                const { error } = await window.supabaseClient
                    .from('students')
                    .insert([studentData]);

                if (error) throw error;

                // Add to local array with extra data
                students.push({ ...studentData, ...localExtraData, created_at: new Date().toISOString() });
                window.toast.success('Added', 'Student added successfully');
            }

            saveStudentsToStorage();
            applyFiltersAndSort();
            updateDashboardStats();
            closeModal();

        } catch (error) {
            console.error('Error saving student:', error);
            window.toast.error('Error', 'Failed to save student: ' + error.message);
        } finally {
            saveStudentBtn.disabled = false;
            saveStudentBtn.innerHTML = '<i class="fas fa-save"></i> <span>Save Student</span>';
        }
    });

    // ============================================
    // Load Students
    // ============================================
    async function loadStudents() {
        try {
            // Try loading from Supabase first
            const { data: supabaseStudents, error } = await window.supabaseClient
                .from('students')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Supabase load failed, using localStorage:', error.message);
                const stored = localStorage.getItem('craftsoft_students');
                students = stored ? JSON.parse(stored) : [];
            } else if (supabaseStudents && supabaseStudents.length > 0) {
                students = supabaseStudents;
                saveStudentsToStorage(); // Sync to localStorage
            } else {
                // No data in Supabase, check localStorage
                const stored = localStorage.getItem('craftsoft_students');
                students = stored ? JSON.parse(stored) : [];
            }

            // Seed mock data if empty
            if (students.length === 0) {
                const mockStudents = [
                    {
                        id: 'ACS-01-001',
                        name: 'Rahul Sharma',
                        first_name: 'Rahul',
                        surname: 'Sharma',
                        phone: '+919876543210',
                        email: 'rahul@example.com',
                        courses: ['01'],
                        tutors: { '01': '1' },
                        fee: 15000,
                        discount: 1000,
                        final_fee: 14000,
                        demo_date: '2024-12-20',
                        join_date: '2024-12-25',
                        batch_time: '10:00',
                        lead_source: 'website',
                        occupation: 'student',
                        address: 'Hyderabad, Telangana',
                        notes: 'Interested in branding projects',
                        status: 'active',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'ACS-12-001',
                        name: 'Priya Kumari',
                        first_name: 'Priya',
                        surname: 'Kumari',
                        phone: '+918765432109',
                        email: 'priya@example.com',
                        courses: ['12', '13'],
                        tutors: { '12': '5', '13': '5' },
                        fee: 55000,
                        discount: 5000,
                        final_fee: 50000,
                        demo_date: '2024-12-18',
                        join_date: '2024-12-22',
                        batch_time: '18:00',
                        lead_source: 'linkedin',
                        occupation: 'working',
                        address: 'Bengaluru, Karnataka',
                        notes: 'Working professional, needs weekend batches',
                        status: 'active',
                        created_at: new Date().toISOString()
                    }
                ];

                // Insert mock data to Supabase
                for (const student of mockStudents) {
                    const { id, name, phone, email, courses, join_date, status, notes } = student;
                    await window.supabaseClient
                        .from('students')
                        .insert([{ id, name, phone, email, courses, join_date, status, notes }])
                        .catch(e => console.warn('Mock insert skipped:', e.message));
                }

                students = mockStudents;
                saveStudentsToStorage();
            }

            applyFiltersAndSort();
            updateDashboardStats();

        } catch (error) {
            console.error('Error loading students:', error);
            // Fallback to localStorage
            const stored = localStorage.getItem('craftsoft_students');
            students = stored ? JSON.parse(stored) : [];
            applyFiltersAndSort();
        }
    }

    function saveStudentsToStorage() {
        localStorage.setItem('craftsoft_students', JSON.stringify(students));
    }

    // ============================================
    // Filtering & Sorting
    // ============================================
    function applyFiltersAndSort() {
        let result = [...students];

        // Search filter
        const searchQuery = studentSearch.value.toLowerCase().trim();
        if (searchQuery) {
            result = result.filter(s =>
                s.name.toLowerCase().includes(searchQuery) ||
                s.id.toLowerCase().includes(searchQuery) ||
                s.phone.includes(searchQuery) ||
                (s.email && s.email.toLowerCase().includes(searchQuery))
            );
        }

        // Course filter
        const selectedCourse = courseFilter.value;
        if (selectedCourse) {
            result = result.filter(s => s.courses && s.courses.includes(selectedCourse));
        }

        // Sorting
        const sortOption = sortBy.value;
        switch (sortOption) {
            case 'newest':
                result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'oldest':
                result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'name_asc':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name_desc':
                result.sort((a, b) => b.name.localeCompare(a.name));
                break;
        }

        filteredStudents = result;
        renderStudents();
    }

    studentSearch.addEventListener('input', () => {
        currentPage = 1;
        applyFiltersAndSort();
    });

    // ============================================
    // Pagination
    // ============================================
    function getTotalPages() {
        return Math.ceil(filteredStudents.length / ITEMS_PER_PAGE) || 1;
    }

    function getPageData() {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return filteredStudents.slice(start, end);
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
            renderStudents();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage < getTotalPages()) {
            currentPage++;
            renderStudents();
        }
    });

    // ============================================
    // Render Students
    // ============================================
    function renderStudents() {
        const data = getPageData();

        // Hide skeletons
        const skeletonTable = document.getElementById('skeletonTable');
        const skeletonCards = document.getElementById('skeletonCards');
        if (skeletonTable) skeletonTable.style.display = 'none';
        if (skeletonCards) skeletonCards.style.display = 'none';

        if (filteredStudents.length === 0) {
            studentsTableBody.innerHTML = '';
            studentsCards.innerHTML = '';
            studentsCards.style.display = 'none';
            emptyState.style.display = 'block';
            document.querySelector('.data-table').style.display = 'none';
            document.getElementById('pagination').style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        document.querySelector('.data-table').style.display = 'table';
        studentsCards.style.display = '';
        document.getElementById('pagination').style.display = 'flex';
        updatePagination();

        // Table View (Desktop)
        studentsTableBody.innerHTML = data.map(student => `
            <tr data-id="${student.id}">
                <td><span class="student-id">${student.id}</span></td>
                <td><span class="student-name">${student.name}</span></td>
                <td>${student.phone}</td>
                <td>
                    <div class="course-tags">
                        ${student.courses.map(code => {
            const course = COURSES.find(c => c.code === code);
            return `<span class="course-tag">${course ? course.name.split(' ')[0] : code}</span>`;
        }).join('')}
                    </div>
                </td>
                <td>${(student.join_date || student.joining_date) ? formatDate(student.join_date || student.joining_date) : '-'}</td>
                <td>
                    <button class="action-btn whatsapp" title="WhatsApp" onclick="openWhatsApp('${student.phone}')">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" title="Edit" onclick="editStudent('${student.id}')">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="action-btn delete" title="Delete" onclick="deleteStudent('${student.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Card View (Mobile)
        studentsCards.innerHTML = data.map(student => `
            <div class="data-card" data-id="${student.id}">
                <div class="data-card-header">
                    <span class="data-card-id">${student.id}</span>
                    <div class="action-btns">
                        <button class="action-btn whatsapp" title="WhatsApp" onclick="openWhatsApp('${student.phone}')">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="action-btn edit" title="Edit" onclick="editStudent('${student.id}')">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="action-btn delete" title="Delete" onclick="deleteStudent('${student.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="data-card-name">${student.name}</div>
                <div class="data-card-row">
                    <i class="fas fa-phone"></i>
                    <span>${student.phone}</span>
                </div>
                <div class="data-card-row">
                    <i class="fas fa-book"></i>
                    <span>${student.courses.map(code => {
            const course = COURSES.find(c => c.code === code);
            return course ? course.name.split(' ')[0] : code;
        }).join(', ')}</span>
                </div>
                ${(student.join_date || student.joining_date) ? `
                    <div class="data-card-row">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(student.join_date || student.joining_date)}</span>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // ============================================
    // WhatsApp Integration
    // ============================================
    window.openWhatsApp = function (phone) {
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    // ============================================
    // Edit Student
    // ============================================
    window.editStudent = function (id) {
        const student = students.find(s => s.id === id);
        if (!student) return;

        editingStudentId = id;
        document.getElementById('studentModalTitle').textContent = 'Edit Student';
        saveStudentBtn.querySelector('span').textContent = 'Update Student';

        // Populate form
        document.getElementById('firstName').value = student.first_name || '';
        document.getElementById('surname').value = student.surname || '';

        // Parse country code and phone number
        if (student.phone) {
            const phoneMatch = student.phone.match(/^(\+\d{1,4})(\d+)$/);
            if (phoneMatch) {
                document.getElementById('countryCode').value = phoneMatch[1];
                document.getElementById('phone').value = phoneMatch[2];
            } else {
                document.getElementById('countryCode').value = '+91';
                document.getElementById('phone').value = student.phone.replace(/[^0-9]/g, '');
            }
        } else {
            document.getElementById('countryCode').value = '+91';
            document.getElementById('phone').value = '';
        }

        document.getElementById('email').value = student.email || '';
        document.getElementById('demoDate').value = student.demo_date || '';
        document.getElementById('joiningDate').value = student.join_date || student.joining_date || '';
        document.getElementById('batchTime').value = student.batch_time || '';
        document.getElementById('leadSource').value = student.lead_source || '';
        document.getElementById('occupation').value = student.occupation || '';
        document.getElementById('address').value = student.address || '';
        document.getElementById('notes').value = student.notes || '';
        document.getElementById('discount').value = student.discount || 0;

        // Restore course selection - FIXED
        selectedCourses = [...(student.courses || [])];
        selectedTutors = typeof student.tutors === 'object' ? { ...student.tutors } : {};

        // Update checkboxes to match selected courses
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
        updateTutorAssignments();
        updateFees();

        openModal(true);
    };

    // ============================================
    // Delete Student
    // ============================================
    window.deleteStudent = function (id) {
        const student = students.find(s => s.id === id);
        if (!student) return;

        if (window.modal) {
            window.modal.confirm(
                'Delete Student',
                `Are you sure you want to delete <strong>${student.name}</strong>?`,
                async () => {
                    try {
                        // Delete from Supabase
                        const { error } = await window.supabaseClient
                            .from('students')
                            .delete()
                            .eq('id', id);

                        if (error) throw error;

                        // Delete from local array
                        students = students.filter(s => s.id !== id);
                        saveStudentsToStorage();
                        applyFiltersAndSort();
                        updateDashboardStats();
                        window.toast.success('Deleted', 'Student removed successfully');
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
        localStorage.setItem('craftsoft_student_count', students.length);
    }
});
