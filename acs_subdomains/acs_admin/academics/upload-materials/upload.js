/**
 * Upload Materials - Admin Logic
 * Handles course/student selection and file upload to Supabase Storage
 */

(async function () {
    // State
    let allCourses = [];
    let allStudents = [];
    let selectedFiles = [];
    let courseSearchableSelect = null;
    let studentSearchableSelect = null;

    // DOM Elements
    const courseSelect = document.getElementById('course-select');
    const studentSelect = document.getElementById('student-select');
    const studentHint = document.getElementById('student-hint');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const uploadBtn = document.getElementById('upload-btn');
    const recentUploadsContent = document.getElementById('recent-uploads-content');

    // Initialize
    async function init() {
        // Auth check first
        const session = await window.supabaseConfig.getSession();
        if (!session) {
            window.location.href = '../../login.html';
            return;
        }

        // Render Header & Sidebar
        const headerContainer = document.getElementById('header-container');
        if (headerContainer && window.AdminHeader) {
            headerContainer.innerHTML = window.AdminHeader.render('Upload Materials');
        }

        if (window.AdminSidebar) {
            window.AdminSidebar.init('upload-materials', '../../');
        }

        // Render account panel
        const admin = await window.Auth.getCurrentAdmin();
        await AdminSidebar.renderAccountPanel(session, admin);

        await loadCourses();
        await loadRecentUploads();
        bindEvents();
    }

    async function loadCourses() {
        try {
            const { data, error } = await window.supabaseClient
                .from('courses')
                .select('course_code, course_name')
                .eq('status', 'ACTIVE')
                .order('course_code');

            if (error) throw error;

            allCourses = data || [];
            courseSelect.innerHTML = '<option value="">-- Select a Course --</option>' +
                allCourses.map(c => `<option value="${c.course_code}">${c.course_code} - ${c.course_name}</option>`).join('');

            // Initialize SearchableSelect
            if (!courseSearchableSelect && window.AdminUtils.SearchableSelect) {
                courseSearchableSelect = new window.AdminUtils.SearchableSelect('course-select', {
                    placeholder: 'Search for a course...'
                });
            } else if (courseSearchableSelect) {
                courseSearchableSelect.syncWithOptions();
            }
        } catch (err) {
            console.error('Error loading courses:', err);
            showToast('error', 'Failed to load courses');
        }
    }

    async function loadStudentsForCourse(courseCode) {
        studentSelect.disabled = true;
        studentSelect.innerHTML = '<option value="">Loading...</option>';
        if (studentSearchableSelect) studentSearchableSelect.syncWithOptions();

        try {
            const { data, error } = await window.supabaseClient
                .from('students')
                .select('id, student_id, first_name, last_name, courses')
                .contains('courses', [courseCode])
                .eq('status', 'ACTIVE')
                .is('deleted_at', null)
                .order('student_id');

            if (error) throw error;

            allStudents = data || [];

            if (allStudents.length === 0) {
                studentSelect.innerHTML = '<option value="">No students enrolled</option>';
            } else {
                studentSelect.innerHTML = '<option value="">-- Select a Student --</option>' +
                    allStudents.map(s => `<option value="${s.id}">${s.student_id} - ${s.first_name} ${s.last_name}</option>`).join('');
                studentHint.textContent = `${allStudents.length} student(s) enrolled in this course.`;
                studentSelect.disabled = false;
            }

            // Sync SearchableSelect
            if (!studentSearchableSelect && window.AdminUtils.SearchableSelect) {
                studentSearchableSelect = new window.AdminUtils.SearchableSelect('student-select', {
                    placeholder: 'Search for a student...'
                });
            } else if (studentSearchableSelect) {
                studentSearchableSelect.syncWithOptions();
            }
        } catch (err) {
            console.error('Error loading students:', err);
            studentSelect.innerHTML = '<option value="">Error loading students</option>';
            showToast('error', 'Failed to load students');
        }
    }

    // State for History
    let allUploadedMaterials = [];
    let currentHistoryPage = 1;
    const historyPerPage = 5;

    async function loadRecentUploads() {
        try {
            const { data, error } = await window.supabaseClient
                .from('student_materials')
                .select('id, file_name, file_url, course_code, created_at, student_db_id, students(student_id, first_name, last_name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            allUploadedMaterials = data || [];
            renderRecentUploadsWithPagination();
        } catch (err) {
            console.error('Error loading recent uploads:', err);
            recentUploadsContent.innerHTML = '<p class="text-muted">Could not load recent uploads.</p>';
        }
    }

    function renderRecentUploadsWithPagination() {
        const totalItems = allUploadedMaterials.length;
        const totalPages = Math.ceil(totalItems / historyPerPage);

        if (totalItems === 0) {
            recentUploadsContent.innerHTML = '<p class="text-muted">No materials uploaded yet.</p>';
            return;
        }

        const start = (currentHistoryPage - 1) * historyPerPage;
        const end = start + historyPerPage;
        const pageData = allUploadedMaterials.slice(start, end);

        recentUploadsContent.innerHTML = `
            <div class="bulk-actions-strip" id="bulk-actions" style="display: none;">
                <button id="bulk-delete-btn" class="btn btn-danger btn-sm">
                    <i class="fa-solid fa-trash-can"></i> Delete Selected (<span id="bulk-count">0</span>)
                </button>
            </div>
            <table class="recent-table">
                <thead>
                    <tr>
                        <th width="40"><input type="checkbox" id="master-checkbox"></th>
                        <th>File Name</th>
                        <th>Student</th>
                        <th>Course</th>
                        <th>Date</th>
                        <th width="60">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${pageData.map(m => `
                        <tr>
                            <td><input type="checkbox" class="file-checkbox" data-id="${m.id}"></td>
                            <td><a href="${m.file_url}" target="_blank" class="file-link"><i class="fa-solid ${getFileIcon(m.file_name)}"></i> ${m.file_name}</a></td>
                            <td>${m.students ? `${m.students.first_name} ${m.students.last_name}` : (m.student_id || 'N/A')}</td>
                            <td><span class="badge badge-primary">${m.course_code}</span></td>
                            <td>${new Date(m.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                            <td>
                                <button class="delete-single-btn" data-id="${m.id}" title="Delete">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="history-pagination">
                <div class="pagination-controls">
                    <button id="hist-prev" class="page-btn" ${currentHistoryPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>
                    <span class="page-info">Page ${currentHistoryPage} of ${totalPages || 1}</span>
                    <button id="hist-next" class="page-btn" ${currentHistoryPage >= totalPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>
                </div>
                <div class="total-badge">Total: ${totalItems}</div>
            </div>
        `;

        bindHistoryEvents();
    }

    function bindHistoryEvents() {
        const masterBox = document.getElementById('master-checkbox');
        const fileBoxes = document.querySelectorAll('.file-checkbox');
        const bulkStrip = document.getElementById('bulk-actions');
        const bulkCount = document.getElementById('bulk-count');
        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

        // Modal state handled globally within closure

        // Master checkbox
        masterBox?.addEventListener('change', (e) => {
            fileBoxes.forEach(box => box.checked = e.target.checked);
            updateBulkStrip();
        });

        // Individual checkboxes
        fileBoxes.forEach(box => {
            box.addEventListener('change', updateBulkStrip);
        });

        function updateBulkStrip() {
            const checkedCount = document.querySelectorAll('.file-checkbox:checked').length;
            bulkStrip.style.display = checkedCount > 0 ? 'flex' : 'none';
            bulkCount.textContent = checkedCount;
        }

        function showConfirm(title, message, onConfirm) {
            const deleteOverlay = document.getElementById('delete-overlay');
            const deleteTitle = document.getElementById('delete-title');
            const deleteMessage = document.getElementById('delete-message');

            if (deleteTitle) deleteTitle.textContent = title;
            if (deleteMessage) deleteMessage.innerHTML = message;

            deleteOverlay.style.display = 'flex';
            currentDeleteTask = onConfirm;
        }

        // Single delete
        document.querySelectorAll('.delete-single-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.dataset.id;
                const material = allUploadedMaterials.find(m => m.id === id);
                const fileName = material ? material.file_name : 'file';

                showConfirm(
                    'Delete Material?',
                    `Are you sure you want to delete <strong>${fileName}</strong>?`,
                    async () => {
                        await deleteMaterial(id);
                    }
                );
            });
        });

        // Bulk delete
        bulkDeleteBtn?.addEventListener('click', () => {
            const checkedBoxes = document.querySelectorAll('.file-checkbox:checked');
            const ids = Array.from(checkedBoxes).map(cb => cb.dataset.id);

            showConfirm(
                'Bulk Delete',
                `Are you sure you want to delete ${ids.length} selected files?`,
                async () => {
                    await bulkDelete(ids);
                }
            );
        });

        // Pagination
        document.getElementById('hist-prev')?.addEventListener('click', () => {
            if (currentHistoryPage > 1) {
                currentHistoryPage--;
                renderRecentUploadsWithPagination();
            }
        });
        document.getElementById('hist-next')?.addEventListener('click', () => {
            const totalPages = Math.ceil(allUploadedMaterials.length / historyPerPage);
            if (currentHistoryPage < totalPages) {
                currentHistoryPage++;
                renderRecentUploadsWithPagination();
            }
        });
    }

    async function deleteMaterial(id) {
        try {
            const { error } = await window.supabaseClient
                .from('student_materials')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showToast('success', 'File deleted successfully');
            await loadRecentUploads();
        } catch (err) {
            console.error('Delete error:', err);
            showToast('error', 'Failed to delete file');
        }
    }

    async function bulkDelete(ids) {
        try {
            const { error } = await window.supabaseClient
                .from('student_materials')
                .delete()
                .in('id', ids);

            if (error) throw error;
            showToast('success', `${ids.length} files deleted successfully`);
            await loadRecentUploads();
        } catch (err) {
            console.error('Bulk delete error:', err);
            showToast('error', 'Failed to delete files');
        }
    }

    function bindEvents() {
        // Course selection
        courseSelect.addEventListener('change', (e) => {
            const code = e.target.value;
            if (code) {
                loadStudentsForCourse(code);
            } else {
                studentSelect.disabled = true;
                studentSelect.innerHTML = '<option value="">-- Select a Course First --</option>';
                studentHint.textContent = 'Students enrolled in the selected course will appear here.';
                allStudents = [];
                if (studentSearchableSelect) {
                    studentSearchableSelect.updateTriggerText('-- Select a Course First --');
                    studentSearchableSelect.syncWithOptions();
                }
            }
            validateForm();
        });

        // Student selection
        studentSelect.addEventListener('change', validateForm);

        // Dropzone click
        dropzone.addEventListener('click', () => fileInput.click());

        // Drag & Drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });

        // Upload button
        uploadBtn.addEventListener('click', handleUpload);

        // Modal Listeners (Bind once)
        const deleteOverlay = document.getElementById('delete-overlay');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

        const hideConfirm = () => {
            deleteOverlay.style.display = 'none';
            currentDeleteTask = null;
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = 'Delete';
        };

        cancelDeleteBtn?.addEventListener('click', hideConfirm);
        confirmDeleteBtn?.addEventListener('click', async () => {
            if (currentDeleteTask) {
                confirmDeleteBtn.disabled = true;
                confirmDeleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
                await currentDeleteTask();
                hideConfirm();
            }
        });
    }

    // Modal state for deleteTask
    let currentDeleteTask = null;


    function handleFiles(files) {
        for (const file of files) {
            if (selectedFiles.length >= 5) {
                showToast('warning', 'Maximum 5 files allowed per upload');
                break;
            }
            // Check for duplicates
            if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
                continue;
            }
            selectedFiles.push(file);
        }
        renderFilePreview();
        validateForm();
    }

    function renderFilePreview() {
        if (selectedFiles.length === 0) {
            filePreview.innerHTML = '';
            return;
        }

        filePreview.innerHTML = selectedFiles.map((file, idx) => `
            <div class="file-preview-item" data-index="${idx}">
                <div class="file-preview-icon"><i class="fa-solid ${getFileIcon(file.name)}"></i></div>
                <div class="file-preview-info">
                    <div class="file-preview-name">${file.name}</div>
                    <div class="file-preview-size">${formatFileSize(file.size)}</div>
                </div>
                <button class="file-preview-remove" data-index="${idx}" title="Remove">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `).join('');

        // Bind remove buttons
        filePreview.querySelectorAll('.file-preview-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index);
                selectedFiles.splice(idx, 1);
                renderFilePreview();
                validateForm();
            });
        });
    }

    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            pdf: 'fa-file-pdf',
            doc: 'fa-file-word',
            docx: 'fa-file-word',
            xls: 'fa-file-excel',
            xlsx: 'fa-file-excel',
            ppt: 'fa-file-powerpoint',
            pptx: 'fa-file-powerpoint',
            zip: 'fa-file-zipper',
            rar: 'fa-file-zipper',
            png: 'fa-file-image',
            jpg: 'fa-file-image',
            jpeg: 'fa-file-image',
            gif: 'fa-file-image'
        };
        return icons[ext] || 'fa-file';
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function validateForm() {
        const courseOk = !!courseSelect.value;
        const studentOk = !!studentSelect.value;
        const filesOk = selectedFiles.length > 0;

        uploadBtn.disabled = !(courseOk && studentOk && filesOk);
    }

    async function handleUpload() {
        const courseCode = courseSelect.value;
        const studentDbId = studentSelect.value;

        if (!courseCode || !studentDbId || selectedFiles.length === 0) {
            showToast('error', 'Please complete all steps first');
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

        try {
            for (const file of selectedFiles) {
                // Create unique file path
                const timestamp = Date.now();
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${studentDbId}/${courseCode}/${timestamp}_${safeName}`;

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
                    .from('materials')
                    .upload(filePath, file, { upsert: false });

                if (uploadError) {
                    console.error('Storage upload error:', uploadError);
                    throw new Error(`Failed to upload ${file.name}`);
                }

                // Get public URL
                const { data: urlData } = window.supabaseClient.storage
                    .from('materials')
                    .getPublicUrl(filePath);

                const publicUrl = urlData?.publicUrl || '';

                // Insert record into student_materials table
                const { error: insertError } = await window.supabaseClient
                    .from('student_materials')
                    .insert({
                        student_db_id: studentDbId,
                        course_code: courseCode,
                        file_name: file.name,
                        file_url: publicUrl
                    });

                if (insertError) {
                    console.error('Database insert error:', insertError);
                    throw new Error(`Failed to save record for ${file.name}`);
                }
            }

            showToast('success', `${selectedFiles.length} file(s) uploaded successfully!`);

            // Reset form
            selectedFiles = [];
            renderFilePreview();
            fileInput.value = '';
            validateForm();

            // Refresh recent uploads
            await loadRecentUploads();

        } catch (err) {
            console.error('Upload error:', err);
            showToast('error', err.message || 'Upload failed. Please try again.');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Upload Materials</span>';
            validateForm();
        }
    }

    function showToast(type, message) {
        const { Toast } = window.AdminUtils || {};
        if (Toast) {
            if (type === 'success') Toast.success('Success', message);
            else if (type === 'error') Toast.error('Error', message);
            else if (type === 'warning') Toast.warning('Warning', message);
            else Toast.info('Info', message);
        } else {
            alert(message);
        }
    }

    // Start
    init();
})();
