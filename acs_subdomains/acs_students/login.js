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

    // Handle Login Submit (Step 1)
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = identifierInput.value.trim();

        if (!identifier) return;

        showLoading(true, btnSendOtp);

        try {
            // 1. Lookup student
            const student = await lookupStudent(identifier);

            if (!student) {
                showToast("No student found with these details. Please contact admin.", "error");
                showLoading(false, btnSendOtp);
                return;
            }

            if (!student.email) {
                showToast("No email associated with this student. Please contact admin.", "error");
                showLoading(false, btnSendOtp);
                return;
            }

            currentStudent = student;

            // 2. Generate and store OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const { error: otpError } = await window.supabaseClient
                .from('student_otps')
                .insert([{
                    student_id: student.id,
                    otp_code: otpCode,
                    email_sent_to: student.email
                }]);

            if (otpError) throw otpError;

            // 3. Send via EmailJS
            await sendOtpEmail(student.email, student.first_name || 'Student', otpCode);

            // 4. Switch to Step 2
            showStep2(student.email);
            showToast("OTP sent successfully!", "success");

        } catch (error) {
            console.error('Login error:', error);
            showToast("Something went wrong. Please try again.", "error");
        } finally {
            showLoading(false, btnSendOtp);
        }
    });

    // Lookup Student from DB
    async function lookupStudent(val) {
        // Search by student_id (text code), email or phone
        const { data, error } = await window.supabaseClient
            .from('students')
            .select('*')
            .or(`student_id.eq.${val},email.eq.${val},phone_number.eq.${val}`)
            .single();

        if (error) {
            console.warn('Lookup error:', error.message);
            return null;
        }
        return data;
    }

    // Send Email via EmailJS
    async function sendOtpEmail(email, name, otp) {
        return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_email: email,
            to_name: name,
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
        box.addEventListener('keyup', (e) => {
            if (e.key >= 0 && e.key <= 9) {
                if (index < otpBoxes.length - 1) otpBoxes[index + 1].focus();
            } else if (e.key === 'Backspace') {
                if (index > 0) otpBoxes[index - 1].focus();
            }
        });
    });

    // Verify OTP Logic
    btnVerifyOtp.addEventListener('click', async () => {
        const otp = Array.from(otpBoxes).map(box => box.value).join('');

        if (otp.length < 6) {
            showToast("Please enter the full 6-digit code", "error");
            return;
        }

        showLoading(true, btnVerifyOtp);

        try {
            // Verify from DB
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
                showToast("Invalid or expired OTP code.", "error");
                showLoading(false, btnVerifyOtp);
                return;
            }

            // Mark OTP as used
            await window.supabaseClient
                .from('student_otps')
                .update({ is_used: true })
                .eq('id', data.id);

            // Create local session
            localStorage.setItem('acs_student_session', JSON.stringify({
                id: currentStudent.id,
                name: `${currentStudent.first_name} ${currentStudent.last_name}`,
                student_id: currentStudent.student_id,
                email: currentStudent.email,
                loginTime: new Date().toISOString()
            }));

            showToast("Success! Redirecting...", "success");

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = './dashboard/';
            }, 1000);

        } catch (error) {
            console.error('Verification error:', error);
            showToast("Verification failed. Please try again.", "error");
        } finally {
            showLoading(false, btnVerifyOtp);
        }
    });

    // Resend Logic
    btnResend.addEventListener('click', async () => {
        if (timeLeft > 0) return;

        showLoading(true, btnResend);
        // ... (Repeat the OTP gen and email send logic)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await window.supabaseClient.from('student_otps').insert([{
            student_id: currentStudent.id,
            otp_code: otpCode,
            email_sent_to: currentStudent.email
        }]);
        await sendOtpEmail(currentStudent.email, currentStudent.first_name, otpCode);

        showLoading(false, btnResend);
        showToast("New OTP sent!", "success");
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
                btnResend.textContent = "Resend OTP";
            }
        }, 1000);
    }

    function maskEmail(email) {
        const parts = email.split('@');
        return parts[0].substring(0, 2) + "****@" + parts[1];
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
