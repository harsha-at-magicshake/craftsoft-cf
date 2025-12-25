/* ============================================
   ADD STUDENT - JavaScript
   ============================================ */

// Global state
let courses = [];
let discounts = [];
let courseCardIndex = 0;
let isEditMode = false;
let editStudentId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', initAddStudentPage);

async function initAddStudentPage() {
    // Check auth
    const session = await requireAuth();
    if (!session) return;

    // Show layout
    document.getElementById('adminLayout').style.display = 'flex';
    document.getElementById('loadingState').style.display = 'none';

    // Setup sidebar
    setupSidebar();

    // Load data
    await Promise.all([
        loadCourses(),
        loadDiscounts()
    ]);

    // Check if edit mode
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('id');

    if (studentId) {
        isEditMode = true;
        editStudentId = studentId;
        document.getElementById('pageTitle').textContent = 'Edit Student';
        await loadStudentData(studentId);
    } else {
        // Add first course card
        addCourseCard();
    }

    // Setup form submit
    document.getElementById('studentForm').addEventListener('submit', handleFormSubmit);
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
// LOAD DATA
// ============================================
async function loadCourses() {
    try {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        courses = data || [];
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

async function loadDiscounts() {
    try {
        const { data, error } = await supabase
            .from('discount_settings')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;
        discounts = data || [];
    } catch (error) {
        console.error('Error loading discounts:', error);
    }
}

async function loadStudentData(studentId) {
    try {
        const { data: student, error } = await supabase
            .from('students')
            .select(`
                *,
                student_enrollments (
                    *,
                    courses (*)
                )
            `)
            .eq('id', studentId)
            .single();

        if (error) throw error;

        // Populate form
        document.getElementById('name').value = student.name || '';
        document.getElementById('phone').value = student.phone || '';
        document.getElementById('email').value = student.email || '';
        document.getElementById('dob').value = student.date_of_birth || '';

        // Parse address
        if (student.address) {
            const parts = student.address.split(', ');
            document.getElementById('addressLine1').value = parts[0] || '';
            document.getElementById('addressLine2').value = parts[1] || '';
            document.getElementById('city').value = parts[2] || '';
            document.getElementById('pincode').value = parts[3] || '';
        }

        // Add course cards for existing enrollments
        if (student.student_enrollments && student.student_enrollments.length > 0) {
            student.student_enrollments.forEach(enrollment => {
                addCourseCard(enrollment);
            });
        } else {
            addCourseCard();
        }

    } catch (error) {
        console.error('Error loading student:', error);
        alert('Failed to load student data');
        window.location.href = 'students.html';
    }
}

// ============================================
// COURSE CARDS
// ============================================
function addCourseCard(existingData = null) {
    const container = document.getElementById('coursesContainer');
    const template = document.getElementById('courseCardTemplate');
    const clone = template.content.cloneNode(true);

    const card = clone.querySelector('.course-card');
    card.dataset.index = courseCardIndex;

    // Update course number
    const cardNumber = container.children.length + 1;
    card.querySelector('.course-number').textContent = `Course ${cardNumber}`;

    // Populate course dropdown
    const select = card.querySelector('.course-select');
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = `${course.code} - ${course.name}`;
        option.dataset.name = course.name;
        select.appendChild(option);
    });

    // If existing data (edit mode)
    if (existingData) {
        select.value = existingData.course_id;
        card.querySelector('.course-fee').value = existingData.base_fee;
        card.querySelector('.discount-type').value = existingData.discount_type || 'none';
        if (existingData.discount_type === 'manual') {
            card.querySelector('.manual-discount-group').style.display = 'block';
            card.querySelector('.manual-discount').value = existingData.discount_amount;
        }
        card.querySelector('.tutor-name').value = existingData.tutor_name || '';
        card.querySelector('.final-fee-display').textContent = `₹${formatNumber(existingData.final_fee)}`;
    }

    container.appendChild(clone);
    courseCardIndex++;

    updateCourseNumbers();
    calculateFees();
}

function removeCourseCard(button) {
    const card = button.closest('.course-card');
    const container = document.getElementById('coursesContainer');

    if (container.children.length > 1) {
        card.remove();
        updateCourseNumbers();
        calculateFees();
    } else {
        alert('At least one course is required');
    }
}

function updateCourseNumbers() {
    const container = document.getElementById('coursesContainer');
    const cards = container.querySelectorAll('.course-card');
    cards.forEach((card, index) => {
        card.querySelector('.course-number').textContent = `Course ${index + 1}`;
    });
}

function onCourseChange(select) {
    // You can auto-fill fee here if courses have default fees
    calculateFees();
}

function onDiscountTypeChange(select) {
    const card = select.closest('.course-card');
    const manualGroup = card.querySelector('.manual-discount-group');

    if (select.value === 'manual') {
        manualGroup.style.display = 'block';
    } else {
        manualGroup.style.display = 'none';
        card.querySelector('.manual-discount').value = '';
    }

    calculateFees();
}

// ============================================
// FEE CALCULATIONS
// ============================================
function calculateFees() {
    const container = document.getElementById('coursesContainer');
    const cards = container.querySelectorAll('.course-card');

    let totalBase = 0;
    let totalDiscount = 0;
    let totalFinal = 0;

    cards.forEach(card => {
        const baseFee = parseFloat(card.querySelector('.course-fee').value) || 0;
        const discountType = card.querySelector('.discount-type').value;
        let discountAmount = 0;

        // Calculate discount
        if (discountType === 'manual') {
            discountAmount = parseFloat(card.querySelector('.manual-discount').value) || 0;
        } else if (discountType !== 'none') {
            const discountConfig = discounts.find(d => d.name === discountType);
            if (discountConfig) {
                if (discountConfig.type === 'percentage') {
                    discountAmount = (baseFee * discountConfig.value) / 100;
                } else {
                    discountAmount = discountConfig.value;
                }
            }
        }

        const finalFee = baseFee - discountAmount;

        // Update card display
        card.querySelector('.final-fee-display').textContent = `₹${formatNumber(finalFee)}`;

        totalBase += baseFee;
        totalDiscount += discountAmount;
        totalFinal += finalFee;
    });

    // Update summary
    document.getElementById('totalBaseFee').textContent = `₹${formatNumber(totalBase)}`;
    document.getElementById('totalDiscount').textContent = `-₹${formatNumber(totalDiscount)}`;
    document.getElementById('finalAmount').textContent = `₹${formatNumber(totalFinal)}`;

    // Show/hide summary
    const summarySection = document.getElementById('feeSummarySection');
    if (totalBase > 0) {
        summarySection.style.display = 'block';
    } else {
        summarySection.style.display = 'none';
    }
}

// ============================================
// FORM SUBMISSION
// ============================================
async function handleFormSubmit(e) {
    e.preventDefault();
    await saveStudent();
}

async function saveStudent() {
    // Validate
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (!name || !phone) {
        alert('Name and phone are required');
        return;
    }

    // Validate courses
    const container = document.getElementById('coursesContainer');
    const cards = container.querySelectorAll('.course-card');
    const enrollments = [];

    for (const card of cards) {
        const courseId = card.querySelector('.course-select').value;
        const baseFee = parseFloat(card.querySelector('.course-fee').value) || 0;

        if (!courseId) {
            alert('Please select a course for all enrollment cards');
            return;
        }

        if (baseFee <= 0) {
            alert('Please enter a valid fee for all courses');
            return;
        }

        const discountType = card.querySelector('.discount-type').value;
        let discountAmount = 0;

        if (discountType === 'manual') {
            discountAmount = parseFloat(card.querySelector('.manual-discount').value) || 0;
        } else if (discountType !== 'none') {
            const discountConfig = discounts.find(d => d.name === discountType);
            if (discountConfig) {
                if (discountConfig.type === 'percentage') {
                    discountAmount = (baseFee * discountConfig.value) / 100;
                } else {
                    discountAmount = discountConfig.value;
                }
            }
        }

        enrollments.push({
            course_id: courseId,
            base_fee: baseFee,
            discount_type: discountType,
            discount_amount: discountAmount,
            final_fee: baseFee - discountAmount,
            tutor_name: card.querySelector('.tutor-name').value.trim() || null
        });
    }

    // Build address
    const addressParts = [
        document.getElementById('addressLine1').value.trim(),
        document.getElementById('addressLine2').value.trim(),
        document.getElementById('city').value.trim(),
        document.getElementById('pincode').value.trim()
    ].filter(Boolean);
    const address = addressParts.join(', ');

    // Student data
    const studentData = {
        name,
        phone,
        email: document.getElementById('email').value.trim() || null,
        date_of_birth: document.getElementById('dob').value || null,
        address: address || null,
        status: 'active'
    };

    try {
        let studentId;

        if (isEditMode) {
            // Update existing student
            const { error: updateError } = await supabase
                .from('students')
                .update(studentData)
                .eq('id', editStudentId);

            if (updateError) throw updateError;
            studentId = editStudentId;

            // Delete existing enrollments
            await supabase
                .from('student_enrollments')
                .delete()
                .eq('student_id', studentId);
        } else {
            // Create new student
            const { data: newStudent, error: insertError } = await supabase
                .from('students')
                .insert(studentData)
                .select()
                .single();

            if (insertError) throw insertError;
            studentId = newStudent.id;
        }

        // Create enrollments
        const enrollmentData = enrollments.map(e => ({
            ...e,
            student_id: studentId
        }));

        const { error: enrollError } = await supabase
            .from('student_enrollments')
            .insert(enrollmentData);

        if (enrollError) throw enrollError;

        alert(isEditMode ? 'Student updated successfully!' : 'Student added successfully!');
        window.location.href = 'students.html';

    } catch (error) {
        console.error('Error saving student:', error);
        alert('Failed to save student: ' + error.message);
    }
}

// ============================================
// UTILITIES
// ============================================
function formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(num);
}

// Logout
function showLogoutModal() {
    document.getElementById('logoutModal').classList.add('show');
}

function hideLogoutModal() {
    document.getElementById('logoutModal').classList.remove('show');
}

async function confirmLogout() {
    await signOut();
}
