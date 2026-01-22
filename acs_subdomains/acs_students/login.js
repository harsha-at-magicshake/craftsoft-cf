/* ============================================
   Student Portal Login Logic
   Craft Soft - Student Module
   ============================================ */

(function () {
    'use strict';

    // Environment Variables (Injected during build)
    const EMAILJS_PUBLIC_KEY = "[[EMAILJS_PUBLIC_KEY]]";
    const EMAILJS_SERVICE_ID = "[[EMAILJS_SERVICE_ID]]";
    const EMAILJS_TEMPLATE_ID = "[[EMAILJS_TEMPLATE_ID]]";

    emailjs.init(EMAILJS_PUBLIC_KEY);

    // Dom Elements
    const step1 = document.getElementById('login-step-1');
    const step2 = document.getElementById('login-step-2');
    const loginForm = document.getElementById('loginForm');
    const identifierInput = document.getElementById('identifier');
    const displayEmail = document.getElementById('display-email');
    const otpBoxes = document.querySelectorAll('.otp-box');
    const btnSendOtp = document.getElementById('btn-send-otp');
    const btnVerifyOtp = document.getElementById('btn-verify-otp');
    const btnChangeId = document.getElementById('btn-change-identity');
    const timerSpan = document.getElementById('timer');
    const btnResend = document.getElementById('btn-resend');

    let currentStudent = null;
    let resendTimer = null;
    let timeLeft = 30;

    // Modal Utility (Matching Dashboard)
    const Modal = {
        element: document.getElementById('modal-overlay'),
        title: document.getElementById('modal-title'),
        message: document.getElementById('modal-message'),
        icon: document.getElementById('modal-icon'),
        btnConfirm: document.getElementById('modal-confirm'),
        btnCancel: document.getElementById('modal-cancel'),

        show({ title, message, type = 'warning', confirmText = 'Okay', onConfirm, hideCancel = true }) {
            this.title.textContent = title;
            this.message.textContent = message;
            this.icon.className = `modal-icon ${type}`;

            let iconCode = 'fa-exclamation-triangle';
            if (type === 'danger') iconCode = 'fa-user-slash';
            if (type === 'success') iconCode = 'fa-check-circle';
            this.icon.innerHTML = `<i class="fas ${iconCode}"></i>`;

            this.btnConfirm.textContent = confirmText;
            this.btnCancel.style.display = hideCancel ? 'none' : 'block';

            this.element.style.display = 'flex';
            document.body.classList.add('modal-open');

            const close = () => {
                this.element.style.display = 'none';
                document.body.classList.remove('modal-open');
                this.btnConfirm.onclick = null;
            };

            this.btnConfirm.onclick = () => {
                if (onConfirm) onConfirm();
                close();
            };
        }
    };

    // Handle Login Submit (Step 1)
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = identifierInput.value.trim();

        if (!identifier) return;

        showLoading(true, btnSendOtp);

        try {
            const student = await lookupStudent(identifier);

            if (!student) {
                Modal.show({
                    title: "Student Not Found",
                    message: "We couldn't find a student matching that ID or email. Please double-check or contact the office.",
                    type: "danger"
                });
                showLoading(false, btnSendOtp);
                return;
            }

            if (!student.email) {
                Modal.show({
                    title: "Email Missing",
                    message: "No registered email found for this ID. Please update your profile at the office to use OTP login.",
                    type: "warning"
                });
                showLoading(false, btnSendOtp);
                return;
            }

            currentStudent = student;

            // Generate OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const { error: otpError } = await window.supabaseClient
                .from('student_otps')
                .insert([{
                    student_id: student.id,
                    otp_code: otpCode,
                    email_sent_to: student.email
                }]);

            if (otpError) throw otpError;

            // Send via EmailJS
            await sendOtpEmail(student.email, student.first_name || 'Student', otpCode);

            showStep2(student.email);
            showToast("Success! OTP has been sent.", "success");

        } catch (error) {
            console.error('Login error:', error);
            Modal.show({
                title: "Login Error",
                message: "A network issue occurred. Please check your connection and try again.",
                type: "warning"
            });
        } finally {
            showLoading(false, btnSendOtp);
        }
    });

    // Lookup Student from DB
    async function lookupStudent(val) {
        const { data, error } = await window.supabaseClient
            .from('students')
            .select('*')
            .or(`student_id.ilike."${val}",email.ilike."${val}",phone.ilike."${val}"`)
            .single();

        if (error) {
            console.warn('Primary lookup failed, trying exact search...');
            const { data: retryData, error: retryError } = await window.supabaseClient
                .from('students')
                .select('*')
                .or(`student_id.eq."${val}",email.eq."${val}",phone.eq."${val}"`)
                .single();

            if (retryError) return null;
            return retryData;
        }
        return data;
    }

    // Send Email via EmailJS
    async function sendOtpEmail(email, name, otp) {
        return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_email: email,
            to_name: name || 'Student',
            otp_code: otp,
            reply_to: "team.craftsoft@gmail.com"
        });
    }

    // UI Navigation
    function showStep2(email) {
        step1.style.display = 'none';
        step2.style.display = 'block';
        displayEmail.textContent = maskEmail(email);
        startResendTimer();
        otpBoxes[0].focus();
    }

    btnChangeId.addEventListener('click', () => {
        step2.style.display = 'none';
        step1.style.display = 'block';
        clearInterval(resendTimer);
    });

    // OTP Box Handling
    otpBoxes.forEach((box, index) => {
        box.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < otpBoxes.length - 1) {
                otpBoxes[index + 1].focus();
            }
        });
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpBoxes[index - 1].focus();
            }
        });
    });

    // Verify OTP Logic
    btnVerifyOtp.addEventListener('click', async () => {
        const otp = Array.from(otpBoxes).map(box => box.value).join('');

        if (otp.length < 6) {
            showToast("Please enter the 6-digit code", "error");
            return;
        }

        showLoading(true, btnVerifyOtp);

        try {
            const { data, error } = await window.supabaseClient
                .from('student_otps')
                .select('*')
                .eq('student_id', currentStudent.id)
                .eq('otp_code', otp)
                .eq('is_used', false)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                Modal.show({
                    title: "Invalid Code",
                    message: "The code you entered is incorrect or expired. Please check your email and try again.",
                    type: "warning"
                });
                showLoading(false, btnVerifyOtp);
                return;
            }

            // Sign in anonymously with Supabase Auth
            const { data: authData, error: authError } = await window.supabaseClient.auth.signInAnonymously({
                options: {
                    data: {
                        student_db_id: currentStudent.id,
                        student_id: currentStudent.student_id,
                        name: `${currentStudent.first_name} ${currentStudent.last_name}`,
                        email: currentStudent.email,
                        phone: currentStudent.phone
                    }
                }
            });

            if (authError) {
                throw authError;
            }

            // Delete ALL OTPs for this student (cleanup)
            await window.supabaseClient
                .from('student_otps')
                .delete()
                .eq('student_id', currentStudent.id);

            showToast("Authentication Successful!", "success");

            setTimeout(() => {
                window.location.href = './dashboard/';
            }, 1000);

        } catch (error) {
            console.error('Verification error:', error);
            showToast("Something went wrong.", "error");
        } finally {
            showLoading(false, btnVerifyOtp);
        }
    });

    // Resend Logic
    btnResend.addEventListener('click', async () => {
        if (timeLeft > 0) return;
        showLoading(true, btnResend);

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await window.supabaseClient.from('student_otps').insert([{
            student_id: currentStudent.id,
            otp_code: otpCode,
            email_sent_to: currentStudent.email
        }]);
        await sendOtpEmail(currentStudent.email, currentStudent.first_name, otpCode);

        showLoading(false, btnResend);
        showToast("New code sent to your email!", "success");
        startResendTimer();
    });

    // Helpers
    function startResendTimer() {
        timeLeft = 30;
        btnResend.disabled = true;
        clearInterval(resendTimer);
        resendTimer = setInterval(() => {
            timeLeft--;
            timerSpan.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(resendTimer);
                btnResend.disabled = false;
                btnResend.innerHTML = "Resend OTP";
            }
        }, 1000);
    }

    function maskEmail(email) {
        const parts = email.split('@');
        return parts[0].substring(0, 3) + "****@" + parts[1];
    }

    function showToast(msg, type = "") {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = `toast show ${type}`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function showLoading(isLoading, btn) {
        const text = btn.querySelector('.btn-text');
        const icon = btn.querySelector('i');
        if (isLoading) {
            btn.style.opacity = '0.7';
            btn.style.pointerEvents = 'none';
            text.textContent = "Processing...";
            icon.className = "fas fa-spinner fa-spin";
        } else {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'all';
            text.textContent = btn.id === 'btn-send-otp' ? "Send OTP" : "Verify & Login";
            icon.className = btn.id === 'btn-send-otp' ? "fas fa-paper-plane" : "fas fa-check-circle";
        }
    }

})();
